const os = require('os');
const logger = require('./logger');

let config = {
  maxConnections: 10000,
  connectionPoolSize: 50,
  redisCacheTTL: 300,
  enableLazyLoading: true,
  enableStreaming: true,
  maxConcurrentModels: 3,
  modelQueueSize: 100,
};

const memoryThresholds = {
  warn: 0.75,
  critical: 0.9,
};

const activeConnections = new Set();
let requestQueue = [];
let processingCount = 0;

const scalability = {
  configure(opts = {}) {
    config = { ...config, ...opts };
    logger.info('system', 'Scalability configured', config);
  },

  getConfig() {
    return { ...config };
  },

  async acquireModelSlot(modelName) {
    if (processingCount < config.maxConcurrentModels) {
      processingCount++;
      logger.debug('system', `Model slot acquired for ${modelName}`, { activeSlots: processingCount });
      return true;
    }
    return new Promise((resolve) => {
      requestQueue.push({ modelName, resolve });
      if (requestQueue.length > config.modelQueueSize) {
        requestQueue.shift();
        resolve(false);
      }
    });
  },

  releaseModelSlot() {
    processingCount = Math.max(0, processingCount - 1);
    if (requestQueue.length > 0 && processingCount < config.maxConcurrentModels) {
      const next = requestQueue.shift();
      if (next) {
        processingCount++;
        next.resolve(true);
      }
    }
  },

  registerConnection(connectionId) {
    activeConnections.add(connectionId);
    if (activeConnections.size > config.maxConnections) {
      activeConnections.delete(connectionId);
      logger.warn('system', 'Max connections reached, rejecting', { connectionId });
      return false;
    }
    return true;
  },

  unregisterConnection(connectionId) {
    activeConnections.delete(connectionId);
  },

  getActiveConnections() {
    return activeConnections.size;
  },

  getMemoryUsage() {
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      rss: Math.round(mem.rss / 1024 / 1024),
      external: Math.round(mem.external / 1024 / 1024),
      systemTotal: Math.round(totalMem / 1024 / 1024),
      systemFree: Math.round(freeMem / 1024 / 1024),
      systemUsage: Math.round(((totalMem - freeMem) / totalMem) * 10000) / 100,
      processUsage: Math.round((mem.rss / totalMem) * 10000) / 100,
    };
  },

  getCPULoad() {
    const cpus = os.cpus();
    const avgLoad = os.loadavg();
    return {
      cores: cpus.length,
      model: cpus[0]?.model || 'unknown',
      loadAvg1m: Math.round(avgLoad[0] * 100) / 100,
      loadAvg5m: Math.round(avgLoad[1] * 100) / 100,
      loadAvg15m: Math.round(avgLoad[2] * 100) / 100,
      usagePerCore: cpus.map((cpu, i) => {
        const total = Object.values(cpu.times).reduce((s, v) => s + v, 0);
        const idle = cpu.times.idle;
        return {
          core: i,
          usage: Math.round(((total - idle) / total) * 10000) / 100,
        };
      }),
    };
  },

  getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      hostname: os.hostname(),
      uptime: process.uptime(),
      memory: this.getMemoryUsage(),
      cpu: this.getCPULoad(),
      connections: this.getActiveConnections(),
      modelQueueLength: requestQueue.length,
      processingSlots: { active: processingCount, max: config.maxConcurrentModels },
      timestamp: new Date().toISOString(),
    };
  },

  isMemoryCritical() {
    const mem = this.getMemoryUsage();
    return {
      warn: mem.systemUsage / 100 >= memoryThresholds.warn,
      critical: mem.systemUsage / 100 >= memoryThresholds.critical,
      usage: mem.systemUsage,
    };
  },

  async memorySafe(fn, fallback) {
    const mem = this.isMemoryCritical();
    if (mem.critical) {
      logger.warn('system', 'Memory critical, using fallback', { usage: mem.usage });
      return typeof fallback === 'function' ? fallback() : fallback;
    }
    if (mem.warn) {
      logger.warn('system', 'Memory usage high', { usage: mem.usage });
      if (global.gc) {
        global.gc();
        logger.info('system', 'GC forced due to high memory');
      }
    }
    return fn();
  },

  getEstimatedCapacity() {
    const mem = this.getMemoryUsage();
    const cpu = this.getCPULoad();
    const memPerConnection = 10;
    const cpuPerConnection = 0.01;
    const maxByMemory = Math.floor((mem.systemTotal - mem.systemFree) / memPerConnection);
    const maxByCPU = Math.floor(cpu.cores / cpuPerConnection);
    const estimatedMax = Math.min(maxByMemory, maxByCPU, config.maxConnections);

    return {
      estimatedMaxConcurrent: estimatedMax,
      byMemory: maxByMemory,
      byCPU: maxByCPU,
      configured: config.maxConnections,
      currentConnections: this.getActiveConnections(),
      headroom: estimatedMax - this.getActiveConnections(),
      tier: estimatedMax >= 10000 ? '10000+' : estimatedMax >= 5000 ? '5000' : estimatedMax >= 1000 ? '1000' : estimatedMax >= 500 ? '500' : '100',
    };
  },
};

module.exports = scalability;
