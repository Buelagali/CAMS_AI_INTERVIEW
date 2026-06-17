/**
 * Noise Reduction Service
 * 
 * Implements:
 * - Pre-emphasis filtering (boost high frequencies)
 * - Energy-based Voice Activity Detection (VAD)
 * - Spectral noise gating (reduce non-speech noise floor)
 * - Signal-to-Noise Ratio estimation
 * 
 * All operations work on Float32Array audio samples at 16kHz.
 */

function preEmphasis(samples, coefficient = 0.97) {
  const out = new Float32Array(samples.length);
  out[0] = samples[0];
  for (let i = 1; i < samples.length; i++) {
    out[i] = samples[i] - coefficient * samples[i - 1];
  }
  return out;
}

function computeFrameEnergy(frame) {
  let energy = 0;
  for (let i = 0; i < frame.length; i++) {
    energy += frame[i] * frame[i];
  }
  return energy / frame.length;
}

function detectVoiceActivity(samples, sampleRate = 16000) {
  const frameSize = Math.floor(0.025 * sampleRate);
  const hopSize = Math.floor(0.010 * sampleRate);
  const numFrames = Math.max(1, Math.floor((samples.length - frameSize) / hopSize) + 1);

  const frameEnergies = [];
  for (let f = 0; f < numFrames; f++) {
    const start = f * hopSize;
    const frame = samples.slice(start, start + frameSize);
    frameEnergies.push(computeFrameEnergy(frame));
  }

  frameEnergies.sort((a, b) => a - b);
  const noiseFloor = frameEnergies[Math.floor(frameEnergies.length * 0.15)] || 0;
  const signalPeak = frameEnergies[Math.floor(frameEnergies.length * 0.95)] || 0;

  const dynamicThreshold = noiseFloor + (signalPeak - noiseFloor) * 0.15;
  const vadThreshold = Math.max(dynamicThreshold, 1e-6);

  const vad = new Uint8Array(numFrames);
  let speechFrames = 0;
  for (let f = 0; f < numFrames; f++) {
    const start = f * hopSize;
    const frame = samples.slice(start, start + frameSize);
    const energy = computeFrameEnergy(frame);
    vad[f] = energy >= vadThreshold ? 1 : 0;
    if (vad[f]) speechFrames++;
  }

  const holdover = 2;
  for (let pass = 0; pass < 3; pass++) {
    for (let f = 1; f < numFrames; f++) {
      if (vad[f] && !vad[f - 1]) {
        for (let h = Math.max(0, f - holdover); h < f; h++) vad[h] = 1;
      }
    }
    for (let f = numFrames - 2; f >= 0; f--) {
      if (vad[f] && !vad[f + 1]) {
        for (let h = f + 1; h <= Math.min(numFrames - 1, f + holdover); h++) vad[h] = 1;
      }
    }
  }

  const speechRatio = speechFrames / Math.max(numFrames, 1);
  const snr = signalPeak > noiseFloor
    ? 10 * Math.log10(signalPeak / Math.max(noiseFloor, 1e-10))
    : 0;

  return { vad, frameSize, hopSize, numFrames, noiseFloor, signalPeak, vadThreshold, speechRatio, snr };
}

function applySpectralGate(samples, sampleRate = 16000, noiseReductionStrength = 0.5) {
  const frameSize = Math.floor(0.025 * sampleRate);
  const hopSize = Math.floor(0.010 * sampleRate);
  const nfft = 512;
  const numFrames = Math.max(1, Math.floor((samples.length - frameSize) / hopSize) + 1);

  const noiseProfile = new Float64Array(Math.floor(nfft / 2 + 1)).fill(1e-6);
  const sortedFrames = [];

  for (let f = 0; f < Math.min(numFrames, 50); f++) {
    const start = f * hopSize;
    const frame = samples.slice(start, start + frameSize);
    const padded = new Float64Array(nfft);
    for (let i = 0; i < frame.length; i++) padded[i] = frame[i];
    for (let i = frame.length; i < nfft; i++) padded[i] = 0;

    for (let i = 0; i < nfft; i++) {
      padded[i] *= 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (nfft - 1));
    }

    const spectrum = new Float64Array(Math.floor(nfft / 2 + 1));
    for (let k = 0; k < spectrum.length; k++) {
      let real = 0, imag = 0;
      for (let n = 0; n < nfft; n++) {
        const angle = (2 * Math.PI * k * n) / nfft;
        real += padded[n] * Math.cos(angle);
        imag -= padded[n] * Math.sin(angle);
      }
      spectrum[k] = (real * real + imag * imag) / nfft;
    }

    const energy = spectrum.reduce((s, v) => s + v, 0) / spectrum.length;
    sortedFrames.push({ energy, spectrum });
  }

  sortedFrames.sort((a, b) => a.energy - b.energy);
  const noiseFrames = sortedFrames.slice(0, Math.max(1, Math.floor(sortedFrames.length * 0.2)));
  for (const nf of noiseFrames) {
    for (let k = 0; k < noiseProfile.length; k++) {
      noiseProfile[k] += nf.spectrum[k] / noiseFrames.length;
    }
  }

  const out = new Float32Array(samples.length);
  for (let f = 0; f < numFrames; f++) {
    const start = f * hopSize;
    const frame = samples.slice(start, start + frameSize);
    const padded = new Float64Array(nfft);
    for (let i = 0; i < frame.length; i++) padded[i] = frame[i];

    for (let i = 0; i < nfft; i++) {
      padded[i] *= 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (nfft - 1));
    }

    const spectrum = new Float64Array(Math.floor(nfft / 2 + 1));
    const phases = new Float64Array(Math.floor(nfft / 2 + 1));
    for (let k = 0; k < spectrum.length; k++) {
      let real = 0, imag = 0;
      for (let n = 0; n < nfft; n++) {
        const angle = (2 * Math.PI * k * n) / nfft;
        real += padded[n] * Math.cos(angle);
        imag -= padded[n] * Math.sin(angle);
      }
      spectrum[k] = Math.sqrt(real * real + imag * imag) / nfft;
      phases[k] = Math.atan2(imag, real);
    }

    const gateDb = 12 * noiseReductionStrength;
    for (let k = 0; k < spectrum.length; k++) {
      const noiseLevel = Math.sqrt(noiseProfile[k]);
      const threshold = noiseLevel * Math.pow(10, gateDb / 20);
      if (spectrum[k] < threshold) {
        spectrum[k] = spectrum[k] * 0.1;
      } else {
        spectrum[k] = spectrum[k] - noiseLevel * noiseReductionStrength * 0.5;
        if (spectrum[k] < 0) spectrum[k] = 0;
      }
    }

    const reconstructed = new Float64Array(nfft);
    for (let i = 0; i < nfft; i++) {
      for (let k = 0; k < spectrum.length; k++) {
        const angle = (2 * Math.PI * k * i) / nfft;
        reconstructed[i] += spectrum[k] * Math.cos(angle + phases[k]);
      }
    }

    const gain = 1 / nfft;
    for (let i = 0; i < frameSize; i++) {
      const idx = start + i;
      if (idx < out.length) {
        out[idx] += reconstructed[i] * gain;
      }
    }
  }

  const maxVal = Math.max(...out.map(Math.abs), 1e-6);
  if (maxVal > 1) {
    for (let i = 0; i < out.length; i++) out[i] /= maxVal;
  }

  return out;
}

function estimateSNR(samples, sampleRate = 16000) {
  const frameSize = Math.floor(0.025 * sampleRate);
  const hopSize = Math.floor(0.010 * sampleRate);
  const numFrames = Math.max(1, Math.floor((samples.length - frameSize) / hopSize) + 1);

  const energies = [];
  for (let f = 0; f < numFrames; f++) {
    const start = f * hopSize;
    let energy = 0;
    for (let i = 0; i < frameSize && start + i < samples.length; i++) {
      energy += samples[start + i] * samples[start + i];
    }
    energies.push(energy / frameSize);
  }

  energies.sort((a, b) => a - b);
  const noiseEnergy = energies[Math.floor(energies.length * 0.1)] || 1e-10;
  const signalEnergy = energies[Math.floor(energies.length * 0.9)] || 1;
  const snr = 10 * Math.log10(signalEnergy / Math.max(noiseEnergy, 1e-10));
  return Math.max(0, Math.min(60, snr));
}

function normalizeVolume(samples, targetPeak = 0.95) {
  const peak = Math.max(...samples.map(Math.abs), 1e-6);
  const gain = targetPeak / peak;
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = samples[i] * gain;
  return out;
}

function resampleTo16kHz(samples, originalSampleRate) {
  if (originalSampleRate === 16000) return samples;
  const ratio = 16000 / originalSampleRate;
  const newLength = Math.round(samples.length * ratio);
  const out = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const pos = i / ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    if (idx + 1 < samples.length) {
      out[i] = samples[idx] * (1 - frac) + samples[idx + 1] * frac;
    } else if (idx < samples.length) {
      out[i] = samples[idx];
    }
  }
  return out;
}

function reduceNoise(samples, sampleRate = 16000, strength = 0.5) {
  const resampled = resampleTo16kHz(
    samples instanceof Float32Array ? samples : new Float32Array(samples),
    sampleRate
  );

  const emphasized = preEmphasis(resampled);
  const vadResult = detectVoiceActivity(emphasized, 16000);
  const gated = applySpectralGate(emphasized, 16000, strength);
  const normalized = normalizeVolume(gated);
  const snr = estimateSNR(normalized, 16000);

  return {
    samples: normalized,
    sampleRate: 16000,
    vad: vadResult.vad,
    speechRatio: vadResult.speechRatio,
    snr,
    noiseFloor: vadResult.noiseFloor,
  };
}

module.exports = { reduceNoise, detectVoiceActivity, estimateSNR, preEmphasis, normalizeVolume, resampleTo16kHz };
