const { v4: uuidv4 } = require('uuid');
const { evaluateAnswer } = require('../services/bertService');
const { generateFeedback } = require('../services/llmService');
const { analyzeAudio } = require('../services/audioService');
const { analyzeFrame } = require('../services/visionService');
const { calculateScore } = require('../services/scoringService');
const { fuseFeatures } = require('../utils/crossAttentionFusion');
const { getSkillGraphScore } = require('../utils/skillGraph');
const { processWavBuffer } = require('../services/transcriptionService');
const adaptiveEngine = require('../services/adaptiveEngine');

const sessions = {};

exports.createSession = (req, res) => {
  const { name, email, role, resumeSkills } = req.body;
  const sessionId = uuidv4();

  const skillGapResult = getSkillGraphScore(resumeSkills || [], role || '');
  const adaptiveState = adaptiveEngine.createInitialState({
    role: role || 'Software Developer',
    resumeSkills: resumeSkills || [],
    skillGaps: skillGapResult.skillGap || [],
  });

  sessions[sessionId] = {
    id: sessionId,
    name,
    email,
    role: role || 'Software Developer',
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
    adaptiveState,
    skillGraphResult: skillGapResult,
  };

  res.json({ sessionId, session: sessions[sessionId] });
};

exports.getSession = (req, res) => {
  const session = sessions[req.params.sessionId];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const safeSession = { ...session };
  delete safeSession.adaptiveState;
  res.json(safeSession);
};

exports.submitAnswer = async (req, res) => {
  const { sessionId } = req.params;
  const {
    question, answer, questionType, questionId, difficulty,
    emotionData, videoFrame, audioData,
    viTResult, audioFeatures,
    skill,
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
    questionId: questionId || null,
    difficulty: difficulty || 1,
    skill: skill || null,
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

  const answerHistory = session.answers.map((a) => ({
    questionId: a.questionId,
    text: a.question,
    type: a.questionType,
    score: a.semanticScore,
    skill: a.skill,
  }));

  const technicalScores = session.answers
    .filter((a) => a.questionType === 'technical' || a.questionType === 'adaptive')
    .map((a) => a.semanticScore);

  session.adaptiveState = {
    ...session.adaptiveState,
    answerHistory,
    scores: {
      ...session.adaptiveState.scores,
      technical: technicalScores.length > 0
        ? Math.round(technicalScores.reduce((s, v) => s + v, 0) / technicalScores.length)
        : 0,
      semantic: semanticScore,
      confidence: confidenceScore,
    },
    currentDifficulty: difficulty || session.adaptiveState.currentDifficulty,
    currentQuestionIndex: session.answers.length,
  };

  session.currentQuestionIndex = session.answers.length;

  const isComplete = session.answers.length >= session.adaptiveState.maxQuestions;

  res.json({
    answerRecord,
    nextQuestion: session.currentQuestionIndex + 1,
    audioAnalysis,
    visionAnalysis,
    adaptiveState: {
      currentDifficulty: session.adaptiveState.currentDifficulty,
      currentQuestionIndex: session.adaptiveState.currentQuestionIndex,
      maxQuestions: session.adaptiveState.maxQuestions,
      isComplete,
    },
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

exports.getNextQuestion = async (req, res) => {
  const { sessionId } = req.params;
  const session = sessions[sessionId];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  if (session.answers.length >= session.adaptiveState.maxQuestions) {
    return res.json({ question: null, isComplete: true });
  }

  try {
    const question = await adaptiveEngine.generateQuestion(session.adaptiveState);
    res.json({
      question,
      isComplete: false,
      sessionProgress: {
        answered: session.answers.length,
        total: session.adaptiveState.maxQuestions,
        currentDifficulty: session.adaptiveState.currentDifficulty,
      },
    });
  } catch (err) {
    console.error('Adaptive question generation failed:', err.message);
    res.status(500).json({
      error: 'Failed to generate question',
      question: {
        id: `fallback_${Date.now()}`,
        type: 'technical',
        difficulty: 1,
        text: 'Can you describe a technical project you have worked on recently and the challenges you faced?',
        metadata: { skill: null, rationale: 'Fallback on error', generationMethod: 'fallback' },
      },
    });
  }
};

exports.getQuestions = async (req, res) => {
  const { role, resumeSkills } = req.query;
  const skills = resumeSkills ? resumeSkills.split(',') : [];

  const state = adaptiveEngine.createInitialState({
    role: role || 'Software Developer',
    resumeSkills: skills,
    skillGaps: [],
  });

  const questions = [];
  const tempState = { ...state, answerHistory: [] };
  for (let i = 0; i < 8; i++) {
    try {
      const q = await adaptiveEngine.generateQuestion(tempState);
      questions.push(q);
      tempState.answerHistory.push({
        questionId: q.id,
        text: q.text,
        type: q.type,
        score: 50,
        skill: q.metadata?.skill,
      });
    } catch {
      break;
    }
  }
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
    adaptiveState: {
      currentDifficulty: session.adaptiveState?.currentDifficulty,
      currentQuestionIndex: session.adaptiveState?.currentQuestionIndex,
      maxQuestions: session.adaptiveState?.maxQuestions,
    },
  });
};
