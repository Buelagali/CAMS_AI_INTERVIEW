const express = require('express');
const multer = require('multer');
const router = express.Router();
const { sessionLimiter, transcribeLimiter } = require('../middleware/rateLimiter');

const upload = multer({ storage: multer.memoryStorage() });

const {
  createSession,
  getSession,
  submitAnswer,
  generateFeedback,
  getQuestions,
  getNextQuestion,
  submitFrame,
  submitAudioChunk,
  getSessionAnalytics,
  transcribeAudio,
  checkDuplicate,
  transcribeChunk,
} = require('../controllers/interviewController');

router.post('/session', sessionLimiter, createSession);
router.get('/session/:sessionId', getSession);
router.post('/session/:sessionId/answer', submitAnswer);
router.post('/session/:sessionId/feedback', generateFeedback);
router.post('/session/:sessionId/next-question', getNextQuestion);
router.post('/session/:sessionId/frame', submitFrame);
router.post('/session/:sessionId/audio', submitAudioChunk);
router.get('/session/:sessionId/analytics', getSessionAnalytics);
router.get('/questions', getQuestions);
router.post('/check-duplicate', checkDuplicate);
router.post('/transcribe', transcribeLimiter, upload.single('audio'), transcribeAudio);
router.post('/session/:sessionId/transcribe-chunk', upload.single('audio'), transcribeChunk);

module.exports = router;
