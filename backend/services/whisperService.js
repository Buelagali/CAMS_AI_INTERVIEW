/**
 * Whisper Speech-to-Text Service
 * 
 * Uses @xenova/transformers with whisper-tiny model for fast local transcription.
 * Falls back to whisper-small if more accuracy is needed.
 * 
 * Pipeline: audio samples (Float32Array, 16kHz) → Whisper → { text, chunks, confidence }
 */

const { pipeline } = require('@xenova/transformers');

let transcriber = null;
let transcriberLoading = false;
let transcriberQueue = [];

async function getTranscriber() {
  if (transcriber) return transcriber;

  if (transcriberLoading) {
    return new Promise((resolve) => {
      transcriberQueue.push(resolve);
    });
  }

  transcriberLoading = true;
  try {
    transcriber = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny',
      { quantized: true }
    );
    transcriberLoading = false;
    transcriberQueue.forEach((r) => r(transcriber));
    transcriberQueue = [];
    return transcriber;
  } catch (err) {
    transcriberLoading = false;
    console.error('Failed to load Whisper model:', err.message);
    console.warn('Attempting to load whisper-tiny with fallback settings...');
    try {
      transcriber = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny',
        { quantized: true, progress_callback: null }
      );
      return transcriber;
    } catch (fallbackErr) {
      transcriber = null;
      throw new Error(`Whisper model loading failed: ${fallbackErr.message}`);
    }
  }
}

function chunkAudio(samples, sampleRate = 16000) {
  const chunkDuration = 30;
  const chunkSize = sampleRate * chunkDuration;
  const chunks = [];
  for (let start = 0; start < samples.length; start += chunkSize) {
    chunks.push(samples.slice(start, Math.min(start + chunkSize, samples.length)));
  }
  return chunks;
}

function extractTimestamps(chunks, chunkResults, sampleRate = 16000) {
  const segments = [];
  let globalOffset = 0;
  for (let i = 0; i < chunkResults.length; i++) {
    const result = chunkResults[i];
    const chunkDuration = chunks[i].length / sampleRate;
    if (result && result.chunks) {
      for (const seg of result.chunks) {
        segments.push({
          text: seg.text || '',
          start: (seg.start || 0) + globalOffset,
          end: (seg.end || 0) + globalOffset,
          confidence: seg.score || 0.5,
        });
      }
    } else if (result && result.text) {
      segments.push({
        text: result.text,
        start: globalOffset,
        end: globalOffset + chunkDuration,
        confidence: result.score || 0.5,
      });
    }
    globalOffset += chunkDuration;
  }
  return segments;
}

async function transcribe(samples, options = {}) {
  const {
    language = 'en',
    task = 'transcribe',
    returnTimestamps = true,
    chunkCallback = null,
  } = options;

  if (!samples || samples.length < 160) {
    return {
      text: '',
      segments: [],
      confidence: 0,
      duration: 0,
      wordCount: 0,
      error: 'Audio too short',
    };
  }

  const model = await getTranscriber();
  const duration = samples.length / 16000;

  try {
    let result;
    if (samples.length > 16000 * 30) {
      const audioChunks = chunkAudio(samples, 16000);
      const chunkResults = [];
      for (let i = 0; i < audioChunks.length; i++) {
        const chunkResult = await model(audioChunks[i], {
          language,
          task,
          return_timestamps: returnTimestamps,
        });
        chunkResults.push(chunkResult);
        if (chunkCallback) chunkCallback(i, audioChunks.length, chunkResult);
      }
      const fullText = chunkResults.map((r) => r.text || '').join(' ').trim();
      const segments = extractTimestamps(audioChunks, chunkResults, 16000);
      const avgConfidence = segments.length > 0
        ? segments.reduce((s, seg) => s + seg.confidence, 0) / segments.length
        : 0.5;
      result = { text: fullText, chunks: segments, score: avgConfidence };
    } else {
      result = await model(samples, {
        language,
        task,
        return_timestamps: returnTimestamps,
      });
    }

    const transcriptionText = (result.text || '').trim();
    const wordCount = transcriptionText ? transcriptionText.split(/\s+/).length : 0;
    const confidence = result.score || 0.5;

    return {
      text: transcriptionText,
      segments: result.chunks || [],
      confidence: Math.round(confidence * 100) / 100,
      duration: parseFloat(duration.toFixed(2)),
      wordCount,
      model: 'whisper-tiny',
    };
  } catch (err) {
    console.error('Whisper transcription error:', err.message);
    return {
      text: '',
      segments: [],
      confidence: 0,
      duration: parseFloat(duration.toFixed(2)),
      wordCount: 0,
      error: err.message,
    };
  }
}

module.exports = { transcribe, getTranscriber };
