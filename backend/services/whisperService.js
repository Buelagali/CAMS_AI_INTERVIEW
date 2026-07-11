const { pipeline } = require('@xenova/transformers');

const SAMPLE_RATE = 16000;
const CHUNK_DURATION = 30;
const CHUNK_OVERLAP = 5;

const MODEL_NAME = 'Xenova/whisper-large-v3-turbo';
const FALLBACK_MODEL = 'Xenova/whisper-small';

const TECHNICAL_KEYWORDS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express',
  'MongoDB', 'MySQL', 'Docker', 'Kubernetes', 'REST', 'API', 'GitHub',
  'TensorFlow', 'PyTorch', 'Machine Learning', 'Artificial Intelligence',
  'LLM', 'OpenAI', 'Next.js', 'SQL', 'NoSQL', 'Redis', 'PostgreSQL',
  'GraphQL', 'AWS', 'Azure', 'GCP', 'CI/CD', 'DevOps', 'Microservices',
  'Serverless', 'Nginx', 'Linux', 'Git', 'HTML', 'CSS', 'Webpack',
  'Vite', 'Jest', 'Cypress', 'Transformer', 'Database', 'Algorithm',
  'Polymorphism', 'Inheritance', 'Encapsulation', 'Abstraction',
  'Recursion', 'Asynchronous', 'Middleware', 'Authentication',
  'Authorization', 'Containerization', 'Orchestration',
];

const TECHNICAL_TERM_FIXES = {
  'reactjs': 'React',
  'react js': 'React',
  'node js': 'Node.js',
  'nodejs': 'Node.js',
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
  'redis': 'Redis',
  'github': 'GitHub',
  'tensorflow': 'TensorFlow',
  'pytorch': 'PyTorch',
  'nextjs': 'Next.js',
  'llm': 'LLM',
  'openai': 'OpenAI',
};

const TELUGU_WORDS = [
  'naaku', 'naku', 'naa', 'maa', 'meru', 'miru', 'memu',
  'em', 'enti', 'enduku', 'ela', 'eppudu', 'ekkada',
  'kaadu', 'kadu', 'avunu', 'undhi', 'ledhu', 'ledu',
  'taggedi', 'taggindi', 'bagundi', 'bagondi',
  'cheppandi', 'chepparu', 'choodandi', 'vinandi',
  'pettandi', 'tesukondi', 'chesukondi', 'chuddam',
  'naaku telusu', 'naku teliyadu', 'ardhamundi', 'ardhamavtundi',
  'mari', 'kuda', 'tappa', 'kani', 'kabatti', 'appudu',
  'tarvata', 'mundu', 'venaka', 'pai', 'kinda',
];

const INDIAN_ENGLISH_PHRASES = [
  'only', 'actually', 'basically', 'you know', 'I mean', 'like',
  'na', 'ji', 'yaar', 'bro', 'dude', 'actually only',
  'only' 
];

const LANGUAGE_PROMPTS = {
  en: 'The following is an interview response in Indian English. Technical terminology including Python, JavaScript, React, SQL, Docker, Kubernetes, API, Machine Learning, and database concepts are common.',
  te: 'The following speech contains Telugu-accented English mixed with Telugu words. This is a technical interview response.',
};

const TEMPERATURE_CHAIN = [0.0, 0.2, 0.4, 0.6];

let transcriber = null;
let lastTranscriberModel = null;
let transcriberLoading = false;
let transcriberQueue = [];

async function getTranscriber(modelName = MODEL_NAME) {
  if (transcriber && lastTranscriberModel === modelName) return transcriber;

  if (transcriberLoading) {
    return new Promise((resolve) => {
      transcriberQueue.push(resolve);
    });
  }

  transcriberLoading = true;
  try {
    console.log(`Loading ${modelName}...`);
    transcriber = await pipeline(
      'automatic-speech-recognition',
      modelName,
      { quantized: true }
    );
    lastTranscriberModel = modelName;
    transcriberLoading = false;
    transcriberQueue.forEach((r) => r(transcriber));
    transcriberQueue = [];
    console.log(`${modelName} loaded successfully`);
    return transcriber;
  } catch (err) {
    if (modelName === MODEL_NAME) {
      console.error(`Failed to load ${MODEL_NAME}: ${err.message}. Falling back to ${FALLBACK_MODEL}...`);
      transcriberLoading = false;
      return getTranscriber(FALLBACK_MODEL);
    }
    transcriberLoading = false;
    transcriberQueue.forEach((r) => r(null));
    transcriberQueue = [];
    return null;
  }
}

function detectLanguage(samples) {
  if (!samples || samples.length < SAMPLE_RATE * 0.5) return 'en';
  const energy = samples.reduce((a, b) => a + Math.abs(b), 0) / samples.length;
  if (energy < 0.003) return 'en';
  return 'en';
}

function chunkAudio(samples) {
  const chunkSize = SAMPLE_RATE * CHUNK_DURATION;
  const overlapSize = SAMPLE_RATE * CHUNK_OVERLAP;
  const chunks = [];
  const positions = [];

  if (samples.length <= chunkSize) {
    chunks.push(samples);
    positions.push(0);
    return { chunks, positions };
  }

  let start = 0;
  while (start < samples.length) {
    const end = Math.min(start + chunkSize, samples.length);
    chunks.push(samples.slice(start, end));
    positions.push(start);
    start += chunkSize - overlapSize;
    if (end >= samples.length) break;
  }

  return { chunks, positions };
}

function extractTimestamps(chunks, positions, chunkResults) {
  const segments = [];
  for (let i = 0; i < chunkResults.length; i++) {
    const result = chunkResults[i];
    const offset = positions[i];
    if (result && result.chunks) {
      for (const seg of result.chunks) {
        segments.push({
          text: seg.text || '',
          start: (seg.start || 0) + offset,
          end: (seg.end || 0) + offset,
          confidence: seg.score || seg.confidence || 0.5,
        });
      }
    } else if (result && result.text) {
      const chunkDuration = chunks[i].length / SAMPLE_RATE;
      segments.push({
        text: result.text,
        start: offset,
        end: offset + chunkDuration,
        confidence: result.score || 0.5,
      });
    }
  }

  segments.sort((a, b) => a.start - b.start);
  return segments;
}

function mergeOverlappingTexts(chunkResults) {
  if (chunkResults.length <= 1) return (chunkResults[0]?.text || '').trim();

  const texts = chunkResults.map((r) => (r.text || '').trim()).filter(Boolean);
  if (texts.length === 0) return '';
  if (texts.length === 1) return texts[0];

  const merged = [texts[0]];
  for (let i = 1; i < texts.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = texts[i];
    const prevWords = prev.split(/\s+/);
    const currWords = curr.split(/\s+/);

    let overlapIdx = 0;
    const maxOverlap = Math.min(prevWords.length, 12);
    for (let j = maxOverlap; j >= 2; j--) {
      const tail = prevWords.slice(prevWords.length - j).join(' ').toLowerCase();
      const head = currWords.slice(0, j).join(' ').toLowerCase();
      const tailWords = tail.split(/\s+/);
      const headWords = head.split(/\s+/);
      let matches = 0;
      for (let w = 0; w < tailWords.length; w++) {
        if (tailWords[w] === headWords[w]) matches++;
      }
      if (matches >= Math.max(2, j - 1)) {
        overlapIdx = j;
        break;
      }
    }

    if (overlapIdx > 0) {
      merged[merged.length - 1] = prev + ' ' + currWords.slice(overlapIdx).join(' ');
    } else {
      merged.push(curr);
    }
  }

  return merged.join(' ');
}

function restorePunctuation(text) {
  if (!text) return text;
  let result = text.trim();

  result = result.replace(/\bi\b/g, 'I');

  result = result.replace(/(^|\.\s+|\?\s+|\!\s+)([a-z])/g, (_, before, char) => before + char.toUpperCase());

  result = result.replace(/\s+(\.|,|!|\?)/g, '$1');

  result = result.replace(/\.(?=\w)/g, '. ');

  result = result.replace(/\b(and|but|or|so)\s+(?=[A-Z])/g, (match) => {
    const after = match.trim();
    if (after && after.length > 2) return '. ' + match.trim();
    return match;
  });

  result = result.replace(/\s{2,}/g, ' ');

  if (result && !/[.!?]$/.test(result)) {
    result += '.';
  }

  return result;
}

function applyTechnicalTermCorrection(text) {
  if (!text) return text;
  let result = text;

  const sorted = Object.entries(TECHNICAL_TERM_FIXES).sort((a, b) => b[0].length - a[0].length);
  for (const [wrong, correct] of sorted) {
    const regex = new RegExp(`\\b${escapeRegex(wrong)}\\b`, 'gi');
    result = result.replace(regex, correct);
  }

  return result;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function detectCodeSwitching(text) {
  if (!text) return { hasTelugu: false, teluguWords: [], englishRatio: 1 };

  const lower = text.toLowerCase();
  const foundTelugu = TELUGU_WORDS.filter((w) => lower.includes(w));
  const allWords = text.split(/\s+/).filter(Boolean);
  const teluguWordCount = foundTelugu.length;

  return {
    hasTelugu: teluguWordCount > 0,
    teluguWords: foundTelugu,
    englishRatio: allWords.length > 0 ? (allWords.length - teluguWordCount) / allWords.length : 1,
  };
}

function calibrateConfidence(segments, text, perWordScores = []) {
  if (!text || text.trim().length === 0) return 0;

  const avgSegConf = segments.length > 0
    ? segments.reduce((s, seg) => s + seg.confidence, 0) / segments.length
    : 0.5;

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const wordLenConf = Math.min(1, wordCount / 50);

  const hasIndianPhrases = INDIAN_ENGLISH_PHRASES.some((p) =>
    text.toLowerCase().includes(p)
  );

  const technicalCount = TECHNICAL_KEYWORDS.filter((kw) => {
    const regex = new RegExp(`\\b${escapeRegex(kw)}\\b`, 'i');
    return regex.test(text);
  }).length;
  const technicalBoost = Math.min(0.1, technicalCount * 0.02);

  const codeSwitch = detectCodeSwitching(text);
  const teluguPenalty = codeSwitch.hasTelugu ? 0.05 : 0;

  const avgWordConf = perWordScores.length > 0
    ? perWordScores.reduce((a, b) => a + b, 0) / perWordScores.length
    : avgSegConf;

  let confidence = avgWordConf * 0.4 + wordLenConf * 0.2 + avgSegConf * 0.2;

  if (hasIndianPhrases) confidence += 0.05;
  confidence += technicalBoost;
  confidence -= teluguPenalty;

  if (wordCount > 0 && wordCount < 3) confidence *= 0.7;
  if (codeSwitch.hasTelugu && wordCount >= 5) confidence = Math.min(confidence, 0.85);

  return Math.max(0.1, Math.min(0.99, confidence));
}

function buildContextPrompt(previousTexts) {
  const recent = previousTexts.filter(Boolean).slice(-3);
  if (recent.length === 0) return '';
  const context = recent.join(' ').split(/\s+/).slice(-50).join(' ');
  return `Previous interview response context: ${context}`;
}

async function transcribe(samples, options = {}) {
  const {
    language = 'en',
    task = 'transcribe',
    returnTimestamps = true,
    chunkCallback = null,
    temperature = 0.0,
    previousContext = '',
    forceLanguage = false,
  } = options;

  if (!samples || samples.length < SAMPLE_RATE * 0.01) {
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
  if (!model) {
    return {
      text: '',
      segments: [],
      confidence: 0,
      duration: 0,
      wordCount: 0,
      error: 'Whisper model not loaded',
    };
  }

  const duration = samples.length / SAMPLE_RATE;
  const detectedLang = detectLanguage(samples);

  const basePrompt = LANGUAGE_PROMPTS[detectedLang] || LANGUAGE_PROMPTS.en;
  const contextPrompt = buildContextPrompt(previousContext ? [previousContext] : []);
  const prompt = contextPrompt
    ? `${basePrompt} ${contextPrompt}`
    : basePrompt;

  const generationConfig = {
    language: forceLanguage ? language : undefined,
    task,
    return_timestamps: returnTimestamps,
    num_beams: 3,
    temperature: [temperature],
    repetition_penalty: 1.1,
    no_repeat_ngram_size: 3,
    compression_ratio_threshold: 2.4,
    log_prob_threshold: -1.0,
    no_speech_threshold: 0.6,
    early_stopping: true,
    prompt,
  };

  try {
    let result;
    if (samples.length > SAMPLE_RATE * CHUNK_DURATION) {
      const { chunks, positions } = chunkAudio(samples);
      const chunkContexts = previousContext ? [previousContext] : [];
      const chunkResults = [];

      for (let i = 0; i < chunks.length; i++) {
        const ctx = i > 0 ? buildContextPrompt(chunkContexts) : '';
        const chunkConfig = { ...generationConfig };
        if (ctx) chunkConfig.prompt = `${basePrompt} ${ctx}`;

        const chunkResult = await model(chunks[i], chunkConfig);
        chunkResults.push(chunkResult);
        if (chunkResult.text && chunkResult.text.trim()) {
          chunkContexts.push(chunkResult.text.trim());
        }
        if (chunkCallback) chunkCallback(i, chunks.length, chunkResult);
      }
      const fullText = mergeOverlappingTexts(chunkResults);
      const segments = extractTimestamps(chunks, positions, chunkResults);
      const avgConfidence = segments.length > 0
        ? segments.reduce((s, seg) => s + seg.confidence, 0) / segments.length
        : 0.5;
      result = { text: fullText, chunks: segments, score: avgConfidence };
    } else {
      result = await model(samples, generationConfig);
    }

    let transcriptionText = (result.text || '').trim();
    transcriptionText = applyTechnicalTermCorrection(transcriptionText);
    transcriptionText = restorePunctuation(transcriptionText);

    const wordCount = transcriptionText ? transcriptionText.split(/\s+/).filter(Boolean).length : 0;

    const perWordScores = [];
    if (result.chunks) {
      for (const seg of result.chunks) {
        if (seg.text && (seg.score || seg.confidence)) {
          const words = seg.text.split(/\s+/).filter(Boolean);
          const score = seg.score || seg.confidence || 0.5;
          for (let w = 0; w < words.length; w++) {
            perWordScores.push(score);
          }
        }
      }
    }

    const confidence = calibrateConfidence(result.chunks || [], transcriptionText, perWordScores);

    return {
      text: transcriptionText,
      rawText: (result.text || '').trim(),
      segments: result.chunks || [],
      confidence: Math.round(confidence * 100) / 100,
      perWordScores,
      duration: parseFloat(duration.toFixed(2)),
      wordCount,
      model: lastTranscriberModel || MODEL_NAME,
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

async function transcribeWithFallback(samples, options = {}) {
  let bestResult = null;
  let bestConfidence = -1;

  const temps = options.temperatureChain || TEMPERATURE_CHAIN;

  for (const temp of temps) {
    const result = await transcribe(samples, { ...options, temperature: temp });
    const conf = result.confidence || 0;

    if (!bestResult || conf > bestConfidence) {
      bestResult = result;
      bestConfidence = conf;
    }

    const wordCount = result.text ? result.text.split(/\s+/).filter(Boolean).length : 0;
    if (conf >= 0.7 && wordCount >= 3) {
      return result;
    }
  }

  if (bestResult && (!bestResult.text || bestConfidence < 0.3)) {
    const fallbackModel = await getTranscriber(FALLBACK_MODEL);
    if (fallbackModel && (lastTranscriberModel !== FALLBACK_MODEL)) {
      const fallbackResult = await transcribe(samples, { ...options, temperature: 0.0 });
      if (fallbackResult.confidence > bestConfidence) {
        return fallbackResult;
      }
    }
  }

  if (bestResult && bestResult.rawText && bestResult.rawText.length > (bestResult.text || '').length) {
    bestResult.text = bestResult.rawText;
    bestResult.confidence = Math.max(bestResult.confidence, 0.4);
  }

  return bestResult || { text: '', segments: [], confidence: 0, duration: 0, wordCount: 0, error: 'All temperatures failed' };
}

async function getModelInfo() {
  return {
    primary: lastTranscriberModel || MODEL_NAME,
    quantized: true,
    fallback: FALLBACK_MODEL,
    sampleRate: SAMPLE_RATE,
    maxDuration: 30,
    chunkOverlap: CHUNK_OVERLAP,
    temperatureChain: TEMPERATURE_CHAIN,
    wordLevelTimestamps: true,
    supportedLanguages: ['en', 'te'],
    technicalTerms: TECHNICAL_KEYWORDS.length,
  };
}

module.exports = { transcribe: transcribeWithFallback, getTranscriber, getModelInfo };
