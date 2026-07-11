const logger = require('./logger');

const metrics = {};
const MAX_HISTORY = 10000;

function ensureModel(modelName) {
  if (!metrics[modelName]) {
    metrics[modelName] = {
      inferenceCount: 0,
      totalLatencyMs: 0,
      maxLatencyMs: 0,
      minLatencyMs: Infinity,
      failures: 0,
      totalMemoryMb: 0,
      memorySamples: 0,
      accuracySamples: 0,
      accuracySum: 0,
      latencyHistory: [],
      failureHistory: [],
    };
  }
  return metrics[modelName];
}

const monitor = {
  recordInference(modelName, latencyMs, success = true) {
    const m = ensureModel(modelName);
    m.inferenceCount++;
    m.totalLatencyMs += latencyMs;
    m.maxLatencyMs = Math.max(m.maxLatencyMs, latencyMs);
    m.minLatencyMs = Math.min(m.minLatencyMs, latencyMs);
    if (!success) {
      m.failures++;
      m.failureHistory.push({ timestamp: new Date().toISOString(), latencyMs });
      if (m.failureHistory.length > 100) m.failureHistory.shift();
    }
    m.latencyHistory.push(latencyMs);
    if (m.latencyHistory.length > MAX_HISTORY) m.latencyHistory.shift();
  },

  recordMemory(modelName, memoryMb) {
    const m = ensureModel(modelName);
    m.totalMemoryMb += memoryMb;
    m.memorySamples++;
  },

  recordAccuracy(modelName, score) {
    const m = ensureModel(modelName);
    m.accuracySum += score;
    m.accuracySamples++;
  },

  getStats(modelName) {
    const m = ensureModel(modelName);
    if (!m || m.inferenceCount === 0) {
      return { modelName, status: 'no_data', inferenceCount: 0 };
    }
    const avgLatency = m.totalLatencyMs / m.inferenceCount;
    const failureRate = m.failures / m.inferenceCount;
    const avgMemory = m.memorySamples > 0 ? m.totalMemoryMb / m.memorySamples : null;
    const avgAccuracy = m.accuracySamples > 0 ? m.accuracySum / m.accuracySamples : null;

    const recentLatencies = m.latencyHistory.slice(-100);
    const avgRecentLatency = recentLatencies.length > 0
      ? recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length
      : 0;

    const driftDetected = avgRecentLatency > 0 && avgLatency > 0
      && (avgRecentLatency / avgLatency) > 1.5;

    let health = 'healthy';
    if (failureRate > 0.1) health = 'degraded';
    if (failureRate > 0.3) health = 'unhealthy';

    return {
      modelName,
      status: health,
      inferenceCount: m.inferenceCount,
      avgLatencyMs: Math.round(avgLatency * 100) / 100,
      minLatencyMs: m.minLatencyMs === Infinity ? null : m.minLatencyMs,
      maxLatencyMs: m.maxLatencyMs,
      recentAvgLatencyMs: Math.round(avgRecentLatency * 100) / 100,
      failureRate: Math.round(failureRate * 10000) / 10000,
      totalFailures: m.failures,
      avgMemoryMb: avgMemory ? Math.round(avgMemory * 100) / 100 : null,
      avgAccuracy: avgAccuracy ? Math.round(avgAccuracy * 10000) / 10000 : null,
      driftDetected,
      health,
    };
  },

  getAllStats() {
    const modelNames = Object.keys(metrics);
    const stats = {};
    for (const name of modelNames) {
      stats[name] = this.getStats(name);
    }
    return stats;
  },

  getHealthSummary() {
    const allStats = this.getAllStats();
    const modelNames = Object.keys(allStats);
    const healthy = modelNames.filter((m) => allStats[m].health === 'healthy').length;
    const degraded = modelNames.filter((m) => allStats[m].health === 'degraded').length;
    const unhealthy = modelNames.filter((m) => allStats[m].health === 'unhealthy').length;
    const noData = modelNames.filter((m) => allStats[m].status === 'no_data').length;
    const totalInferences = modelNames.reduce((s, m) => s + (allStats[m].inferenceCount || 0), 0);
    const avgLatencyAll = modelNames.length > 0
      ? modelNames.reduce((s, m) => s + (allStats[m].avgLatencyMs || 0), 0) / modelNames.length
      : 0;

    return {
      totalModels: modelNames.length,
      healthy,
      degraded,
      unhealthy,
      noData,
      totalInferences,
      systemAvgLatencyMs: Math.round(avgLatencyAll * 100) / 100,
      timestamp: new Date().toISOString(),
    };
  },

  resetModel(modelName) {
    if (metrics[modelName]) {
      delete metrics[modelName];
    }
  },

  resetAll() {
    Object.keys(metrics).forEach((k) => delete metrics[k]);
  },
};

module.exports = monitor;
