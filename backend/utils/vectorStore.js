const logger = require('./logger');

const DEFAULT_DIMENSION = 384;
const SIMILARITY_TOP_K = 10;

let store = {
  resumes: [],
  jobDescriptions: [],
  questions: [],
  knowledgeBase: [],
  interviewHistory: [],
  candidateHistory: [],
};

let indexReady = false;

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function generateId() {
  return `vec_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
}

const vectorStore = {
  async init() {
    indexReady = true;
    logger.info('system', 'Vector store initialized', { dimensions: DEFAULT_DIMENSION, topK: SIMILARITY_TOP_K });
    return true;
  },

  isReady() {
    return indexReady;
  },

  getDimension() {
    return DEFAULT_DIMENSION;
  },

  async insert(collection, id, vector, metadata = {}) {
    if (!indexReady) await this.init();
    if (!store[collection]) {
      store[collection] = [];
    }
    const entry = {
      id: id || generateId(),
      vector,
      metadata,
      createdAt: new Date().toISOString(),
    };
    store[collection].push(entry);
    logger.debug('system', `Inserted into ${collection}`, { id: entry.id });
    return entry.id;
  },

  async search(collection, queryVector, topK = SIMILARITY_TOP_K) {
    if (!indexReady) await this.init();
    const items = store[collection] || [];
    if (items.length === 0 || !queryVector) return [];

    const scored = items.map((item) => ({
      ...item,
      score: cosineSimilarity(queryVector, item.vector),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(({ vector, ...rest }) => rest);
  },

  async delete(collection, id) {
    if (!store[collection]) return false;
    const before = store[collection].length;
    store[collection] = store[collection].filter((e) => e.id !== id);
    return store[collection].length < before;
  },

  async get(collection, id) {
    const items = store[collection] || [];
    return items.find((e) => e.id === id) || null;
  },

  async count(collection) {
    return (store[collection] || []).length;
  },

  async clear(collection) {
    if (collection) {
      store[collection] = [];
    } else {
      Object.keys(store).forEach((k) => { store[k] = []; });
    }
    return true;
  },

  async health() {
    const counts = {};
    Object.keys(store).forEach((k) => { counts[k] = store[k].length; });
    return { ready: indexReady, totalEntries: Object.values(counts).reduce((a, b) => a + b, 0), counts };
  },
};

module.exports = vectorStore;
