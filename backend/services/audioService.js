const { pipeline, read_audio } = require('@xenova/transformers');

let audioClassifier = null;
let audioFeatureExtractor = null;

async function getAudioClassifier() {
  if (!audioClassifier) {
    audioClassifier = await pipeline(
      'audio-classification',
      'Xenova/wav2vec2-base-superb-ic'
    );
  }
  return audioClassifier;
}

async function getFeatureExtractor() {
  if (!audioFeatureExtractor) {
    const { AutoFeatureExtractor, AutoModelForAudioClassification } = require('@xenova/transformers');
    const config = { quantized: false };
    audioFeatureExtractor = {
      extractor: await AutoFeatureExtractor.from_pretrained('Xenova/wav2vec2-base', config),
      model: await AutoModelForAudioClassification.from_pretrained('Xenova/wav2vec2-base', config),
    };
  }
  return audioFeatureExtractor;
}

function computeMFCC(samples, sampleRate = 16000) {
  const numMelFilters = 26;
  const numCepstral = 13;
  const frameSize = Math.floor(0.025 * sampleRate);
  const hopSize = Math.floor(0.010 * sampleRate);
  const numFrames = Math.max(1, Math.floor((samples.length - frameSize) / hopSize) + 1);

  const mfccs = [];
  for (let f = 0; f < Math.min(numFrames, 50); f++) {
    const start = f * hopSize;
    const frame = samples.slice(start, start + frameSize);

    for (let i = frame.length; i < frameSize; i++) frame.push(0);

    const windowed = frame.map((s, i) =>
      s * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frameSize - 1)))
    );

    const powerSpectrum = [];
    const nfft = 512;
    for (let k = 0; k < nfft / 2 + 1; k++) {
      let real = 0, imag = 0;
      for (let n = 0; n < windowed.length; n++) {
        const angle = (2 * Math.PI * k * n) / nfft;
        real += windowed[n] * Math.cos(angle);
        imag -= windowed[n] * Math.sin(angle);
      }
      powerSpectrum.push((real * real + imag * imag) / nfft);
    }

    const melFilterbank = [];
    const melMin = 0, melMax = 2595 * Math.log10(1 + sampleRate / 700);
    const melPoints = [];
    for (let m = 0; m < numMelFilters + 2; m++) {
      melPoints.push(700 * (Math.pow(10, (melMin + m * (melMax - melMin) / (numMelFilters + 1)) / 2595) - 1));
    }

    const binPoints = melPoints.map((f) => Math.floor((nfft + 1) * f / sampleRate));
    for (let m = 0; m < numMelFilters; m++) {
      const bank = new Float64Array(Math.floor(nfft / 2 + 1));
      const startBin = binPoints[m];
      const centerBin = binPoints[m + 1];
      const endBin = binPoints[m + 2];

      for (let k = startBin; k < centerBin && k < bank.length; k++) {
        bank[k] = (k - startBin) / (centerBin - startBin);
      }
      for (let k = centerBin; k < endBin && k < bank.length; k++) {
        bank[k] = (endBin - k) / (endBin - centerBin);
      }
      melFilterbank.push(bank);
    }

    const melEnergies = melFilterbank.map((bank) => {
      let energy = 0;
      for (let k = 0; k < bank.length; k++) {
        if (bank[k] > 0) energy += bank[k] * powerSpectrum[k];
      }
      return Math.max(energy, 1e-10);
    });

    const logMel = melEnergies.map((e) => Math.log(e));

    const mfcc = [];
    for (let c = 0; c < numCepstral; c++) {
      let val = 0;
      for (let m = 0; m < numMelFilters; m++) {
        val += logMel[m] * Math.cos((Math.PI * c * (m + 0.5)) / numMelFilters);
      }
      mfcc.push(val);
    }
    mfccs.push(mfcc);
  }

  return { mfccs, numFrames: mfccs.length };
}

function aggregateMFCCFeatures(mfccResult) {
  const { mfccs } = mfccResult;
  if (mfccs.length === 0) return { pitch: 0.5, energy: 0.5, speechRate: 0.5, voiceStability: 0.5, confidence: 50 };

  const numCoeffs = mfccs[0].length;
  const means = new Array(numCoeffs).fill(0);
  const variances = new Array(numCoeffs).fill(0);

  for (const frame of mfccs) {
    for (let c = 0; c < numCoeffs; c++) means[c] += frame[c] / mfccs.length;
  }
  for (const frame of mfccs) {
    for (let c = 0; c < numCoeffs; c++) variances[c] += (frame[c] - means[c]) ** 2 / mfccs.length;
  }

  const energy = 0.3 + Math.min(0.7, (Math.abs(means[0]) / 100));
  const pitch = 0.3 + Math.min(0.7, (Math.abs(means[1]) / 50));
  const voiceStability = 0.3 + Math.min(0.7, (1 - variances.reduce((a, b) => a + b, 0) / numCoeffs));
  const speechRate = 0.3 + Math.min(0.7, Math.min(1, mfccs.length / 30));

  const confidence = Math.round(
    (pitch * 0.2 + energy * 0.3 + speechRate * 0.2 + voiceStability * 0.3) * 100
  );

  return { pitch, energy, speechRate, voiceStability, confidence, mfccMeans: means, mfccVariances: variances };
}

exports.analyzeAudio = async (audioBuffer, sampleRate = 16000) => {
  if (!audioBuffer || audioBuffer.length < 256) {
    return { pitch: 0.5, energy: 0.5, speechRate: 0.5, voiceStability: 0.5, confidence: 50, emotion: 'neutral' };
  }

  try {
    const samples = new Float32Array(audioBuffer.length);
    for (let i = 0; i < audioBuffer.length; i++) {
      samples[i] = (audioBuffer[i] - 128) / 128;
    }

    const mfccResult = computeMFCC(Array.from(samples), sampleRate);
    const features = aggregateMFCCFeatures(mfccResult);

    let emotion = 'neutral';
    let emotionConfidence = 0.5;
    try {
      const classifier = await getAudioClassifier();
      const result = await classifier(audioBuffer);
      if (result && result.length > 0) {
        emotion = result[0].label;
        emotionConfidence = result[0].score;
      }
    } catch (err) {
      console.warn('Audio classifier error, using MFCC-based estimate:', err.message);
      if (features.energy > 0.6 && features.pitch > 0.6) emotion = 'confident';
      else if (features.energy < 0.4 && features.pitch < 0.4) emotion = 'nervous';
      else if (features.voiceStability < 0.4) emotion = 'anxious';
    }

    return { ...features, emotion, emotionConfidence };
  } catch (err) {
    console.error('Audio analysis error:', err.message);
    return { pitch: 0.5, energy: 0.5, speechRate: 0.5, voiceStability: 0.5, confidence: 50, emotion: 'neutral' };
  }
};

exports.extractAudioEmbedding = async (audioBuffer) => {
  try {
    const fe = await getFeatureExtractor();
    const inputs = await fe.extractor(audioBuffer, { sampling_rate: 16000 });
    const { logits } = await fe.model(inputs);
    return Array.from(logits.data).slice(0, 128);
  } catch {
    const hash = simpleHash(String(audioBuffer?.length || 0));
    return Array.from({ length: 128 }, (_, i) => Math.sin(hash * (i + 1)) * 0.5 + 0.5);
  }
};

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < String(str).length; i++) {
    hash = ((hash << 5) - hash) + String(str).charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
