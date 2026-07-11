const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');

const interviewRoutes = require('./routes/interviewRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const authRoutes = require('./routes/authRoutes');
const { initSessionStore } = require('./utils/sessionStore');
const { apiLimiter, transcribeLimiter, sessionLimiter } = require('./middleware/rateLimiter');
const { setupWebSocket } = require('./utils/websocketHandler');
const { errorMiddleware, notFoundHandler } = require('./middleware/errorHandler');
const { requestId } = require('./middleware/requestId');
const { validate } = require('./middleware/validate');
const logger = require('./utils/logger');
const { detectGPU } = require('./utils/gpuDetector');
const modelRegistry = require('./utils/modelRegistry');
const vectorStore = require('./utils/vectorStore');
const monitoring = require('./utils/modelMonitor');
const scalability = require('./utils/scalability');
const recruiterAnalytics = require('./services/recruiterAnalytics');
const trainingPipeline = require('./services/trainingPipeline');
const enhancedFeedback = require('./services/enhancedFeedback');

const app = express();
const PORT = process.env.PORT || 5001;

const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? CORS_ORIGINS : '*',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestId);

if (process.env.NODE_ENV === 'production') {
  app.use('/api/', apiLimiter);
}

app.use('/api/interview', interviewRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  const mem = scalability.getMemoryUsage();
  const capacity = scalability.getEstimatedCapacity();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    requestId: req.id,
    memory: {
      heapUsed: `${mem.heapUsed}MB`,
      rss: `${mem.rss}MB`,
      systemUsage: `${mem.systemUsage}%`,
    },
    capacity: {
      estimatedMax: capacity.estimatedMaxConcurrent,
      currentConnections: capacity.currentConnections,
      tier: capacity.tier,
    },
    gpu: require('./utils/gpuDetector').getGPUInfo(),
    vectorStore: await_vectorStoreHealth(),
    monitoring: monitoring.getHealthSummary(),
  });
});

async function await_vectorStoreHealth() {
  try {
    return await vectorStore.health();
  } catch { return { ready: false }; }
}

app.get('/api/config', (req, res) => {
  res.json({
    maxAudioSize: '50mb',
    sessionTTL: '2 hours',
    sttModel: 'whisper-large-v3-turbo',
    faceDetection: 'face-api.js + ViT backend',
    tts: 'Web Speech API (en-IN)',
    auth: process.env.JWT_DISABLED === 'true' ? 'disabled' : 'jwt',
    websocket: true,
    gpu: require('./utils/gpuDetector').isGPUAvailable(),
    vectorStore: vectorStore.isReady(),
    modelRegistry: true,
    explainableAI: true,
    semanticMatching: true,
    advancedProctoring: true,
    adaptiveDifficulty: true,
    enhancedFeedback: true,
    monitoring: true,
    livenessProbe: '/api/health',
  });
});

app.get('/api/system/monitoring', (req, res) => {
  res.json({
    models: monitoring.getAllStats(),
    health: monitoring.getHealthSummary(),
    system: scalability.getSystemInfo(),
    vectors: vectorStore.isReady() ? { ready: true } : { ready: false },
  });
});

app.get('/api/system/scalability', (req, res) => {
  res.json(scalability.getEstimatedCapacity());
});

app.get('/api/system/resources', (req, res) => {
  res.json(scalability.getSystemInfo());
});

app.get('/api/models', (req, res) => {
  res.json(modelRegistry.listAllModels());
});

app.get('/api/models/active', (req, res) => {
  const active = {};
  for (const name of ['embeddings', 'whisper', 'wav2vec2', 'vit', 'layoutlm', 'phi3']) {
    const v = modelRegistry.getActiveVersion(name);
    if (v) active[name] = v;
  }
  res.json(active);
});

app.get('/api/models/history', (req, res) => {
  res.json(modelRegistry.getTrainingHistory());
});

app.get('/api/recruiter/insights', (req, res) => {
  res.json(recruiterAnalytics.generateInsights());
});

app.get('/api/recruiter/live', (req, res) => {
  res.json(recruiterAnalytics.getAllLiveSessions());
});

app.get('/api/recruiter/completed', (req, res) => {
  res.json(recruiterAnalytics.getCompletedSessions());
});

app.get('/api/recruiter/ranking', (req, res) => {
  res.json(recruiterAnalytics.getCandidateRanking());
});

app.get('/api/recruiter/recommendations', (req, res) => {
  res.json(recruiterAnalytics.getHiringRecommendations());
});

app.post('/api/training/train/:modelName', async (req, res, next) => {
  try {
    const { modelName } = req.params;
    const result = await trainingPipeline.trainModel(modelName, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

app.post('/api/training/train-all', async (req, res, next) => {
  try {
    const result = await trainingPipeline.trainAll(req.body);
    res.json(result);
  } catch (err) { next(err); }
});

app.get('/api/training/status', (req, res) => {
  res.json(trainingPipeline.getState());
});

app.get('/api/training/history', (req, res) => {
  res.json(trainingPipeline.getHistory());
});

app.get('/api/logs/:category', (req, res, next) => {
  const { category } = req.params;
  const fs = require('fs');
  const path = require('path');
  const logDir = process.env.LOG_DIR || path.join(__dirname, 'logs');
  const logFile = path.join(logDir, `${category}.log`);
  if (fs.existsSync(logFile)) {
    const lines = fs.readFileSync(logFile, 'utf-8').split('\n').filter(Boolean).slice(-100);
    res.json({ category, lines, count: lines.length });
  } else {
    res.json({ category, lines: [], count: 0, message: 'No logs for this category' });
  }
});

app.get('/api/proctoring/events/:sessionId', (req, res) => {
  const { advancedProctoring } = require('./services/advancedProctoring');
  res.json(advancedProctoring.getSessionEvents(req.params.sessionId));
});

app.get('/api/proctoring/report/:sessionId', (req, res) => {
  const { advancedProctoring } = require('./services/advancedProctoring');
  res.json(advancedProctoring.generateEvidenceReport(req.params.sessionId));
});

app.post('/api/feedback/enhanced', async (req, res, next) => {
  try {
    const { scores, answerHistory, metadata } = req.body;
    const result = await enhancedFeedback.generateEnhancedFeedback(scores || {}, answerHistory || [], metadata || {});
    res.json(result);
  } catch (err) { next(err); }
});

app.use(notFoundHandler);
app.use(errorMiddleware);

async function startServer(port) {
  logger.startRotation();
  logger.info('system', 'Starting CAMS backend server', { port, env: process.env.NODE_ENV || 'development' });

  await initSessionStore();
  logger.info('system', 'Session store initialized');

  modelRegistry.init();
  logger.info('system', 'Model registry initialized');

  await vectorStore.init();
  logger.info('system', 'Vector store initialized');

  const gpuInfo = await detectGPU();
  logger.info('system', 'GPU detection complete', gpuInfo);

  const server = http.createServer(app);
  setupWebSocket(server);

  server.listen(port, () => {
    logger.info('system', `CAMS Backend running on port ${port} (${process.env.NODE_ENV || 'development'})`);
    console.log(`CAMS Backend running on port ${port} (${process.env.NODE_ENV || 'development'})`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn('system', `Port ${port} in use, trying ${port + 1}`);
      startServer(port + 1);
    } else {
      logger.error('system', 'Server error', { error: err.message });
      console.error('Server error:', err);
    }
  });

  process.on('SIGTERM', () => {
    logger.info('system', 'SIGTERM received, shutting down');
    server.close(() => {
      logger.stopRotation();
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('system', 'SIGINT received, shutting down');
    server.close(() => {
      logger.stopRotation();
      process.exit(0);
    });
  });

  process.on('uncaughtException', (err) => {
    logger.error('system', 'Uncaught exception', { error: err.message, stack: err.stack });
    console.error('Uncaught exception:', err);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('system', 'Unhandled rejection', { reason: String(reason) });
  });
}

startServer(PORT);
