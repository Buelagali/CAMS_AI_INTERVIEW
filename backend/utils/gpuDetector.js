const logger = require('./logger');

const GPU_PROVIDERS = [
  { name: 'dml', pkg: 'onnxruntime-node', ep: 'dml', platform: 'win32' },
  { name: 'cuda', pkg: 'onnxruntime-node', ep: 'cuda', platform: 'linux' },
  { name: 'rocm', pkg: 'onnxruntime-node', ep: 'rocm', platform: 'linux' },
  { name: 'coreml', pkg: 'onnxruntime-node', ep: 'coreml', platform: 'darwin' },
  { name: 'webgpu', pkg: 'onnxruntime-node', ep: 'webgpu', platform: null },
];

let gpuState = {
  available: false,
  provider: null,
  deviceName: null,
  vram: null,
  benchmark: null,
  fallback: false,
};

async function detectGPU() {
  if (process.env.GPU_DISABLED === 'true') {
    logger.info('system', 'GPU disabled by GPU_DISABLED env var');
    return { available: false, fallback: true };
  }

  const platform = process.platform;
  const candidates = GPU_PROVIDERS.filter(
    (p) => !p.platform || p.platform === platform
  );

  for (const candidate of candidates) {
    try {
      const ort = require('onnxruntime-node');
      if (ort.env && typeof ort.env.getAvailableProviders === 'function') {
        const providers = await ort.env.getAvailableProviders();
        if (providers.includes(candidate.ep)) {
          const result = await benchmarkProvider(ort, candidate.ep);
          if (result.success) {
            gpuState = {
              available: true,
              provider: candidate.ep,
              deviceName: candidate.name,
              vram: result.vram || null,
              benchmark: result.latencyMs || null,
              fallback: false,
            };
            logger.info('system', `GPU detected: ${candidate.name} (${candidate.ep})`, {
              vram: result.vram,
              latencyMs: result.latencyMs,
            });
            return gpuState;
          }
        }
      }
    } catch (e) {
      logger.debug('system', `GPU provider ${candidate.name} not available: ${e.message}`);
    }
  }

  logger.info('system', 'GPU not available, using CPU fallback');
  gpuState = { available: false, provider: null, deviceName: null, vram: null, benchmark: null, fallback: true };
  return gpuState;
}

async function benchmarkProvider(ort, ep) {
  try {
    const start = Date.now();
    const floatData = new Float32Array(1024);
    for (let i = 0; i < floatData.length; i++) floatData[i] = Math.sin(i);

    const tensor = new ort.Tensor('float32', floatData, [1, 1, 32, 32]);
    const session = await ort.InferenceSession.create(
      { dummy: tensor },
      { executionProviders: [ep] }
    );
    const latencyMs = Date.now() - start;

    return { success: true, latencyMs, vram: null };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getExecutionProviders() {
  if (gpuState.available && gpuState.provider) {
    return [gpuState.provider, 'cpu'];
  }
  return ['cpu'];
}

function isGPUAvailable() {
  return gpuState.available;
}

function getGPUInfo() {
  return { ...gpuState };
}

function resetGPUState() {
  gpuState = { available: false, provider: null, deviceName: null, vram: null, benchmark: null, fallback: false };
}

module.exports = { detectGPU, getExecutionProviders, isGPUAvailable, getGPUInfo, resetGPUState };
