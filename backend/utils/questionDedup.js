const logger = require('./logger');
const { getSimilarity, getEmbedding } = require('../services/bertService');

const SIMILARITY_THRESHOLD = 0.82;
const WORD_OVERLAP_THRESHOLD = 0.50;
const SIGNIFICANT_WORD_THRESHOLD = 0.45;
const DEBUG = process.env.NODE_ENV !== 'production' || process.env.QUESTION_DEBUG === 'true';

const STOPWORDS = new Set([
  'the','a','an','in','on','at','to','for','of','with','and','or','but','is','are',
  'was','were','be','been','being','have','has','had','do','does','did','can','could',
  'will','would','shall','should','may','might','must','this','that','these','those',
  'i','you','he','she','it','we','they','me','him','her','us','them','my','your',
  'his','its','our','their','what','which','who','whom','how','when','where','why',
  'about','into','through','during','before','after','above','below','between','out',
  'off','over','under','again','further','then','once','here','there','all','each',
  'every','both','few','more','most','other','some','such','no','nor','not','only',
  'own','same','so','than','too','very','just','because','as','until','while','if',
  'please','tell','describe','explain','walk','talk','share','discuss','elaborate',
  'provide','give','can','could','would','will','please','tell','describe','explain',
  'walk','talk','share','discuss','elaborate','provide','give','let','ask',
]);

const WORD_FORMS = {
  'polymorphism': ['polymorphic', 'polymorph'],
  'inheritance': ['inherit', 'inherits', 'inherited'],
  'encapsulation': ['encapsulate', 'encapsulates', 'encapsulated'],
  'abstraction': ['abstract', 'abstracts'],
  'recursion': ['recursive', 'recursively', 'recurse'],
  'algorithm': ['algorithms', 'algorithmic'],
  'database': ['databases', 'db'],
  'deployment': ['deploy', 'deploys', 'deployed', 'deploying'],
  'asynchronous': ['async', 'asynchronously'],
  'synchronous': ['sync', 'synchronously'],
  'authentication': ['auth', 'authenticate', 'authenticated'],
  'authorization': ['authorize', 'authorized'],
  'optimization': ['optimize', 'optimizes', 'optimized', 'optimizing'],
  'implementation': ['implement', 'implements', 'implemented', 'implementing'],
  'configuration': ['configure', 'configures', 'configured', 'config'],
  'integration': ['integrate', 'integrates', 'integrated', 'integrating'],
  'documentation': ['document', 'documents', 'documented'],
  'validation': ['validate', 'validates', 'validated'],
  'normalization': ['normalize', 'normalizes', 'normalized'],
  'serialization': ['serialize', 'serializes', 'serialized'],
  'caching': ['cache', 'cached'],
  'monitoring': ['monitor', 'monitors', 'monitored'],
  'logging': ['log', 'logs', 'logged'],
  'testing': ['test', 'tests', 'tested'],
  'debugging': ['debug', 'debugs', 'debugged'],
  'containerization': ['containerize', 'container', 'containers', 'docker'],
  'orchestration': ['orchestrate', 'orchestrates', 'kubernetes', 'k8s'],
};

function normalizeForm(word) {
  const lower = word.toLowerCase();
  for (const [base, forms] of Object.entries(WORD_FORMS)) {
    if (lower === base || forms.includes(lower)) return base;
  }
  return lower;
}

function getSignificantWords(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeForm)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function wordOverlapRatio(a, b) {
  const wordsA = new Set(getSignificantWords(a));
  const wordsB = new Set(getSignificantWords(b));
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.size / union.size;
}

function topKeywordOverlap(a, b) {
  const wordsA = getSignificantWords(a);
  const wordsB = getSignificantWords(b);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  const freqA = {};
  wordsA.forEach((w) => { freqA[w] = (freqA[w] || 0) + 1; });
  const freqB = {};
  wordsB.forEach((w) => { freqB[w] = (freqB[w] || 0) + 1; });
  const topA = Object.entries(freqA).sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]);
  const topB = Object.entries(freqB).sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]);
  const common = topA.filter((w) => topB.includes(w));
  const maxLen = Math.max(topA.length, topB.length);
  return maxLen === 0 ? 0 : common.length / maxLen;
}

const sessionHistory = {};

const questionDedup = {
  initSession(sessionId) {
    sessionHistory[sessionId] = {
      questions: [],
      embeddingCache: {},
      debugLog: [],
    };
    logger.debug('system', `Question dedup session initialized: ${sessionId}`);
  },

  async recordQuestion(sessionId, question) {
    if (!sessionHistory[sessionId]) this.initSession(sessionId);
    const entry = {
      id: question.id,
      text: question.text,
      type: question.type,
      skill: question.metadata?.skill || null,
      difficulty: question.difficulty,
      timestamp: Date.now(),
      embedding: null,
    };
    try {
      const emb = await getEmbedding(question.text);
      if (emb && emb.length > 0) {
        entry.embedding = emb;
      }
    } catch {
      // embedding not available
    }
    sessionHistory[sessionId].questions.push(entry);
    logger.debug('system', `Question recorded: ${entry.id}`, { text: entry.text.substring(0, 80) });
    return entry;
  },

  async checkDuplicate(sessionId, questionText) {
    const isDuplicateResult = await this.isDuplicate(questionText, sessionId);
    if (sessionHistory[sessionId]) {
      sessionHistory[sessionId].debugLog.push({
        timestamp: Date.now(),
        text: questionText.substring(0, 100),
        isDuplicate: isDuplicateResult.isDuplicate,
        similarity: isDuplicateResult.similarity,
        mostSimilar: isDuplicateResult.mostSimilar,
        method: isDuplicateResult.method,
      });
      if (sessionHistory[sessionId].debugLog.length > 500) {
        sessionHistory[sessionId].debugLog = sessionHistory[sessionId].debugLog.slice(-250);
      }
    }
    if (DEBUG && isDuplicateResult.isDuplicate) {
      logger.debug('system', 'Duplicate question detected', {
        text: questionText.substring(0, 100),
        similarity: isDuplicateResult.similarity,
        mostSimilar: isDuplicateResult.mostSimilar?.substring(0, 100),
        method: isDuplicateResult.method,
      });
    }
    return isDuplicateResult;
  },

  async isDuplicate(questionText, sessionIdOrHistory) {
    let history;
    if (typeof sessionIdOrHistory === 'string') {
      const sess = sessionHistory[sessionIdOrHistory];
      history = sess ? sess.questions : [];
    } else {
      history = sessionIdOrHistory || [];
    }

    if (!history || history.length === 0) {
      return { isDuplicate: false, similarity: 0, mostSimilar: null, method: 'none' };
    }

    const norm = questionText.toLowerCase().trim();
    const exactMatch = history.some((h) => h.text.toLowerCase().trim() === norm);
    if (exactMatch) {
      return { isDuplicate: true, similarity: 1, mostSimilar: norm, method: 'exact' };
    }

    const inputWords = getSignificantWords(questionText);
    if (inputWords.length === 0) {
      return { isDuplicate: history.length > 0, similarity: 0.5, mostSimilar: null, method: 'empty' };
    }

    let maxSim = 0;
    let mostSimilar = null;
    let method = 'none';

    for (const prev of history) {
      if (!prev.text) continue;

      const wordSim = wordOverlapRatio(questionText, prev.text);
      if (wordSim > maxSim) {
        maxSim = wordSim;
        mostSimilar = prev.text;
        method = 'word';
      }

      const keywordSim = topKeywordOverlap(questionText, prev.text);
      if (keywordSim > maxSim) {
        maxSim = keywordSim;
        mostSimilar = prev.text;
        method = 'keyword';
      }

      const prevWords = getSignificantWords(prev.text);
      const commonSig = inputWords.filter((w) => prevWords.includes(w));
      if (commonSig.length >= 2) {
        const ratio = commonSig.length / Math.max(Math.min(inputWords.length, prevWords.length), 1);
        if (ratio > maxSim) {
          maxSim = ratio;
          mostSimilar = prev.text;
          method = 'significant';
        }
      }

      if (prev.embedding && prev.embedding.length > 0) {
        try {
          const inputEmb = await getEmbedding(questionText);
          if (inputEmb && inputEmb.length > 0 && inputEmb.length === prev.embedding.length) {
            let dot = 0, normA = 0, normB = 0;
            for (let i = 0; i < inputEmb.length; i++) {
              dot += inputEmb[i] * prev.embedding[i];
              normA += inputEmb[i] * inputEmb[i];
              normB += prev.embedding[i] * prev.embedding[i];
            }
            const denom = Math.sqrt(normA) * Math.sqrt(normB);
            const sim = denom === 0 ? 0 : dot / denom;
            if (sim > maxSim) {
              maxSim = sim;
              mostSimilar = prev.text;
              method = 'embedding';
            }
          }
        } catch {
          // embedding comparison failed, skip
        }
      }
    }

    if (maxSim >= SIMILARITY_THRESHOLD && method === 'embedding') {
      return { isDuplicate: true, similarity: Math.round(maxSim * 100) / 100, mostSimilar, method };
    }
    if (maxSim >= WORD_OVERLAP_THRESHOLD && (method === 'word' || method === 'keyword' || method === 'significant')) {
      return { isDuplicate: true, similarity: Math.round(maxSim * 100) / 100, mostSimilar, method };
    }

    return { isDuplicate: false, similarity: Math.round(maxSim * 100) / 100, mostSimilar, method };
  },

  getDebugLog(sessionId) {
    if (!sessionHistory[sessionId]) return [];
    return sessionHistory[sessionId].debugLog;
  },

  getSessionQuestions(sessionId) {
    if (!sessionHistory[sessionId]) return [];
    return sessionHistory[sessionId].questions;
  },

  getCoverage(sessionId) {
    if (!sessionHistory[sessionId]) return { total: 0, skills: [], types: {} };
    const questions = sessionHistory[sessionId].questions;
    const skills = new Set(questions.map((q) => q.skill).filter(Boolean));
    const types = {};
    questions.forEach((q) => { types[q.type] = (types[q.type] || 0) + 1; });
    return { total: questions.length, skills: [...skills], types };
  },

  clearSession(sessionId) {
    if (sessionHistory[sessionId]) {
      const count = sessionHistory[sessionId].questions.length;
      delete sessionHistory[sessionId];
      logger.debug('system', `Question dedup session cleared: ${sessionId} (${count} questions)`);
      return count;
    }
    return 0;
  },

  hasSufficientSkillCoverage(sessionId, skill, minQuestions = 2) {
    const coverage = this.getCoverage(sessionId);
    const skillQuestions = coverage.skills.filter((s) => s === skill).length;
    return skillQuestions >= minQuestions;
  },
};

module.exports = questionDedup;
