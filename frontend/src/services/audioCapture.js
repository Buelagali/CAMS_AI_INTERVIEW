let audioContext = null;
let mediaStream = null;
let scriptProcessor = null;
let mediaSource = null;
let recordedChunks = [];
let isRecording = false;
let recordingStartTime = 0;
let totalSamples = 0;

const NOISE_GATE_THRESHOLD = 0.002;
const SAMPLE_RATE = 16000;
const CHUNK_INTERVAL_MS = 1500;
const CHUNK_OVERLAP_SAMPLES = SAMPLE_RATE * 0.5;
const SILENCE_TIMEOUT_MS = 2500;
const MIN_CHUNK_SAMPLES = SAMPLE_RATE * 0.3;

const FFT_SIZE = 512;
const FFT_HOP = 256;
const NOISE_FLOOR_PERCENTILE = 0.15;
const NOISE_HISTORY_LEN = 20;
const SNR_VOICE_THRESHOLD = 6;
const SNR_FRAME_RATIO = 0.3;

let noiseHistory = [];
let noiseFloor = null;
let spectralGateState = {};

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export function encodeWAV(samples, sampleRate = SAMPLE_RATE) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = samples.length * blockAlign;
  const bufferSize = 44 + dataSize;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(44 + i * 2, val, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function applyNoiseGate(samples, threshold = NOISE_GATE_THRESHOLD) {
  let maxSample = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > maxSample) maxSample = abs;
  }
  if (maxSample < threshold) {
    return new Float32Array(samples.length);
  }
  return samples;
}

function hanningWindow(size) {
  const w = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
  }
  return w;
}

const HANN = hanningWindow(FFT_SIZE);

function fft(real, imag) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = -2 * Math.PI / len;
    const wr0 = Math.cos(angle);
    const wi0 = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let wr = 1, wi = 0;
      for (let j = 0; j < len / 2; j++) {
        const ti = real[i + j + len / 2] * wr - imag[i + j + len / 2] * wi;
        const tq = real[i + j + len / 2] * wi + imag[i + j + len / 2] * wr;
        real[i + j + len / 2] = real[i + j] - ti;
        imag[i + j + len / 2] = imag[i + j] - tq;
        real[i + j] += ti;
        imag[i + j] += tq;
        const nwr = wr * wr0 - wi * wi0;
        wi = wr * wi0 + wi * wr0;
        wr = nwr;
      }
    }
  }
}

function computeMagnitudeSpectrum(samples, offset) {
  const real = new Float64Array(FFT_SIZE);
  const imag = new Float64Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++) {
    const s = samples[offset + i];
    real[i] = (s !== undefined ? s : 0) * HANN[i];
  }
  fft(real, imag);
  const mag = new Float64Array(FFT_SIZE / 2 + 1);
  for (let i = 0; i <= FFT_SIZE / 2; i++) {
    mag[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  return mag;
}

function updateNoiseFloor(mag) {
  noiseHistory.push(mag);
  if (noiseHistory.length > NOISE_HISTORY_LEN) {
    noiseHistory.shift();
  }
  if (noiseHistory.length < 5) return;
  const numBins = noiseHistory[0].length;
  const floor = new Float64Array(numBins);
  for (let b = 0; b < numBins; b++) {
    const values = noiseHistory.map(m => m[b]).sort((a, b) => a - b);
    const idx = Math.floor(values.length * NOISE_FLOOR_PERCENTILE);
    floor[b] = values[Math.min(idx, values.length - 1)];
  }
  noiseFloor = floor;
}

function computeFrameSNR(mag) {
  if (!noiseFloor) return 0;
  let sigPow = 0, noisePow = 0;
  for (let i = 0; i < mag.length; i++) {
    sigPow += mag[i] * mag[i];
    noisePow += noiseFloor[i] * noiseFloor[i];
  }
  return 10 * Math.log10(sigPow / Math.max(noisePow, 1e-10));
}

function detectVoiceActivity(samples) {
  if (samples.length < FFT_SIZE) return false;
  const numFrames = Math.max(1, Math.floor((samples.length - FFT_SIZE) / FFT_HOP) + 1);
  let highSnrFrames = 0;
  for (let f = 0; f < numFrames; f++) {
    const offset = f * FFT_HOP;
    const mag = computeMagnitudeSpectrum(samples, offset);
    if (noiseHistory.length < NOISE_HISTORY_LEN) {
      updateNoiseFloor(mag);
      highSnrFrames++;
      continue;
    }
    const snr = computeFrameSNR(mag);
    if (snr > SNR_VOICE_THRESHOLD) highSnrFrames++;
    updateNoiseFloor(mag);
  }
  return highSnrFrames / numFrames >= SNR_FRAME_RATIO;
}

export function normalizeAudio(samples, targetPeak = 0.95) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }
  if (peak < 0.001 || peak >= targetPeak) return samples;
  const gain = targetPeak / peak;
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = samples[i] * gain;
  }
  return out;
}

export async function startCapture(options = {}) {
  const {
    noiseGate = true,
    noiseGateThreshold = NOISE_GATE_THRESHOLD,
    autoNormalize = true,
    onChunk = null,
    onSilence = null,
  } = options;

  if (isRecording) {
    console.warn('Already recording');
    return null;
  }

  lastChunkIndex = 0;
  processingLock = false;
  chunkQueue = [];
  droppedChunkCount = 0;
  chunkLatencyLog = [];
  onSilenceTimeout = onSilence || null;

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: { ideal: SAMPLE_RATE },
        channelCount: { ideal: 1 },
      },
    });

    return startCaptureScriptProcessor(noiseGate, noiseGateThreshold, autoNormalize, onChunk);
  } catch (err) {
    console.error('Audio capture start failed:', err.message);
    cleanup();
    throw err;
  }
}

async function startCaptureScriptProcessor(noiseGate, noiseGateThreshold, autoNormalize, onChunk) {
  audioContext = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: SAMPLE_RATE,
  });

  mediaSource = audioContext.createMediaStreamSource(mediaStream);

  const bufferSize = 4096;
  scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);

  recordedChunks = [];
  totalSamples = 0;
  recordingStartTime = Date.now();
  silenceStartTime = 0;

  let lastChunkTime = recordingStartTime;

  scriptProcessor.onaudioprocess = (event) => {
    if (!isRecording) return;

    const inputData = event.inputBuffer.getChannelData(0);
    const processed = noiseGate
      ? applySoftNoiseGate(new Float32Array(inputData), noiseGateThreshold)
      : new Float32Array(inputData);

    recordedChunks.push(processed);
    totalSamples += processed.length;

    const hasVoice = detectVoiceActivity(processed);
    if (hasVoice) {
      silenceStartTime = 0;
    } else if (silenceStartTime === 0) {
      silenceStartTime = Date.now();
    } else if (onSilenceTimeout && Date.now() - silenceStartTime > SILENCE_TIMEOUT_MS) {
      silenceStartTime = Date.now();
      try { onSilenceTimeout(); } catch (e) { /* ignore */ }
    }

    if (onChunk && Date.now() - lastChunkTime >= CHUNK_INTERVAL_MS && !processingLock) {
      lastChunkTime = Date.now();
      processingLock = true;
      lastChunkIndex++;

      const accumulated = getAccumulatedSamples();
      if (accumulated.length < MIN_CHUNK_SAMPLES) {
        processingLock = false;
        return;
      }

      const normalized = autoNormalize ? normalizeAudio(accumulated) : accumulated;
      const wavBlob = encodeWAV(normalized);
      const chunkStart = Date.now();

      const chunkInfo = {
        blob: wavBlob,
        samples: normalized,
        duration: accumulated.length / SAMPLE_RATE,
        totalDuration: totalSamples / SAMPLE_RATE,
        chunkIndex: lastChunkIndex,
        timestamp: chunkStart,
      };

      const promise = Promise.resolve().then(() => {
        return onChunk(chunkInfo);
      }).then(() => {
        const latency = Date.now() - chunkStart;
        chunkLatencyLog.push({ index: lastChunkIndex, latency, duration: chunkInfo.duration });
        if (chunkLatencyLog.length > 50) chunkLatencyLog.shift();
      }).catch((err) => {
        droppedChunkCount++;
        console.warn(`[AUDIO-CAPTURE] Chunk ${lastChunkIndex} failed/dropped:`, err?.message || 'unknown error');
      }).finally(() => {
        processingLock = false;
      });
    }
  };

  mediaSource.connect(scriptProcessor);
  scriptProcessor.connect(audioContext.destination);

  isRecording = true;

  return {
    startTime: recordingStartTime,
    sampleRate: SAMPLE_RATE,
    method: 'ScriptProcessor',
  };
}

export function getAccumulatedSamples() {
  if (recordedChunks.length === 0) return new Float32Array(0);
  const totalLength = recordedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of recordedChunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export function getChunkStats() {
  return {
    droppedChunkCount,
    totalChunks: lastChunkIndex,
    latencyLog: chunkLatencyLog.slice(-10),
    avgLatency: chunkLatencyLog.length > 0
      ? Math.round(chunkLatencyLog.reduce((s, e) => s + e.latency, 0) / chunkLatencyLog.length)
      : 0,
  };
}

export async function stopCapture() {
  if (!isRecording) return null;

  isRecording = false;

  const samples = getAccumulatedSamples();
  const duration = samples.length / SAMPLE_RATE;

  let processedSamples = samples;
  processedSamples = normalizeAudio(processedSamples);

  const speechDetected = (() => {
    const threshold = 0.01;
    let loudSamples = 0;
    for (let i = 0; i < Math.min(samples.length, SAMPLE_RATE * 2); i++) {
      if (Math.abs(samples[i]) > threshold) loudSamples++;
    }
    return loudSamples > SAMPLE_RATE * 0.02;
  })();

  if (!speechDetected) {
    const peak = Math.max(...Array.from(samples).map(Math.abs));
    if (peak < 0.01) {
      cleanup();
      return {
        blob: encodeWAV(new Float32Array(160)),
        samples: new Float32Array(160),
        duration: 0.01,
        sampleRate: SAMPLE_RATE,
        timestamp: Date.now(),
        silence: true,
      };
    }
  }

  const wavBlob = encodeWAV(processedSamples);

  cleanup();

  return {
    blob: wavBlob,
    samples: processedSamples,
    duration,
    sampleRate: SAMPLE_RATE,
    timestamp: Date.now(),
    droppedChunks: droppedChunkCount,
    totalChunks: lastChunkIndex,
  };
}

export function getRecordingDuration() {
  if (!isRecording) return 0;
  return (Date.now() - recordingStartTime) / 1000;
}

export function isCurrentlyRecording() {
  return isRecording;
}

export function forceStopCapture() {
  isRecording = false;
  cleanup();
}

function cleanup() {
  try {
    if (scriptProcessor) {
      scriptProcessor.disconnect();
      scriptProcessor = null;
    }
    if (mediaSource) {
      mediaSource.disconnect();
      mediaSource = null;
    }
    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
  } catch (err) {
    console.warn('Audio capture cleanup error:', err.message);
  }
}

export function getCaptureStatus() {
  return {
    isRecording,
    chunks: recordedChunks.length,
    totalSamples,
    duration: totalSamples / SAMPLE_RATE,
    startTime: recordingStartTime,
    droppedChunks: droppedChunkCount,
    sentChunks: lastChunkIndex,
    processingLock,
  };
}
