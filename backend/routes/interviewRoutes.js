const express = require('express');
const router = express.Router();
const {
  createSession,
  getSession,
  submitAnswer,
  generateFeedback,
  getQuestions,
} = require('../controllers/interviewController');

router.post('/session', createSession);
router.get('/session/:sessionId', getSession);
router.post('/session/:sessionId/answer', submitAnswer);
router.post('/session/:sessionId/feedback', generateFeedback);
router.get('/questions', getQuestions);

module.exports = router;
