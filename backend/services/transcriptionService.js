const { reduceNoise } = require('./noiseReductionService');
const { transcribe: whisperTranscribe } = require('./whisperService');
const { extractFeatures } = require('./wav2vecService');
const { estimateFromAudio, estimateFromTranscription, estimateOverallConfidence } = require('./transcriptionConfidence');
const { analyzeAudio } = require('./audioService');
const logger = require('../utils/logger');

const loggerCategory = 'speech';

const TECHNICAL_CORRECTIONS = {
  'reactjs': 'React.js',
  'react js': 'React.js',
  'nodejs': 'Node.js',
  'node js': 'Node.js',
  'typescript': 'TypeScript',
  'javascript': 'JavaScript',
  'python': 'Python',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'k8s': 'Kubernetes',
  'machine learning': 'Machine Learning',
  'deep learning': 'Deep Learning',
  'artificial intelligence': 'Artificial Intelligence',
  'sql': 'SQL',
  'nosql': 'NoSQL',
  'api': 'API',
  'rest api': 'REST API',
  'graphql': 'GraphQL',
  'aws': 'AWS',
  'azure': 'Azure',
  'gcp': 'GCP',
  'ci cd': 'CI/CD',
  'cicd': 'CI/CD',
  'devops': 'DevOps',
  'mongodb': 'MongoDB',
  'postgresql': 'PostgreSQL',
  'postgres': 'PostgreSQL',
  'redis': 'Redis',
  'github': 'GitHub',
  'tensorflow': 'TensorFlow',
  'pytorch': 'PyTorch',
  'nextjs': 'Next.js',
  'llm': 'LLM',
  'llms': 'LLMs',
  'openai': 'OpenAI',
  'transformer': 'Transformer',
  'transformers': 'Transformers',
};

const TELUGU_POST_PROCESS = {
  'naaku': 'to me',
  'naa': 'my',
  'maa': 'our',
  'meru': 'you',
  'miru': 'you',
  'memu': 'we',
  'em': 'what',
  'enti': 'what',
  'enduku': 'why',
  'ela': 'how',
  'eppudu': 'when',
  'kaadu': 'no',
  'kadu': 'not',
  'avunu': 'yes',
  'bagundi': 'good',
  'bagondi': 'good',
  'cheppandi': 'tell',
  'choodandi': 'see',
  'vinandi': 'listen',
  'mari': 'and then',
  'kuda': 'also',
  'tappa': 'but',
  'kani': 'but',
  'kabatti': 'so',
  'appudu': 'then',
  'tarvata': 'afterwards',
  'mundu': 'before',
  'pettandi': 'keep',
  'tesukondi': 'take',
  'chuddam': 'let us see',
  'ardhamundi': 'understood',
  'ardhamavtundi': 'will understand',
};

const RE_ENGLISH_WORD = /^[a-zA-Z]+$/;

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeTranscript(text) {
  if (!text || !text.trim()) return text;

  let normalized = text.trim();

  normalized = normalized.replace(/\b(\w+)\s+\1\b/gi, '$1');

  normalized = normalized.replace(/\bi\b/g, 'I');

  normalized = normalized.replace(/(^|\.\s+|\?\s+|\!\s+)([a-z])/g, (_, before, char) => before + char.toUpperCase());

  const sorted = Object.entries(TECHNICAL_CORRECTIONS).sort((a, b) => b[0].length - a[0].length);
  for (const [wrong, correct] of sorted) {
    const regex = new RegExp(`\\b${escapeRegex(wrong)}\\b`, 'gi');
    normalized = normalized.replace(regex, (match) => {
      if (match === wrong) return correct;
      if (match.charAt(0) === match.charAt(0).toUpperCase()) return correct;
      return correct;
    });
  }

  normalized = normalized.replace(/\s+(\.|,|!|\?)/g, '$1');

  normalized = normalized.replace(/\.(?=\w)/g, '. ');

  normalized = normalized.replace(/\s{2,}/g, ' ');

  if (normalized && !/[.!?]$/.test(normalized)) {
    normalized += '.';
  }

  return normalized;
}

function applyTeluguPostProcessing(text) {
  if (!text || !text.trim()) return text;

  let result = text;
  const words = result.split(/\s+/);

  const processed = words.map((word) => {
    const clean = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (TELUGU_POST_PROCESS[clean]) {
      return `[${word}]`;
    }
    return word;
  });

  return processed.join(' ');
}

const streamingContexts = {};

function mergeTexts(previousText, newText) {
  if (!previousText) return newText;
  if (!newText) return previousText;

  const prevWords = previousText.trim().split(/\s+/);
  const newWords = newText.trim().split(/\s+/);

  let bestOverlap = 0;
  let overlapPos = -1;
  const minOverlap = Math.min(3, prevWords.length, newWords.length);

  for (let i = minOverlap; i >= 1; i--) {
    const prevTail = prevWords.slice(prevWords.length - i).join(' ').toLowerCase();
    const newHead = newWords.slice(0, i).join(' ').toLowerCase();
    if (prevTail === newHead) {
      bestOverlap = i;
      overlapPos = prevWords.length - i;
      break;
    }
  }

  if (bestOverlap >= 1) {
    const prevPart = prevWords.slice(0, overlapPos).join(' ');
    const newPart = newWords.slice(bestOverlap).join(' ');
    return [prevPart, ...(newPart ? [' ', newPart] : [])].join('').trim();
  }

  return newText;
}

function getStreamingContext(sessionId) {
  if (!streamingContexts[sessionId]) {
    streamingContexts[sessionId] = {
      previousTexts: [],
      lastChunkText: '',
      bestChunkText: '',
      bestChunkConfidence: 0,
      totalAudioDuration: 0,
      chunkCount: 0,
      startTime: Date.now(),
    };
  }
  return streamingContexts[sessionId];
}

function clearStreamingContext(sessionId) {
  delete streamingContexts[sessionId];
}

function logTranscriptDebug(rawAudioLength, confidence, recognizedLanguage, finalText, processingTime, sessionId) {
  const logData = {
    rawAudioLength,
    rawAudioDuration: (rawAudioLength / 16000).toFixed(2) + 's',
    confidence,
    overallConfidence: confidence?.overall,
    whisperConfidence: confidence?.whisper,
    recognizedLanguage: recognizedLanguage || 'en',
    finalTextPreview: finalText ? finalText.substring(0, 200) : '',
    wordCount: finalText ? finalText.split(/\s+/).filter(Boolean).length : 0,
    processingTimeMs: processingTime,
    sessionId: sessionId || 'unknown',
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'debug') {
    console.log('[STT-DEBUG]', JSON.stringify(logData, null, 2));
  }

  logger.debug(loggerCategory, 'Transcription complete', logData);
}

async function processAudio(audioInput, options = {}) {
  const {
    sampleRate = 16000,
    noiseReductionStrength = 0.5,
    language = 'en',
    previousContext = '',
    sessionId = null,
    isStreamingChunk = false,
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
  const audioLengthBytes = rawSamples.length * (audioInput instanceof Float32Array ? 4 : 1);

  const noiseResult = reduceNoise(rawSamples, sampleRate, noiseReductionStrength);
  const cleanedSamples = noiseResult.samples;

  let mfccFeatures = null;
  try {
    mfccFeatures = await analyzeAudio(Buffer.from(Array.from(cleanedSamples.map(s => Math.max(0, Math.min(255, (s + 1) * 128))))), 16000);
  } catch (err) {
    // MFCC not critical
  }

  let wav2vecFeatures = null;
  try {
    wav2vecFeatures = await extractFeatures(cleanedSamples);
  } catch (err) {
    // Wav2Vec not critical
  }

  const ctx = previousContext || (sessionId ? getStreamingContext(sessionId).lastChunkText : '');
  let whisperResult = await whisperTranscribe(cleanedSamples, {
    language,
    task: 'transcribe',
    previousContext: ctx,
  });

  if (whisperResult.text && whisperResult.confidence < 0.5 && rawSamples.length > 16000) {
    const retryResult = await whisperTranscribe(rawSamples, {
      language,
      task: 'transcribe',
      previousContext: ctx,
    });
    if (retryResult.confidence > whisperResult.confidence && retryResult.text) {
      whisperResult = retryResult;
    }
  }

  if (whisperResult.text && whisperResult.confidence < 0.6) {
    const retryResult = await whisperTranscribe(cleanedSamples, {
      language,
      task: 'transcribe',
      previousContext: ctx,
      temperature: 0.3,
    });
    if (retryResult.confidence > whisperResult.confidence && retryResult.text) {
      whisperResult = retryResult;
    }
  }

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
    whisperResult.duration,
    whisperResult.perWordScores || []
  );

  const overallConfidence = estimateOverallConfidence(
    audioConfidence.overall,
    transcriptionConfidence.overall
  );

  let normalizedText = normalizeTranscript(whisperResult.text);

  const teluguProcessed = applyTeluguPostProcessing(normalizedText);
  if (teluguProcessed !== normalizedText) {
    normalizedText = teluguProcessed;
  }

  if (isStreamingChunk && sessionId) {
    const ctx = getStreamingContext(sessionId);
    ctx.previousTexts.push(normalizedText);
    ctx.chunkCount++;
    ctx.totalAudioDuration += parseFloat(originalDuration || 0);

    const merged = ctx.lastChunkText
      ? mergeTexts(ctx.lastChunkText, normalizedText)
      : normalizedText;
    ctx.lastChunkText = merged;

    if (overallConfidence > ctx.bestChunkConfidence && normalizedText) {
      ctx.bestChunkText = normalizedText;
      ctx.bestChunkConfidence = overallConfidence;
    }

    if (ctx.previousTexts.length > 20) {
      ctx.previousTexts.splice(0, ctx.previousTexts.length - 10);
    }
  }

  const processingTime = Date.now() - startTime;

  logTranscriptDebug(
    audioLengthBytes,
    {
      overall: overallConfidence,
      whisper: Math.round(whisperResult.confidence * 100),
      transcription: transcriptionConfidence,
      audio: audioConfidence,
    },
    language,
    normalizedText,
    processingTime,
    sessionId
  );

  return {
    text: normalizedText,
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
        technicalTermCount: transcriptionConfidence.technicalTermCount,
        codeSwitchDetected: transcriptionConfidence.codeSwitchDetected,
      },
    },
    duration: parseFloat(originalDuration),
    wordCount: transcriptionConfidence.wordCount,
    wav2vecEmbedding: wav2vecFeatures?.embedding || null,
    mfccFeatures: mfccFeatures || null,
    processingTime,
    model: whisperResult.model || 'whisper-large-v3-turbo',
    codeSwitchDetected: transcriptionConfidence.codeSwitchDetected || false,
    rawAudioLength: audioLengthBytes,
    recognizedLanguage: language,
  };
}

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

module.exports = {
  processAudio,
  processWavBuffer,
  getStreamingContext,
  clearStreamingContext,
};
