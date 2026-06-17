const { v4: uuidv4 } = require('uuid');
const { evaluateAnswer } = require('../services/bertService');
const { generateFeedback } = require('../services/llmService');
const { analyzeAudio } = require('../services/audioService');
const { analyzeFrame } = require('../services/visionService');
const { calculateScore } = require('../services/scoringService');
const { fuseFeatures } = require('../utils/crossAttentionFusion');
const { getSkillGraphScore } = require('../utils/skillGraph');
const { processWavBuffer } = require('../services/transcriptionService');

const sessions = {};

exports.createSession = (req, res) => {
  const { name, email, role } = req.body;
  const sessionId = uuidv4();
  sessions[sessionId] = {
    id: sessionId,
    name,
    email,
    role,
    createdAt: new Date(),
    answers: [],
    scores: {},
    feedback: null,
    resumeData: null,
    resumeMatchScore: null,
    emotionHistory: [],
    confidenceHistory: [],
    behaviorHistory: [],
    visionHistory: [],
    audioHistory: [],
    currentQuestionIndex: 0,
  };
  res.json({ sessionId, session: sessions[sessionId] });
};

exports.getSession = (req, res) => {
  const session = sessions[req.params.sessionId];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
};

exports.submitAnswer = async (req, res) => {
  const { sessionId } = req.params;
  const {
    question, answer, questionType,
    emotionData, videoFrame, audioData,
    viTResult, audioFeatures,
  } = req.body;
  const session = sessions[sessionId];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const semanticScore = await evaluateAnswer(question, answer);
  let confidenceScore = 50;

  let audioAnalysis = null;
  if (audioData) {
    try {
      const audioBuffer = Buffer.from(audioData, 'base64');
      audioAnalysis = await analyzeAudio(audioBuffer);
      confidenceScore = audioAnalysis.confidence || 50;
      session.audioHistory.push(audioAnalysis);
    } catch (err) {
      console.warn('Audio analysis failed:', err.message);
    }
  }

  let visionAnalysis = null;
  if (videoFrame) {
    try {
      const imageBuffer = Buffer.from(videoFrame, 'base64');
      visionAnalysis = await analyzeFrame(imageBuffer);
      session.visionHistory.push(visionAnalysis);
    } catch (err) {
      console.warn('ViT frame analysis failed:', err.message);
    }
  }

  const answerRecord = {
    question,
    answer,
    questionType,
    semanticScore,
    confidenceScore,
    emotionData: emotionData || visionAnalysis?.scores || null,
    audioAnalysis,
    visionAnalysis,
    timestamp: new Date(),
  };
  session.answers.push(answerRecord);
  if (emotionData) session.emotionHistory.push(emotionData);
  if (confidenceScore) session.confidenceHistory.push(confidenceScore);

  if (visionAnalysis?.behavior) {
    session.behaviorHistory.push({
      engagementScore: visionAnalysis.confidence * 100,
      attentionSpan: visionAnalysis.behavior === 'attentive' ? 80 : 50,
      behavior: visionAnalysis.behavior,
    });
  }

  session.scores.semantic = semanticScore;
  session.scores.confidence = confidenceScore;

  res.json({
    answerRecord,
    nextQuestion: session.currentQuestionIndex + 1,
    audioAnalysis,
    visionAnalysis,
  });
};

exports.generateFeedback = async (req, res) => {
  const { sessionId } = req.params;
  const session = sessions[sessionId];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const unifiedFeatures = fuseFeatures({
    resume: session.resumeData,
    answers: session.answers,
    emotions: session.emotionHistory,
    confidence: session.confidenceHistory,
    behavior: session.behaviorHistory,
    visionFeatures: session.visionHistory,
    audioFeatures: session.audioHistory,
  });

  const skillGraphResult = getSkillGraphScore(
    session.resumeData?.skills || [],
    session.role || ''
  );

  const scores = calculateScore({
    answers: session.answers,
    resumeMatch: session.resumeMatchScore || skillGraphResult.score || 0,
    skillGraph: skillGraphResult.score || 0,
    unified: unifiedFeatures,
  });

  session.finalScores = scores;

  const feedback = await generateFeedback({
    name: session.name,
    role: session.role,
    answers: session.answers,
    scores,
    resumeData: session.resumeData,
    unifiedFeatures,
  });

  session.feedback = feedback;
  res.json({
    scores,
    feedback,
    skillGraph: skillGraphResult,
    unifiedFeatures: {
      attentionWeights: unifiedFeatures.attentionWeights,
      modalityNames: unifiedFeatures.modalityNames,
      technicalBoost: unifiedFeatures.technicalBoost,
      behaviorScore: unifiedFeatures.behaviorScore,
      emotionScore: unifiedFeatures.emotionScore,
      engagementScore: unifiedFeatures.engagementScore,
    },
  });
};

exports.submitFrame = async (req, res) => {
  const { sessionId } = req.params;
  const { frame } = req.body;
  const session = sessions[sessionId];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  try {
    const imageBuffer = Buffer.from(frame, 'base64');
    const analysis = await analyzeFrame(imageBuffer);
    session.visionHistory.push(analysis);
    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.submitAudioChunk = async (req, res) => {
  const { sessionId } = req.params;
  const { audio } = req.body;
  const session = sessions[sessionId];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  try {
    const audioBuffer = Buffer.from(audio, 'base64');
    const analysis = await analyzeAudio(audioBuffer);
    session.audioHistory.push(analysis);
    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.transcribeAudio = async (req, res) => {
  try {
    let audioBuffer;

    if (req.file && req.file.buffer) {
      audioBuffer = req.file.buffer;
    } else if (req.body && req.body.audio) {
      audioBuffer = Buffer.from(req.body.audio, 'base64');
    } else if (req.body && req.body._buf) {
      audioBuffer = Buffer.from(req.body._buf);
    } else {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    if (audioBuffer.length < 100) {
      return res.status(400).json({ error: 'Audio too short' });
    }

    const options = {
      noiseReductionStrength: req.body.noiseReductionStrength || 0.5,
      language: req.body.language || 'en',
    };

    const result = await processWavBuffer(audioBuffer, options);

    if (result.error) {
      return res.status(422).json({ error: result.error, text: result.text || '', confidence: 0 });
    }

    res.json({
      text: result.text,
      segments: result.segments,
      confidence: result.confidence,
      duration: result.duration,
      wordCount: result.wordCount,
      processingTime: result.processingTime,
      model: result.model,
    });
  } catch (err) {
    console.error('Transcription error:', err.message);
    res.status(500).json({ error: `Transcription failed: ${err.message}`, text: '', confidence: 0 });
  }
};

exports.getQuestions = (req, res) => {
  const { role } = req.query;
  const questions = generateAdaptiveQuestions(role || 'Software Developer');
  res.json({ questions });
};

exports.getSessionAnalytics = (req, res) => {
  const session = sessions[req.params.sessionId];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  res.json({
    totalAnswers: session.answers.length,
    emotionHistory: session.emotionHistory.slice(-30),
    confidenceHistory: session.confidenceHistory.slice(-30),
    visionHistory: session.visionHistory.slice(-20),
    audioHistory: session.audioHistory.slice(-20),
    behaviorHistory: session.behaviorHistory.slice(-20),
    currentQuestionIndex: session.currentQuestionIndex,
  });
};

function generateAdaptiveQuestions(role) {
  const questionBank = {
    'Software Developer': [
      { id: 1, type: 'hr', question: 'Tell me about yourself.' },
      { id: 2, type: 'technical', question: 'Explain React Hooks and their use cases.' },
      { id: 3, type: 'technical', question: 'What is the difference between REST and GraphQL?' },
      { id: 4, type: 'technical', question: 'Explain the concept of virtual DOM.' },
      { id: 5, type: 'behavioral', question: 'Describe a challenging bug you fixed.' },
      { id: 6, type: 'technical', question: 'What are microservices? Explain their pros and cons.' },
      { id: 7, type: 'behavioral', question: 'How do you handle tight deadlines?' },
      { id: 8, type: 'hr', question: 'Where do you see yourself in 5 years?' },
    ],
    'AI/ML Engineer': [
      { id: 1, type: 'hr', question: 'Tell me about yourself.' },
      { id: 2, type: 'technical', question: 'Explain the difference between supervised and unsupervised learning.' },
      { id: 3, type: 'technical', question: 'What is overfitting and how do you prevent it?' },
      { id: 4, type: 'technical', question: 'Explain transformers in NLP.' },
      { id: 5, type: 'behavioral', question: 'Describe an ML project you deployed.' },
      { id: 6, type: 'technical', question: 'What evaluation metrics do you use for classification?' },
      { id: 7, type: 'behavioral', question: 'How do you handle imbalanced datasets?' },
      { id: 8, type: 'hr', question: 'Why are you interested in AI/ML?' },
    ],
    'Data Analyst': [
      { id: 1, type: 'hr', question: 'Tell me about yourself.' },
      { id: 2, type: 'technical', question: 'Explain the difference between SQL and NoSQL databases.' },
      { id: 3, type: 'technical', question: 'What is a p-value in statistics?' },
      { id: 4, type: 'technical', question: 'How do you handle missing data?' },
      { id: 5, type: 'behavioral', question: 'Describe a data-driven decision you influenced.' },
      { id: 6, type: 'technical', question: 'Explain different types of joins in SQL.' },
      { id: 7, type: 'behavioral', question: 'How do you present findings to stakeholders?' },
      { id: 8, type: 'hr', question: 'What tools do you use for data analysis?' },
    ],
    'Cloud Engineer': [
      { id: 1, type: 'hr', question: 'Tell me about yourself.' },
      { id: 2, type: 'technical', question: 'Explain the differences between IaaS, PaaS, and SaaS.' },
      { id: 3, type: 'technical', question: 'What is Docker and how does it work?' },
      { id: 4, type: 'technical', question: 'Explain CI/CD pipeline.' },
      { id: 5, type: 'behavioral', question: 'Describe a cloud migration you worked on.' },
      { id: 6, type: 'technical', question: 'What is Kubernetes and why use it?' },
      { id: 7, type: 'behavioral', question: 'How do you ensure security in the cloud?' },
      { id: 8, type: 'hr', question: 'Which cloud providers are you experienced with?' },
    ],
    'Cyber Security Analyst': [
      { id: 1, type: 'hr', question: 'Tell me about yourself.' },
      { id: 2, type: 'technical', question: 'What is the difference between threat, vulnerability, and risk?' },
      { id: 3, type: 'technical', question: 'Explain the OWASP Top 10.' },
      { id: 4, type: 'technical', question: 'How do you handle a security breach?' },
      { id: 5, type: 'behavioral', question: 'Describe a security incident you resolved.' },
      { id: 6, type: 'technical', question: 'What is encryption and why is it important?' },
      { id: 7, type: 'behavioral', question: 'How do you stay updated on security threats?' },
      { id: 8, type: 'hr', question: 'Why did you choose cybersecurity?' },
    ],
  };
  return questionBank[role] || questionBank['Software Developer'];
}
