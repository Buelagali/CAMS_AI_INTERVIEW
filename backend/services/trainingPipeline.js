const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const modelRegistry = require('../utils/modelRegistry');
const vectorStore = require('../utils/vectorStore');

const TRAINING_DIR = path.join(__dirname, '..', 'training');
const MODELS_DIR = path.join(__dirname, '..', 'models');

const TRAINING_SCRIPTS = {
  embeddings: 'train_embeddings.py',
  whisper: 'train_asr.py',
  wav2vec2: 'train_intent.py',
  vit: 'train_vision.py',
  layoutlm: 'train_docqa.py',
  phi3: 'train_llm.py',
};

let pipelineState = {
  running: false,
  currentJob: null,
  history: [],
  lastRun: null,
};

function validateEnvironment() {
  try {
    const python = process.env.PYTHON_PATH || 'python3';
    const result = execSync(`${python} --version`, { encoding: 'utf-8' });
    logger.info('system', `Python environment: ${result.trim()}`);
    return true;
  } catch (e) {
    logger.warn('system', 'Python not available, training pipeline disabled', { error: e.message });
    return false;
  }
}

const trainingPipeline = {
  async trainModel(modelName, options = {}) {
    if (!TRAINING_SCRIPTS[modelName]) {
      return { success: false, error: `Unknown model: ${modelName}` };
    }
    if (pipelineState.running) {
      return { success: false, error: 'Pipeline already running' };
    }

    const python = process.env.PYTHON_PATH || 'python3';
    const script = path.join(TRAINING_DIR, TRAINING_SCRIPTS[modelName]);
    const configPath = path.join(TRAINING_DIR, 'configs', 'config.yaml');

    if (!fs.existsSync(script)) {
      return { success: false, error: `Training script not found: ${script}` };
    }

    pipelineState.running = true;
    pipelineState.currentJob = { modelName, startedAt: new Date().toISOString() };

    logger.info('system', `Starting training for ${modelName}`);

    return new Promise((resolve) => {
      const args = [script, '--config', configPath];
      if (options.epochs) args.push('--epochs', String(options.epochs));
      if (options.lr) args.push('--lr', String(options.lr));
      if (options.outputDir) args.push('--output_dir', options.outputDir);

      const child = exec(`${python} ${args.join(' ')}`, {
        cwd: TRAINING_DIR,
        maxBuffer: 10 * 1024 * 1024,
        timeout: 3600000,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        logger.debug('system', `[Training ${modelName}] ${data.toString().trim()}`);
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        logger.debug('system', `[Training ${modelName} ERR] ${data.toString().trim()}`);
      });

      child.on('close', (code) => {
        pipelineState.running = false;
        pipelineState.currentJob = null;
        pipelineState.lastRun = new Date().toISOString();

        const success = code === 0;
        const entry = {
          modelName,
          success,
          startedAt: pipelineState.currentJob?.startedAt,
          completedAt: new Date().toISOString(),
          exitCode: code,
          logPreview: stdout.substring(0, 500) + stderr.substring(0, 500),
        };
        pipelineState.history.push(entry);

        if (success) {
          const exportDir = path.join(MODELS_DIR, 'exported', modelName);
          if (fs.existsSync(exportDir)) {
            const files = fs.readdirSync(exportDir).filter((f) => f.endsWith('.onnx'));
            for (const file of files) {
              const filePath = path.join(exportDir, file);
              const stat = fs.statSync(filePath);
              const meta = modelRegistry.registerModel(modelName, {
                path: filePath,
                framework: 'onnx',
                metrics: { fileSize: stat.size, exportedAt: new Date().toISOString() },
                description: `Trained via pipeline at ${new Date().toISOString()}`,
              });
              modelRegistry.activateModel(modelName, meta.id);
              logger.info('system', `Model ${modelName} version ${meta.version} deployed`, { path: filePath });
            }
          }
          logger.info('system', `Training completed successfully for ${modelName}`);
        } else {
          logger.error('system', `Training failed for ${modelName}`, { exitCode: code, stderr: stderr.substring(0, 1000) });
        }

        resolve({ success, exitCode: code, stdout: stdout.substring(0, 2000), stderr: stderr.substring(0, 2000) });
      });

      child.on('error', (err) => {
        pipelineState.running = false;
        pipelineState.currentJob = null;
        logger.error('system', `Training execution error for ${modelName}`, { error: err.message });
        resolve({ success: false, error: err.message });
      });
    });
  },

  async trainAll(options = {}) {
    const results = {};
    for (const modelName of Object.keys(TRAINING_SCRIPTS)) {
      if (options.models && !options.models.includes(modelName)) continue;
      results[modelName] = await this.trainModel(modelName, options);
    }
    return results;
  },

  validateEnvironment() {
    return validateEnvironment();
  },

  isRunning() {
    return pipelineState.running;
  },

  getState() {
    return { ...pipelineState };
  },

  getHistory() {
    return [...pipelineState.history].reverse();
  },

  getTrainingScripts() {
    return { ...TRAINING_SCRIPTS };
  },
};

module.exports = trainingPipeline;
