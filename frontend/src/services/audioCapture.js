/**
 * Audio Capture Service
 *
 * Records microphone input using AudioContext API and produces WAV blobs.
 * Replaces raw Web Speech API approach with controlled PCM capture.
 * 
 * Features:
 * - Raw PCM capture via ScriptProcessorNode
 * - WAV encoding (16-bit PCM, mono)
 * - Noise gate (filters out silent segments below threshold)
 * - Auto-level normalization
 * - Duration tracking
 * - Fallback to MediaRecorder if AudioContext fails
 */

let audioContext = null;
let mediaStream = null;
let scriptProcessor = null;
let mediaSource = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let recordingStartTime = 0;
let totalSamples = 0;
let noiseGateCallback = null;
let useMediaRecorder = false;

const NOISE_GATE_THRESHOLD = 0.008;
const SAMPLE_RATE = 16000;
const CHUNK_INTERVAL_MS = 3000;

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
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
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
  } = options;

  if (isRecording) {
    console.warn('Already recording');
    return null;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: SAMPLE_RATE,
        channelCount: 1,
      },
    });

    if (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      return startCaptureMediaRecorder(noiseGate, noiseGateThreshold, onChunk);
    }

    return startCaptureScriptProcessor(noiseGate, noiseGateThreshold, autoNormalize, onChunk);
  } catch (err) {
    console.error('Audio capture start failed:', err.message);
    cleanup();
    throw err;
  }
}

async function startCaptureMediaRecorder(noiseGate, noiseGateThreshold, onChunk) {
  useMediaRecorder = true;
  recordedChunks = [];
  recordingStartTime = Date.now();

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';

  mediaRecorder = new MediaRecorder(mediaStream, { mimeType });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.start(100);
  isRecording = true;

  if (onChunk) {
    const intervalId = setInterval(() => {
      if (!isRecording) {
        clearInterval(intervalId);
        return;
      }
      const totalBlob = new Blob(recordedChunks, { type: mimeType });
      onChunk({
        blob: totalBlob,
        duration: (Date.now() - recordingStartTime) / 1000,
        totalDuration: (Date.now() - recordingStartTime) / 1000,
      });
    }, CHUNK_INTERVAL_MS);
  }

  return {
    startTime: recordingStartTime,
    sampleRate: SAMPLE_RATE,
    method: 'MediaRecorder',
  };
}

async function startCaptureScriptProcessor(noiseGate, noiseGateThreshold, autoNormalize, onChunk) {
  useMediaRecorder = false;

  audioContext = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: SAMPLE_RATE,
  });

  mediaSource = audioContext.createMediaStreamSource(mediaStream);

  const bufferSize = 4096;
  scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);

  recordedChunks = [];
  totalSamples = 0;
  recordingStartTime = Date.now();

  let lastChunkTime = recordingStartTime;

  scriptProcessor.onaudioprocess = (event) => {
    if (!isRecording) return;

    const inputData = event.inputBuffer.getChannelData(0);
    const processed = noiseGate
      ? applyNoiseGate(new Float32Array(inputData), noiseGateThreshold)
      : new Float32Array(inputData);

    recordedChunks.push(processed);
    totalSamples += processed.length;

    if (onChunk && Date.now() - lastChunkTime >= CHUNK_INTERVAL_MS) {
      lastChunkTime = Date.now();
      const accumulated = getAccumulatedSamples();
      const wavBlob = encodeWAV(accumulated);
      onChunk({
        blob: wavBlob,
        samples: accumulated,
        duration: accumulated.length / SAMPLE_RATE,
        totalDuration: totalSamples / SAMPLE_RATE,
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

export async function stopCapture() {
  if (!isRecording) return null;

  isRecording = false;

  if (useMediaRecorder) {
    return stopCaptureMediaRecorder();
  }

  const samples = getAccumulatedSamples();
  const duration = samples.length / SAMPLE_RATE;

  let processedSamples = samples;
  processedSamples = normalizeAudio(processedSamples);
  const wavBlob = encodeWAV(processedSamples);

  cleanup();

  return {
    blob: wavBlob,
    samples: samples,
    duration,
    sampleRate: SAMPLE_RATE,
    timestamp: Date.now(),
  };
}

async function stopCaptureMediaRecorder() {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      cleanup();
      resolve({ blob: new Blob(), duration: 0, sampleRate: SAMPLE_RATE, timestamp: Date.now() });
      return;
    }

    mediaRecorder.onstop = async () => {
      const rawBlob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
      const duration = (Date.now() - recordingStartTime) / 1000;

      try {
        const arrayBuffer = await rawBlob.arrayBuffer();
        const tempCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);

        const downsampled = downsample(channelData, audioBuffer.sampleRate, SAMPLE_RATE);
        const normalized = normalizeAudio(downsampled);
        const wavBlob = encodeWAV(normalized);
        tempCtx.close();

        cleanup();
        resolve({
          blob: wavBlob,
          samples: normalized,
          duration,
          sampleRate: SAMPLE_RATE,
          timestamp: Date.now(),
          method: 'MediaRecorder',
        });
      } catch (err) {
        console.warn('MediaRecorder decode failed, sending raw blob:', err.message);
        cleanup();
        resolve({
          blob: rawBlob,
          duration,
          sampleRate: SAMPLE_RATE,
          timestamp: Date.now(),
          method: 'MediaRecorder-raw',
          rawFormat: mediaRecorder.mimeType,
        });
      }
    };

    mediaRecorder.stop();
    mediaStream.getTracks().forEach((t) => t.stop());
  });
}

function downsample(samples, fromRate, toRate) {
  if (fromRate === toRate) return new Float32Array(samples);
  const ratio = fromRate / toRate;
  const newLength = Math.round(samples.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIdx = Math.round(i * ratio);
    result[i] = samples[Math.min(srcIdx, samples.length - 1)];
  }
  return result;
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
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop(); } catch (e) {}
      mediaRecorder = null;
    }
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
  };
}
