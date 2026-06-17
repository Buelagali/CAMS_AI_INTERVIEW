const express = require('express');
const router = express.Router();
const {
  createSession,
  getSession,
  submitAnswer,
  generateFeedback,
  getQuestions,
  submitFrame,
  submitAudioChunk,
  getSessionAnalytics,
} = require('../controllers/interviewController');

router.post('/session', createSession);
router.get('/session/:sessionId', getSession);
router.post('/session/:sessionId/answer', submitAnswer);
router.post('/session/:sessionId/feedback', generateFeedback);
router.post('/session/:sessionId/frame', submitFrame);
router.post('/session/:sessionId/audio', submitAudioChunk);
router.get('/session/:sessionId/analytics', getSessionAnalytics);
router.get('/questions', getQuestions);

module.exports = router;
