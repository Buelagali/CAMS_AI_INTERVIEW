/**
 * Transcription Service - Orchestrator
 * 
 * Runs the full audio pipeline:
 * Audio Input → Noise Reduction → Wav2Vec2 Embedding → Whisper STT → Confidence Estimation
 * 
 * Also integrates with existing audioService.js for MFCC extraction
 * and cross-attention fusion features.
 */

const { reduceNoise } = require('./noiseReductionService');
const { transcribe } = require('./whisperService');
const { extractFeatures } = require('./wav2vecService');
const { estimateFromAudio, estimateFromTranscription, estimateOverallConfidence } = require('./transcriptionConfidence');
const { analyzeAudio } = require('./audioService');

/**
 * Process audio through the full pipeline.
 * @param {Float32Array|Buffer|Array} audioInput - Raw audio samples or buffer
 * @param {Object} options
 * @param {number} options.sampleRate - Input sample rate (default 16000)
 * @param {number} options.noiseReductionStrength - 0-1 (default 0.5)
 * @param {string} options.language - Language code (default 'en')
 * @returns {Object} Full transcription result with confidence
 */
async function processAudio(audioInput, options = {}) {
  const {
    sampleRate = 16000,
    noiseReductionStrength = 0.5,
    language = 'en',
  } = options;

  const startTime = Date.now();

  let rawSamples;
  if (audioInput instanceof Float32Array) {
    rawSamples = audioInput;
  } else if (Buffer.isBuffer(audioInput)) {
    rawSamples = new Float32Array(audioInput.length);
    for (let i = 0; i < audioInput.length; i++) {
      rawSamples[i] = (audioInput[i] - 128) / 128;
    }
  } else if (Array.isArray(audioInput)) {
    rawSamples = new Float32Array(audioInput);
  } else {
    return { error: 'Unsupported audio format', text: '', confidence: 0 };
  }

  if (rawSamples.length < 160) {
    return { error: 'Audio too short (minimum 10ms at 16kHz)', text: '', confidence: 0 };
  }

  const originalDuration = (rawSamples.length / sampleRate).toFixed(2);

  // Step 1: Noise Reduction
  const noiseResult = reduceNoise(rawSamples, sampleRate, noiseReductionStrength);
  const cleanedSamples = noiseResult.samples;

  // Step 2: MFCC extraction (via existing audioService)
  let mfccFeatures = null;
  try {
    mfccFeatures = await analyzeAudio(Buffer.from(Array.from(cleanedSamples.map(s => Math.max(0, Math.min(255, (s + 1) * 128))))), 16000);
  } catch (err) {
    console.warn('MFCC extraction warning:', err.message);
  }

  // Step 3: Wav2Vec2 Embedding & Features
  let wav2vecFeatures = null;
  try {
    wav2vecFeatures = await extractFeatures(cleanedSamples);
  } catch (err) {
    console.warn('Wav2Vec2 feature extraction warning:', err.message);
  }

  // Step 4: Whisper Transcription
  const whisperResult = await transcribe(cleanedSamples, { language, task: 'transcribe' });

  // Step 5: Confidence Estimation
  const audioConfidence = estimateFromAudio({
    snr: noiseResult.snr,
    speechRatio: noiseResult.speechRatio,
    speechQuality: wav2vecFeatures?.speechQuality || 0.5,
    articulation: wav2vecFeatures?.articulation || 0.5,
    fluency: wav2vecFeatures?.fluency || 0.5,
  });

  const transcriptionConfidence = estimateFromTranscription(
    whisperResult.text,
    whisperResult.confidence,
    whisperResult.duration
  );

  const overallConfidence = estimateOverallConfidence(
    audioConfidence.overall,
    transcriptionConfidence.overall
  );

  const processingTime = Date.now() - startTime;

  return {
    text: whisperResult.text,
    segments: whisperResult.segments || [],
    confidence: {
      overall: overallConfidence,
      whisper: Math.round(whisperResult.confidence * 100),
      transcription: transcriptionConfidence,
      audio: audioConfidence,
      factors: {
        snr: Math.round(noiseResult.snr * 10) / 10,
        speechRatio: Math.round(noiseResult.speechRatio * 100),
        speechQuality: wav2vecFeatures?.speechQuality ? Math.round(wav2vecFeatures.speechQuality * 100) : 50,
        articulation: wav2vecFeatures?.articulation ? Math.round(wav2vecFeatures.articulation * 100) : 50,
        fluency: wav2vecFeatures?.fluency ? Math.round(wav2vecFeatures.fluency * 100) : 50,
        wordCount: transcriptionConfidence.wordCount,
        duration: whisperResult.duration,
      },
    },
    duration: parseFloat(originalDuration),
    wordCount: transcriptionConfidence.wordCount,
    wav2vecEmbedding: wav2vecFeatures?.embedding || null,
    mfccFeatures: mfccFeatures || null,
    processingTime,
    model: 'whisper-tiny',
  };
}

/**
 * Process a WAV Buffer through the pipeline.
 * @param {Buffer} wavBuffer - Complete WAV file buffer
 * @param {Object} options
 * @returns {Object} Same as processAudio
 */
async function processWavBuffer(wavBuffer, options = {}) {
  if (!wavBuffer || wavBuffer.length < 44) {
    return { error: 'Invalid WAV buffer', text: '', confidence: 0 };
  }

  try {
    const dataSize = wavBuffer.readUInt32LE(40);
    const sampleRate = wavBuffer.readUInt32LE(24);
    const bitsPerSample = wavBuffer.readUInt16LE(34);
    const numChannels = wavBuffer.readUInt16LE(22);
    const dataOffset = 44;

    let samples;
    if (bitsPerSample === 16) {
      samples = new Float32Array(dataSize / 2);
      for (let i = 0; i < samples.length; i++) {
        const sample = wavBuffer.readInt16LE(dataOffset + i * 2);
        samples[i] = sample / 32768;
      }
    } else if (bitsPerSample === 32) {
      samples = new Float32Array(dataSize / 4);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = wavBuffer.readFloatLE(dataOffset + i * 4);
      }
    } else if (bitsPerSample === 8) {
      samples = new Float32Array(dataSize);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = (wavBuffer.readUInt8(dataOffset + i) - 128) / 128;
      }
    } else {
      return { error: `Unsupported bits per sample: ${bitsPerSample}`, text: '', confidence: 0 };
    }

    if (numChannels > 1) {
      const mono = new Float32Array(samples.length / numChannels);
      for (let i = 0; i < mono.length; i++) {
        let sum = 0;
        for (let ch = 0; ch < numChannels; ch++) {
          sum += samples[i * numChannels + ch];
        }
        mono[i] = sum / numChannels;
      }
      return processAudio(mono, { ...options, sampleRate });
    }

    return processAudio(samples, { ...options, sampleRate });
  } catch (err) {
    return { error: `WAV parsing error: ${err.message}`, text: '', confidence: 0 };
  }
}

module.exports = { processAudio, processWavBuffer };
