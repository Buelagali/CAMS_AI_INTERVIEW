const express = require('express');
const multer = require('multer');
const router = express.Router();

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
} = require('../controllers/interviewController');

router.post('/session', createSession);
router.get('/session/:sessionId', getSession);
router.post('/session/:sessionId/answer', submitAnswer);
router.post('/session/:sessionId/feedback', generateFeedback);
router.post('/session/:sessionId/next-question', getNextQuestion);
router.post('/session/:sessionId/frame', submitFrame);
router.post('/session/:sessionId/audio', submitAudioChunk);
router.get('/session/:sessionId/analytics', getSessionAnalytics);
router.get('/questions', getQuestions);
router.post('/transcribe', upload.single('audio'), transcribeAudio);

module.exports = router;
