const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const vectorStore = require('./vectorStore');

const REGISTRY_DIR = process.env.MODEL_REGISTRY_DIR || path.join(__dirname, '..', 'models', 'registry');
const METADATA_FILE = path.join(REGISTRY_DIR, 'registry.json');

const KNOWN_MODELS = ['embeddings', 'whisper', 'wav2vec2', 'vit', 'layoutlm', 'phi3'];

let registry = { models: {}, active: {} };

function ensureDir() {
  if (!fs.existsSync(REGISTRY_DIR)) {
    fs.mkdirSync(REGISTRY_DIR, { recursive: true });
  }
}

function loadRegistry() {
  ensureDir();
  if (fs.existsSync(METADATA_FILE)) {
    try {
      registry = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
    } catch (e) {
      logger.error('system', 'Failed to load model registry', { error: e.message });
      registry = { models: {}, active: {} };
    }
  }
  if (!registry.models) registry.models = {};
  if (!registry.active) registry.active = {};
}

function saveRegistry() {
  ensureDir();
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(registry, null, 2));
  } catch (e) {
    logger.error('system', 'Failed to save model registry', { error: e.message });
  }
}

function generateVersion(modelName) {
  const entries = Object.values(registry.models).filter((m) => m.modelName === modelName);
  return `v${entries.length + 1}.0.0`;
}

const modelRegistry = {
  init() {
    loadRegistry();
    logger.info('system', 'Model registry initialized', {
      path: REGISTRY_DIR,
      registeredModels: Object.keys(registry.models).length,
    });
    return true;
  },

  registerModel(modelName, metadata = {}) {
    const version = generateVersion(modelName);
    const entry = {
      id: `${modelName}_${version}`,
      modelName,
      version,
      status: 'registered',
      timestamp: new Date().toISOString(),
      path: metadata.path || null,
      framework: metadata.framework || 'onnx',
      metrics: metadata.metrics || {},
      tags: metadata.tags || {},
      description: metadata.description || '',
    };
    registry.models[entry.id] = entry;
    saveRegistry();
    logger.info('system', `Model registered: ${entry.id}`, { metrics: entry.metrics });
    return entry;
  },

  activateModel(modelName, versionId) {
    if (!registry.models[versionId]) {
      logger.error('system', `Cannot activate: ${versionId} not found`);
      return false;
    }
    if (registry.models[versionId].modelName !== modelName) {
      logger.error('system', `Version ${versionId} does not belong to model ${modelName}`);
      return false;
    }
    registry.active[modelName] = versionId;
    registry.models[versionId].status = 'active';
    saveRegistry();
    logger.info('system', `Model activated: ${versionId}`);
    return true;
  },

  getActiveVersion(modelName) {
    const versionId = registry.active[modelName];
    if (!versionId || !registry.models[versionId]) return null;
    return registry.models[versionId];
  },

  getVersion(modelName, version) {
    const versionId = `${modelName}_${version}`;
    return registry.models[versionId] || null;
  },

  listVersions(modelName) {
    return Object.values(registry.models)
      .filter((m) => m.modelName === modelName)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  listAllModels() {
    const models = {};
    for (const name of KNOWN_MODELS) {
      const versions = this.listVersions(name);
      if (versions.length > 0) {
        models[name] = {
          active: registry.active[name] || null,
          versions: versions.map((v) => ({ id: v.id, version: v.version, status: v.status, timestamp: v.timestamp })),
        };
      } else {
        models[name] = { active: null, versions: [] };
      }
    }
    return models;
  },

  rollback(modelName, targetVersion) {
    const currentActive = this.getActiveVersion(modelName);
    if (!currentActive) {
      logger.error('system', `No active version for ${modelName} to rollback from`);
      return false;
    }
    if (currentActive.version === targetVersion) {
      logger.info('system', `Already on ${targetVersion} for ${modelName}`);
      return true;
    }
    const target = this.getVersion(modelName, targetVersion);
    if (!target) {
      logger.error('system', `Target version ${targetVersion} not found for ${modelName}`);
      return false;
    }
    registry.models[currentActive.id].status = 'rolled_back';
    return this.activateModel(modelName, target.id);
  },

  updateModelMetrics(modelName, metrics) {
    const active = this.getActiveVersion(modelName);
    if (active) {
      registry.models[active.id].metrics = { ...registry.models[active.id].metrics, ...metrics };
      saveRegistry();
    }
  },

  markDeployed(modelName, path) {
    const active = this.getActiveVersion(modelName);
    if (active) {
      registry.models[active.id].status = 'deployed';
      registry.models[active.id].path = path;
      saveRegistry();
    }
  },

  getTrainingHistory() {
    return Object.values(registry.models)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50)
      .map(({ id, modelName, version, status, timestamp, metrics }) => ({
        id, modelName, version, status, timestamp, metrics,
      }));
  },
};

module.exports = modelRegistry;
