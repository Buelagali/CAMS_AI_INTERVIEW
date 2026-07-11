import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QuestionCard from '../components/QuestionCard';
import CameraPreview from '../components/CameraPreview';
import CircularScore from '../components/CircularScore';
import { speakText, stopSpeaking } from '../services/speechService';
import { loadModels, detectEmotion, detectFaces } from '../services/faceDetection';
import {
  startCapture,
  stopCapture,
  isCurrentlyRecording,
  getRecordingDuration,
  forceStopCapture,
} from '../services/audioCapture';
import {
  initWebSpeech,
  startWebSpeech,
  stopWebSpeech,
  resetTranscript,
  getAccumulatedTranscript,
  processFinalTranscript,
  onTranscript,
  onStatus,
  removeListeners,
  onImprovedTranscript,
  setActiveSession,
  startStreamingTranscription,
  stopStreamingTranscription,
  sendStreamingChunk,
} from '../services/sttService';
import {
  calculateAnswerScore,
  calculateCommunicationScore,
  calculateConfidenceFromAnswer,
  getSkillGraph,
  fetchAdaptiveQuestion,
  generateQuestion as localGenerateQuestion,
  exactSkillMatch,
} from '../utils/questionEngine';
import { analyzeEmotionStability } from '../services/emotionStabilityService';

const DIFFICULTY_LABELS = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };
const DIFFICULTY_COLORS = { 1: 'var(--accent-2)', 2: 'var(--accent-4)', 3: 'var(--accent-5)' };

export default function Interview() {
  const navigate = useNavigate();
  const candidate = JSON.parse(sessionStorage.getItem('candidate') || '{}');
  const resumeData = JSON.parse(sessionStorage.getItem('resumeData') || '{}');
  const resumeMatch = JSON.parse(sessionStorage.getItem('resumeMatch') || '{}');

  const [currentQ, setCurrentQ] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [sttStatus, setSttStatus] = useState('');
  const [transcriptionConfidence, setTranscriptionConfidence] = useState(0);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [currentDifficulty, setCurrentDifficulty] = useState(1);
  const [sessionId, setSessionId] = useState(null);
  const [scores, setScores] = useState({
    technical: 0, communication: 0, confidence: 0, behavior: 0,
    resumeMatch: 0, semantic: 0, emotion: 0, overall: 0,
  });
  const [emotion, setEmotion] = useState('Neutral');
  const [emotionScores, setEmotionScores] = useState({});
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [emotionScoresHistory, setEmotionScoresHistory] = useState([]);
  const [faceDetected, setFaceDetected] = useState(true);
  const [confidenceHistory, setConfidenceHistory] = useState([]);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [multiFaceWarnings, setMultiFaceWarnings] = useState(0);
  const [warningMessage, setWarningMessage] = useState('');
  const proctoringRef = useRef({ warningLevel: 0, terminated: false });
  const proctoringIntervalRef = useRef(null);

  const recognitionRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const spokenRef = useRef(false);
  const emotionIntervalRef = useRef(null);
  const memoryRef = useRef(null);
  const audioCaptureRef = useRef(null);
  const currentQuestionRef = useRef(null);

  useEffect(() => {
    initInterviewSession();
  }, []);

  useEffect(() => {
    if (interviewComplete) {
      const proctoringInfo = JSON.parse(sessionStorage.getItem('proctoringTermination') || '{}');
      const delay = proctoringInfo.terminated ? 100 : 1500;
      const timer = setTimeout(() => {
        handleFinish();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [interviewComplete]);

  const initInterviewSession = async () => {
    sessionStorage.removeItem('proctoringTermination');
    try {
      const res = await fetch('/api/interview/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: candidate.name || 'Candidate',
          email: candidate.email || '',
          role: candidate.role || 'Software Developer',
          resumeSkills: resumeData.skills || [],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.sessionId);
        memoryRef.current = { ...data.session.adaptiveState, sessionId: data.sessionId };
        await generateNextQuestion(data.session.adaptiveState);
      } else {
        fallbackInit();
      }
    } catch {
      fallbackInit();
    }
  };

  const fallbackInit = () => {
    const mem = {
      role: candidate.role || 'Software Developer',
      resumeSkills: resumeData.skills || [],
      skillGaps: [],
      answerHistory: [],
      scores: { technical: 0, communication: 0, confidence: 0, semantic: 0 },
      currentDifficulty: 1,
      currentQuestionIndex: 0,
    };
    memoryRef.current = mem;
    generateNextQuestion(mem);
  };

  useEffect(() => {
    initDualPathSTT();
    initCamera();
    loadModels();
    return () => {
      stopSpeaking();
      stopWebSpeech();
      removeListeners();
      if (isCurrentlyRecording()) forceStopCapture();
      if (emotionIntervalRef.current) clearInterval(emotionIntervalRef.current);
      if (proctoringIntervalRef.current) clearInterval(proctoringIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && cameraActive) {
      emotionIntervalRef.current = setInterval(async () => {
        const result = await detectEmotion(videoRef.current);
        setFaceDetected(result.faceDetected);
        setEmotion(result.emotion);
        setEmotionScores(result.scores);
        setEmotionHistory((prev) => [...prev, result.emotion]);
        setEmotionScoresHistory((prev) => [...prev, result.scores]);
        setConfidenceHistory((prev) => {
          return [...prev, Math.round(result.score * 100)];
        });
      }, 1000);
    }
    return () => {
      if (emotionIntervalRef.current) clearInterval(emotionIntervalRef.current);
    };
  }, [cameraActive]);

  useEffect(() => {
    if (!cameraActive || proctoringRef.current.terminated || interviewComplete) return;

    const CONFIRM_FRAMES = 5;
    let streak = 0;

    const messages = {
      1: 'Multiple faces detected. Please ensure only the candidate is visible.',
      2: 'Multiple faces detected again. This interview requires only one candidate to remain in front of the camera.',
      3: 'Third warning: Multiple faces detected repeatedly. The interview will be terminated on the next occurrence.',
      4: 'Final Warning: Multiple faces persist. The interview is being terminated.',
    };

    const intervalId = setInterval(async () => {
      if (!videoRef.current || proctoringRef.current.terminated) {
        clearInterval(intervalId);
        return;
      }

      const result = await detectFaces(videoRef.current);
      const multiFace = result.faceCount > 1;

      if (multiFace) {
        streak++;

        if (proctoringRef.current.warningLevel >= 4) {
          if (streak >= CONFIRM_FRAMES && !proctoringRef.current.terminated) {
            terminateForProctoring();
            clearInterval(intervalId);
          }
        } else if (streak >= CONFIRM_FRAMES) {
          const level = ++proctoringRef.current.warningLevel;
          setMultiFaceWarnings(level);
          setWarningMessage(messages[level]);
          setTimeout(() => setWarningMessage(''), 6000);
          streak = 0;
        }
      } else {
        if (proctoringRef.current.warningLevel > 0) {
          proctoringRef.current.warningLevel = 0;
          setMultiFaceWarnings(0);
        }
        streak = 0;
      }
    }, 500);

    proctoringIntervalRef.current = intervalId;

    return () => clearInterval(intervalId);
  }, [cameraActive, interviewComplete]);

  useEffect(() => {
    if (currentQuestion && !interviewComplete) {
      const timer = setTimeout(() => speakCurrentQuestion(), 300);
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, currentQ, interviewComplete]);

  const generateNextQuestion = async (mem) => {
    const m = mem || memoryRef.current;
    if (!m) return;
    setQuestionLoading(true);

    if (sessionId) {
      try {
        const data = await fetchAdaptiveQuestion(sessionId);
        if (data.isComplete) {
          setInterviewComplete(true);
          setQuestionLoading(false);
          sessionStorage.setItem('terminationReason', data.terminationReason || 'I have collected sufficient evidence to complete the assessment.');
          return;
        }
        if (data.question) {
          const q = data.question;
          currentQuestionRef.current = q;
          setCurrentQuestion(q);
          setCurrentQ(m.currentQuestionIndex || 0);
          setCurrentDifficulty(q.difficulty || 1);
          if (data.sessionProgress) {
            setCurrentDifficulty(data.sessionProgress.currentDifficulty);
          }
          setQuestionLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Backend adaptive question failed, using fallback:', err.message);
      }
    }

    const questionCount = (m.currentQuestionIndex || 0);

    const askedTexts = new Set((m.answerHistory || []).map((a) => (a.text || '').toLowerCase().trim()));

    if (questionCount >= 6) {
      const allAnswerScores = answers.map((a) => a.score || 0);
      const avgPerf = allAnswerScores.length > 0
        ? allAnswerScores.reduce((s, v) => s + v, 0) / allAnswerScores.length
        : 50;
      const poorCount = allAnswerScores.filter((s) => s < 35).length;
      const poorRatio = allAnswerScores.length > 0 ? poorCount / allAnswerScores.length : 0;
      const idkCount = answers.filter((a) => {
        const t = (a.answer || '').trim().toLowerCase();
        return /^(no|nah|nope|i don'?t know|not sure|i have no idea|i can'?t answer|pass|skip)/.test(t);
      }).length;
      const techAvg = m.scores?.technical || 0;
      const commAvg = m.scores?.communication || 0;
      const confAvg = m.scores?.confidence || 0;
      const allStable = techAvg > 0 && commAvg > 0 && confAvg > 0;

      const isWeak = (avgPerf < 40 && poorRatio > 0.35) || (idkCount >= 3 && avgPerf < 50);
      const isStrong = avgPerf >= 65 && allStable;
      const isVeryStrong = avgPerf >= 80 && allStable;
      const hasVariety = new Set(answers.map((a) => a.questionType || '')).size >= 3;
      const hasDepth = questionCount >= 6;

      const recent = allAnswerScores.slice(-Math.min(5, allAnswerScores.length));
      const earlier = allAnswerScores.slice(0, Math.max(2, Math.floor(allAnswerScores.length / 2)));
      const recentAvg = recent.length > 0 ? recent.reduce((s, v) => s + v, 0) / recent.length : 0;
      const earlierAvg = earlier.length > 0 ? earlier.reduce((s, v) => s + v, 0) / earlier.length : 0;
      const trend = recentAvg > earlierAvg + 10 ? 'improving' : earlierAvg > recentAvg + 10 ? 'declining' : 'stable';

      const variance = allAnswerScores.reduce((s, v) => s + (v - avgPerf) ** 2, 0) / allAnswerScores.length;
      const stdDev = Math.sqrt(variance);
      const stability = stdDev < 15 ? 'stable' : stdDev < 25 ? 'moderate' : 'volatile';
      const stabilityScore = stability === 'stable' ? 1.0 : stability === 'moderate' ? 0.6 : 0.2;
      const varietyScore = hasVariety ? 0.15 : 0;
      const depthScore = hasDepth ? 0.1 : 0;
      const countScore = Math.min(1, questionCount / 15);
      const trendScore = trend === 'improving' ? 0.08 : trend === 'declining' ? -0.05 : 0;
      const evaluationConfidence = Math.min(1, countScore * 0.25 + varietyScore + depthScore + stabilityScore * 0.15 + Math.max(0, trendScore));

      if (isVeryStrong && hasVariety && questionCount >= 8 && evaluationConfidence >= 0.6) {
        setInterviewComplete(true);
        setQuestionLoading(false);
        sessionStorage.setItem('terminationReason', 'Excellent. I have a clear picture of your capabilities. Thank you for the insightful conversation.');
        return;
      }

      if (isStrong && hasVariety && hasDepth && questionCount >= 8 && evaluationConfidence >= 0.65) {
        setInterviewComplete(true);
        setQuestionLoading(false);
        sessionStorage.setItem('terminationReason', 'Thank you. I have sufficient information to complete the evaluation. Well done.');
        return;
      }

      if (isStrong && questionCount >= 12) {
        setInterviewComplete(true);
        setQuestionLoading(false);
        sessionStorage.setItem('terminationReason', 'I appreciate your detailed responses. I now have enough to complete the assessment.');
        return;
      }

      if (isWeak && questionCount >= 7 && evaluationConfidence >= 0.45) {
        setInterviewComplete(true);
        setQuestionLoading(false);
        sessionStorage.setItem('terminationReason', 'Thank you for your time. I have gathered sufficient information to complete the evaluation.');
        return;
      }

      if (hasVariety && hasDepth && questionCount >= 10 && evaluationConfidence >= 0.65) {
        setInterviewComplete(true);
        setQuestionLoading(false);
        sessionStorage.setItem('terminationReason', 'I have collected sufficient responses for a comprehensive evaluation. Thank you.');
        return;
      }

      if (hasDepth && questionCount >= 14 && evaluationConfidence >= 0.55) {
        setInterviewComplete(true);
        setQuestionLoading(false);
        sessionStorage.setItem('terminationReason', 'I have gathered sufficient evidence for a thorough evaluation.');
        return;
      }

      if (questionCount >= 18) {
        setInterviewComplete(true);
        setQuestionLoading(false);
        sessionStorage.setItem('terminationReason', 'I have gathered sufficient information for a thorough evaluation. Thank you for your detailed responses.');
        return;
      }
    }

    const interviewMemory = {
      askedQuestions: (m.answerHistory || []).map((a) => ({
        id: a.questionId || a.text,
        text: a.text,
        type: a.type,
      })),
      answers: answers,
      scores: m.scores || { technical: 0, communication: 0, confidence: 0, semantic: 0 },
      questionCount,
      role: m.role || candidate.role,
    };

    const commonFallback = 'Can you describe a technical project you have worked on recently and the challenges you faced?';
    if (askedTexts.has(commonFallback.toLowerCase())) {
      setInterviewComplete(true);
      setQuestionLoading(false);
      sessionStorage.setItem('terminationReason', 'I have collected sufficient evidence to complete the assessment.');
      return;
    }

    const localQ = await localGenerateQuestion({
      role: m.role || candidate.role,
      resumeSkills: m.resumeSkills || resumeData.skills || [],
      resumeProjects: resumeData.projects || [],
      resumeExperience: resumeData.experience || 0,
      interviewMemory,
      currentEmotion: emotion,
    });
    const q = localQ || {
      id: `fallback_${Date.now()}`,
      type: 'technical',
      difficulty: Math.min(3, (m.currentDifficulty || 1)),
      text: commonFallback,
      metadata: { skill: null, rationale: 'Last resort fallback', generationMethod: 'fallback' },
    };
    currentQuestionRef.current = q;
    setCurrentQuestion(q);
    setCurrentQ(questionCount);
    setCurrentDifficulty(q.difficulty || (m.currentDifficulty || 1));
    setQuestionLoading(false);
  };

  const initDualPathSTT = () => {
    const wsInitialized = initWebSpeech();

    onTranscript((text, isInterim) => {
      setTranscript(text);
    });

    onImprovedTranscript((text, isInterim, confidence) => {
      setTranscript(text);
      if (confidence && confidence.overall) {
        setTranscriptionConfidence(confidence.overall);
      }
      setSttStatus(isInterim ? 'Backend streaming transcription...' : 'Transcription complete');
    });

    onStatus((status) => {
      if (status.type === 'listening') {
        setSttStatus('Listening via speech recognition...');
      } else if (status.type === 'transcribed') {
        setSttStatus(`Backend transcription complete (${status.confidence}% confidence)`);
        setTranscriptionConfidence(status.confidence);
      } else if (status.type === 'streaming') {
        setSttStatus(`Backend streaming (${status.confidence}% confidence)`);
        setTranscriptionConfidence(status.confidence);
      } else if (status.type === 'fallback') {
        setSttStatus('Using browser speech recognition (backend unavailable)');
      } else if (status.type === 'error') {
        setSttStatus(`STT notice: ${status.error}`);
      }
    });

    return wsInitialized;
  };

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraActive(false);
    }
  };

  const speakCurrentQuestion = () => {
    if (!currentQuestion) return;
    setIsSpeaking(true);
    speakText(currentQuestion.text, () => setIsSpeaking(false));
  };

  const toggleListening = async () => {
    if (isListening) {
      setIsListening(false);
      setSttStatus('Processing speech...');

      stopStreamingTranscription();
      stopWebSpeech();

      let audioResult = null;
      if (isCurrentlyRecording()) {
        audioResult = await stopCapture();
      }

      if (audioResult && audioResult.blob && audioResult.blob.size > 100) {
        setIsTranscribing(true);
        setSttStatus('Sending to Whisper for improved transcription...');

        const result = await processFinalTranscript(audioResult, {
          noiseReductionStrength: 0.5,
          language: 'en',
        });

        setIsTranscribing(false);

        if (result.text && !result.fallback) {
          setTranscript(result.text);
          setTranscriptionConfidence(result.confidence);
          setSttStatus(`Transcription improved (${result.confidence}% confidence)`);
        } else if (result.text) {
          setTranscript(result.text);
          setTranscriptionConfidence(result.confidence || 45);
          setSttStatus(result.fallback ? 'Using browser speech result' : 'Transcription complete');
        }
      } else {
        const wsText = getAccumulatedTranscript();
        if (wsText) {
          setTranscript(wsText);
        }
        setSttStatus('');
      }
    } else {
      setTranscript('');
      resetTranscript();
      setIsListening(true);
      setSttStatus('Listening...');
      setTranscriptionConfidence(0);
      setIsTranscribing(false);
      setActiveSession(sessionId);

      startWebSpeech();
      startStreamingTranscription(null, sessionId);

      try {
        const captureResult = await startCapture({
          noiseGate: true,
          noiseGateThreshold: 0.002,
          autoNormalize: true,
          onChunk: (chunk) => {
            if (sessionId && chunk.blob && chunk.blob.size > 100) {
              sendStreamingChunk(chunk.blob, sessionId);
            }
          },
        });
        audioCaptureRef.current = captureResult;
      } catch (err) {
        console.warn('Audio capture not available, using Web Speech only:', err.message);
      }
    }
  };

  const terminateForProctoring = () => {
    if (proctoringRef.current.terminated) return;
    proctoringRef.current.terminated = true;

    stopSpeaking();
    stopStreamingTranscription();
    stopWebSpeech();
    if (isCurrentlyRecording()) forceStopCapture();
    setQuestionLoading(false);

    const log = {
      terminated: true,
      terminationReason: 'Multiple faces were continuously detected during the interview.',
      terminationType: 'Proctoring Rule Violation',
      timestamp: new Date().toISOString(),
      warningCount: proctoringRef.current.warningLevel,
    };

    sessionStorage.setItem('proctoringTermination', JSON.stringify(log));

    setTimeout(() => {
      setInterviewComplete(true);
    }, 100);
  };

  const submitAnswer = useCallback(async () => {
    if (!transcript.trim() || isProcessing || !currentQuestion) return;
    setIsProcessing(true);
    setIsListening(false);
    stopWebSpeech();

    const sttConfidence = transcriptionConfidence > 0 ? transcriptionConfidence : 50;
    const confidenceScore = Math.round(
      calculateConfidenceFromAnswer(transcript, emotion) * 0.6 +
      sttConfidence * 0.4
    );
    const semanticScore = calculateAnswerScore({
      questionText: currentQuestion.text,
      answerText: transcript,
      questionType: currentQuestion.type,
      difficulty: currentQuestion.difficulty,
      emotionState: emotion,
      confidenceScore,
    });
    const commScore = calculateCommunicationScore(transcript);

    const submittedEntry = {
      questionId: currentQuestion.id,
      question: currentQuestion.text,
      questionType: currentQuestion.type,
      difficulty: currentQuestion.difficulty,
      skill: currentQuestion.metadata?.skill || null,
      answer: transcript,
      score: semanticScore,
      confidence: confidenceScore,
      communication: commScore,
      emotion: emotion,
      timestamp: Date.now(),
    };

    if (sessionId) {
      try {
        const res = await fetch(`/api/interview/session/${sessionId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: currentQuestion.text,
            answer: transcript,
            questionType: currentQuestion.type,
            questionId: currentQuestion.id,
            difficulty: currentQuestion.difficulty,
            skill: currentQuestion.metadata?.skill || null,
            emotionData: emotionScores,
          }),
        });
        const result = await res.json();
        if (result.adaptiveState?.isComplete) {
          setInterviewComplete(true);
          sessionStorage.setItem('terminationReason', result.adaptiveState.terminationReason || 'Sufficient evidence collected');
          setIsProcessing(false);
          return;
        }
      } catch (err) {
        console.warn('Failed to submit answer to backend:', err.message);
      }
    }

    const newAnswers = [...answers, submittedEntry];
    setAnswers(newAnswers);
    setConfidenceHistory((prev) => [...prev, confidenceScore]);

    const mem = memoryRef.current || {
      role: candidate.role,
      resumeSkills: resumeData.skills || [],
      skillGaps: [],
      answerHistory: [],
      scores: { technical: 0, communication: 0, confidence: 0, semantic: 0 },
      currentDifficulty: 1,
      currentQuestionIndex: 0,
    };

    mem.answerHistory = (mem.answerHistory || []).concat([{
      questionId: currentQuestion.id,
      text: currentQuestion.text,
      type: currentQuestion.type,
      score: semanticScore,
      skill: currentQuestion.metadata?.skill || null,
    }]);
    mem.currentQuestionIndex = (mem.currentQuestionIndex || 0) + 1;

    const techScores = newAnswers
      .filter((a) => a.questionType === 'technical' || a.questionType === 'adaptive')
      .map((a) => a.score);
    const allScores = newAnswers.map((a) => a.score);
    const allComm = newAnswers.map((a) => a.communication);
    const allConf = newAnswers.map((a) => a.confidence);

    mem.scores = {
      technical: techScores.length > 0
        ? Math.round(techScores.reduce((s, v) => s + v, 0) / techScores.length) : 0,
      communication: allComm.length > 0
        ? Math.round(allComm.reduce((s, v) => s + v, 0) / allComm.length) : 0,
      confidence: allConf.length > 0
        ? Math.round(allConf.reduce((s, v) => s + v, 0) / allConf.length) : 0,
      semantic: allScores.length > 0
        ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length) : 0,
    };
    mem.skillGaps = mem.skillGaps || [];

    memoryRef.current = mem;

    const newScores = { ...scores };
    newScores.technical = mem.scores.technical;
    newScores.semantic = mem.scores.semantic;
    newScores.communication = mem.scores.communication;
    newScores.confidence = mem.scores.confidence;

    const avgEmotion = confidenceHistory.length > 0
      ? Math.round(confidenceHistory.reduce((a, b) => a + b, 0) / confidenceHistory.length)
      : 50;
    newScores.behavior = avgEmotion;
    newScores.emotion = avgEmotion;
    setCurrentDifficulty(mem.currentDifficulty);
    setScores(newScores);

    setScoreHistory((prev) => [...prev, { qNumber: newAnswers.length, technical: newScores.technical, semantic: semanticScore, confidence: confidenceScore }]);

    setTranscript('');
    await generateNextQuestion(mem);
    setIsProcessing(false);
  }, [transcript, currentQuestion, isProcessing, answers, scores, emotion, confidenceHistory, emotionScores, candidate.role, resumeData, transcriptionConfidence, sessionId]);

  const handleFinish = () => {
    const totalQuestions = answers.length;
    const role = candidate.role;

    /* ── Utility Helpers ── */
    function avg(arr) { return arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0; }
    function stdDev(arr) {
      if (arr.length < 2) return 0;
      const m = avg(arr);
      return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
    }
    function clamp(v, min, max) { return Math.round(Math.min(max, Math.max(min, v))); }
    function describeScore(score) {
      return score >= 85 ? 'Exceptional' : score >= 70 ? 'Strong' : score >= 55 ? 'Satisfactory' : score >= 40 ? 'Below Average' : 'Weak';
    }
    function pickTop(arr, n) {
      if (arr.length <= n) return [...arr];
      const byLength = [...arr].sort((a, b) => b.length - a.length);
      const unique = [...new Set(byLength)];
      return unique.slice(0, n);
    }

    /* ── 1. Language Detection ── */
    const TELUGU_RE = /[\u0C00-\u0C7F]/;
    function detectLanguage(text) {
      if (!text || !text.trim()) return 'none';
      return TELUGU_RE.test(text) ? (/[a-zA-Z]/.test(text) ? 'telugu-english-mixed' : 'telugu') : 'english';
    }

    /* ── 2. Poor Quality Detection ── */
    const POOR_PATTERNS = [
      /^no$/i, /^nah$/i, /^nope$/i, /^naaku teliyadhu/i,
      /^i don'?t know$/i, /^i'?m not sure$/i, /^not sure$/i,
      /^i have no idea$/i, /^i don'?t understand$/i, /^i can'?t answer$/i,
      /^pass$/i, /^skip$/i, /^next$/i,
    ];
    function isPoorQuality(text) {
      if (!text || !text.trim()) return { poor: true, reason: 'No answer provided', type: 'empty' };
      const t = text.trim();
      if (t.length < 3 || t.split(/\s+/).filter(Boolean).length <= 2) return { poor: true, reason: 'Answer too short (' + t.length + ' chars)', type: 'too-short' };
      for (const p of POOR_PATTERNS) { if (p.test(t)) return { poor: true, reason: 'Unanswered: "' + t + '"', type: 'unanswered' }; }
      return { poor: false, reason: '', type: 'acceptable' };
    }

    /* ── 3. Grammar Quality ── */
    function countGrammarIssues(text) {
      if (!text) return 0;
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 2);
      let issues = 0;
      for (const s of sentences) {
        const t = s.trim();
        if (/^[a-z]/.test(t)) issues++;
        const words = t.toLowerCase().split(/\s+/).filter(Boolean);
        for (let i = 1; i < words.length; i++) { if (words[i] === words[i - 1]) { issues++; break; } }
        if (words.length > 35) issues++;
        const hasVerb = /\b(is|are|was|were|have|has|had|do|does|did|can|could|will|would|shall|should|may|might|must|been|being|am)\b/i.test(t);
        if (!hasVerb && words.length <= 6 && words.length > 0) issues++;
      }
      return issues;
    }

    /* ── 4. Spelling Errors ── */
    const COMMON_MISTAKES = [
      'teh','recieve','acheive','definately','seperate','goverment','occured','occuring',
      'oportunity','oppertunity','environemnt','becuase','beleive','belive','calender',
      'carreer','commitee','concious','curiousity','embarass','familar','foriegn','fourty',
      'freind','genuine','harrass','immediately','independant','interupt','knowlege','liason',
      'maintainence','managment','neccessary','nieghbor','noticable','occassion','occurance',
      'paralel','perseverence','personel','posession','prefered','priviledge','pronounciation',
      'publicly','reccomend','refered','relevent','repetition','responsability','rhythm','sence',
      'separate','sieze','similiar','speach','successfull','tendancy','tommorow','truely',
      'untill','vaccum','wich','writen','accross','addres','alot','allready','alright','altho',
      'ammount','anual','appologize','aquire','begining','bizzare','busness','camoflage',
      'catagory','changeing','cheif','citizen','collossal','comited','comparision',
    ];
    function countSpellingErrors(text) {
      if (!text) return 0;
      return text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean).filter(w => w.length > 2 && COMMON_MISTAKES.includes(w)).length;
    }

    /* ── 5. Answer Quality Classification (purely evidence-based, no base floor) ── */
    const fillerWords = ['um', 'uh', 'like', 'basically', 'actually', 'sort of', 'kind of', 'you know', 'i mean', 'well'];
    function classifyAnswer(answerText, questionText) {
      const text = (answerText || '').trim();
      const q = (questionText || '').trim();
      if (!text) return { grade: 'No Answer', score: 0 };

      const poor = isPoorQuality(text);
      if (poor.poor) return { grade: 'Poor', score: poor.type === 'unanswered' ? 15 : 12, reason: poor.reason };

      const words = text.split(/\s+/).filter(Boolean);
      const wc = words.length;
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 2);
      const avgWPS = sentences.length > 0 ? wc / sentences.length : wc;

      if (wc <= 5) return { grade: 'Poor', score: Math.max(10, 2 * wc), reason: 'Very short (' + wc + ' words)' };
      if (wc <= 10) return { grade: 'Weak', score: Math.max(18, 3 * wc), reason: 'Brief (' + wc + ' words)' };

      const uv = new Set(words.map(w => w.toLowerCase())).size;
      const vocabRatio = uv / wc;
      const fillerCount = fillerWords.filter(fw => text.toLowerCase().includes(fw)).length;
      const hasRelevance = q.length > 3 && q.split(/\s+/).filter(Boolean).some(qw => qw.length > 3 && text.toLowerCase().includes(qw.toLowerCase()));
      const hasTelugu = TELUGU_RE.test(text);
      const spellErrors = countSpellingErrors(text);
      const grammarIssues = countGrammarIssues(text);

      let s = 0;
      if (wc >= 50) s += 25; else if (wc >= 25) s += 18; else if (wc >= 15) s += 10; else if (wc >= 11) s += 4;
      if (sentences.length >= 2 && avgWPS >= 5 && avgWPS <= 22) s += 18; else if (sentences.length >= 1 && avgWPS < 5) s -= 5;
      if (vocabRatio >= 0.70) s += 15; else if (vocabRatio >= 0.50) s += 8; else if (vocabRatio < 0.35) s -= 5;
      if (fillerCount === 0) s += 10; else if (fillerCount <= 3) s += 4; else s -= 8;
      if (hasRelevance) s += 15; else s -= 10;
      if (spellErrors === 0 && wc >= 10) s += 8; else if (spellErrors > 2) s -= 10;
      if (grammarIssues === 0 && sentences.length >= 2) s += 8; else if (grammarIssues > 2) s -= 8;
      if (hasTelugu) s = Math.min(s, 35);

      const fs = clamp(s, 0, 100);
      const grade = fs >= 80 ? 'Excellent' : fs >= 60 ? 'Good' : fs >= 40 ? 'Average' : fs >= 20 ? 'Weak' : 'Poor';
      return { grade, score: fs };
    }

    /* ── 6. Classify All Answers ── */
    const classified = answers.map(a => {
      const lang = detectLanguage(a.answer || '');
      const poor = isPoorQuality(a.answer || '');
      const cls = classifyAnswer(a.answer || '', a.question || '');
      const wc = (a.answer || '').split(/\s+/).filter(Boolean).length;
      return { ...a, lang, poor, cls, wc };
    });

    /* ── 7. Aggregate Metrics ── */
    const poorOrEmpty = classified.filter(a => a.cls.grade === 'Poor' || a.cls.grade === 'No Answer').length;
    const weakCount = classified.filter(a => a.cls.grade === 'Weak').length;
    const goodCount = classified.filter(a => a.cls.grade === 'Excellent' || a.cls.grade === 'Good').length;
    const nonEng = classified.filter(a => a.lang !== 'english' && a.lang !== 'none').length;
    const idkExact = classified.filter(a => {
      const t = (a.answer || '').trim().toLowerCase();
      return /^(no|nah|nope|naaku teliyadhu|i don'?t know|not sure|i have no idea|i can'?t answer|pass|skip|next|i don'?t understand)/.test(t) || t.length < 3;
    }).length;
    const techAnswers = classified.filter(a => a.questionType === 'technical' || a.questionType === 'adaptive');
    const behAnswers = classified.filter(a => a.questionType === 'behavioral');

    /* ── 8. Communication Score (pure avg of per-answer evidence, no group penalties) ── */
    const commPerAnswer = classified.map(a => {
      let base = a.cls.score;
      if (a.lang === 'telugu') base = Math.min(base, 18);
      else if (a.lang === 'telugu-english-mixed') base = Math.min(base, 30);
      const t = (a.answer || '').trim().toLowerCase();
      if (/^(no|nah|nope)$/.test(t)) base = Math.min(base, 12);
      else if (/^(i don'?t know|naaku teliyadhu|not sure|i have no idea|i can'?t answer)$/.test(t)) base = Math.min(base, 15);
      return clamp(base, 0, 100);
    });
    const communication = commPerAnswer.length > 0 ? Math.round(avg(commPerAnswer)) : 0;

    /* ── 9. Technical Score ── */
    let technical = 0;
    if (techAnswers.length > 0) {
      const rawTech = avg(techAnswers.map(a => a.score));
      const techPoor = techAnswers.filter(a => a.cls.grade === 'Poor' || a.cls.grade === 'No Answer').length;
      const techWeak = techAnswers.filter(a => a.cls.grade === 'Weak').length;
      const techIdk = techAnswers.filter(a => {
        const t = (a.answer || '').trim().toLowerCase();
        return /^(no|nah|nope|naaku teliyadhu|i don'?t know|not sure|i have no idea|i can'?t answer)/.test(t) || t.length < 3;
      }).length;
      let t = rawTech;
      t -= techPoor * 12;
      t -= techWeak * 6;
      t -= techIdk * 8;
      technical = clamp(t, 0, 100);
    }

    /* ── 10. Confidence Score ── */
    const confVals = classified.map(a => a.confidence).filter(c => c != null);
    const rawConf = confVals.length > 0 ? avg(confVals) : 0;
    const confStab = confVals.length >= 2 ? Math.max(0, 100 - stdDev(confVals) * 1.5) : (confVals.length === 1 ? 50 : 0);
    const fillerPenalty = Math.min(20, classified.filter(a => fillerWords.some(fw => (a.answer || '').toLowerCase().includes(fw))).length * 3);
    const sttPenalty = (typeof transcriptionConfidence !== 'undefined' && transcriptionConfidence > 0 && transcriptionConfidence < 50) ? 10 : 0;
    const confidence = clamp(rawConf * 0.4 + confStab * 0.2 - fillerPenalty - sttPenalty, 0, 100);

    /* ── 11. Behavioral Score ── */
    const rawBeh = behAnswers.length > 0 ? avg(behAnswers.map(a => a.score)) : 0;
    const behCoverage = Math.min(1, behAnswers.length / 3);
    const teamworkWords = ['team', 'collaborat', 'together', 'group', 'peer', 'mentor', 'help', 'support', 'share', 'communicat'];
    const leaderWords = ['lead', 'managed', 'mentor', 'guide', 'direct', 'own', 'initiat', 'responsible', 'drove'];
    const twCount = classified.filter(a => teamworkWords.some(w => (a.answer || '').toLowerCase().includes(w))).length;
    const ldCount = classified.filter(a => leaderWords.some(w => (a.answer || '').toLowerCase().includes(w))).length;
    const behavior = behAnswers.length > 0
      ? clamp(rawBeh * 0.5 + behCoverage * 20 + Math.min(8, twCount * 1.5 + ldCount * 1.5), 0, 100)
      : clamp(behCoverage * 15, 0, 50);

    /* ── 12. Emotional Analysis (full-timeline, evidence-backed) ── */
    const emotionAnalysis = analyzeEmotionStability({
      emotionHistory,
      emotionScoresHistory,
      confidenceHistory,
      answers: classified,
    });
    const emotion = emotionAnalysis.score;
    const dominantEmotion = (() => {
      const counts = {};
      emotionHistory.forEach(e => { counts[e] = (counts[e] || 0) + 1; });
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Neutral';
    })();
    const stressLvl = emotionHistory.length > 0
      ? emotionHistory.filter(e => ['Nervous', 'Angry', 'Sad'].includes(e)).length / emotionHistory.length
      : 0;
    const engagement = emotionHistory.length > 0
      ? Math.round(emotionHistory.filter(e => ['Happy', 'Confident', 'Neutral'].includes(e)).length / emotionHistory.length * 70 + 15)
      : 0;

    /* ── 13. Resume Matching ── */
    const roleSkillsList = getSkillGraph(role) || [];
    const candidateSkillsList = resumeData.skills || [];
    const matchedSkills = roleSkillsList.filter(s => candidateSkillsList.some(cs => exactSkillMatch(cs, s)));
    const missingSkills = roleSkillsList.filter(s => !candidateSkillsList.some(cs => exactSkillMatch(cs, s)));
    const roleMatchScore = Math.round((matchedSkills.length / Math.max(roleSkillsList.length, 1)) * 100);
    const discussedSkills = new Set();
    classified.forEach(a => { roleSkillsList.forEach(s => { if ((a.answer || '').toLowerCase().includes(s.toLowerCase())) discussedSkills.add(s); }); });
    const discussedRatio = matchedSkills.length > 0 ? [...matchedSkills].filter(s => discussedSkills.has(s)).length / matchedSkills.length : 0;
    const resumeMatchScore = Math.round((resumeMatch.matchScore || roleMatchScore) * 0.35 + roleMatchScore * 0.35 + discussedRatio * 30);

    /* ── 14. Evidence Strings ── */
    const avgWc = avg(classified.map(a => a.wc));
    const evidence = {};

    const commReasons = [];
    if (idkExact > 0) commReasons.push(idkExact + ' answer(s) consisted of "I don\'t know", "No", or similar with no meaningful content.');
    if (poorOrEmpty > 0) commReasons.push(poorOrEmpty + ' answer(s) were poor quality or empty.');
    if (nonEng > 0) commReasons.push(nonEng + ' answer(s) used Telugu instead of English.');
    if (avgWc < 8) commReasons.push('Average answer length was only ' + Math.round(avgWc) + ' words (extremely brief).');
    else if (avgWc < 15) commReasons.push('Average answer length was ' + Math.round(avgWc) + ' words (brief).');
    else if (avgWc >= 30) commReasons.push('Average answer length was ' + Math.round(avgWc) + ' words (adequate).');
    evidence.communication = commReasons.length > 0 ? commReasons.join(' ') : 'Communication was adequate throughout the interview.';

    const techReasons = [];
    if (techAnswers.length === 0) techReasons.push('No technical questions were answered.');
    else {
      const avgTechRaw = avg(techAnswers.map(a => a.score));
      const techPoorC = techAnswers.filter(a => a.cls.grade === 'Poor' || a.cls.grade === 'No Answer').length;
      const techIdkC = techAnswers.filter(a => {
        const t = (a.answer || '').trim().toLowerCase();
        return /^(no|nah|nope|naaku teliyadhu|i don'?t know|not sure|i have no idea|i can'?t answer)/.test(t) || t.length < 3;
      }).length;
      if (techPoorC > 0) techReasons.push(techPoorC + ' of ' + techAnswers.length + ' technical answer(s) were poor or unanswered.');
      if (techIdkC > 0) techReasons.push('Could not answer ' + techIdkC + ' technical question(s) ("I don\'t know").');
      if (avgTechRaw < 35) techReasons.push('Average semantic score for technical answers was ' + Math.round(avgTechRaw) + '/100.');
      if (avgTechRaw >= 65) techReasons.push('Technical answers scored ' + Math.round(avgTechRaw) + '/100 on average.');
    }
    evidence.technical = techReasons.length > 0 ? techReasons.join(' ') : 'Technical knowledge was adequately demonstrated.';

    const confReasons = [];
    if (idkExact > 0) confReasons.push(idkExact + ' answer(s) expressed uncertainty or inability to answer.');
    if (fillerPenalty > 5) confReasons.push('Filler words and hesitation detected in responses.');
    if (rawConf < 35) confReasons.push('Average confidence rating was only ' + Math.round(rawConf) + '/100.');
    if (sttPenalty > 0) confReasons.push('Low speech recognition confidence reduced evaluation confidence.');
    evidence.confidence = confReasons.length > 0 ? confReasons.join(' ') : 'Confidence level was stable throughout.';

    const behReasons = [];
    if (behAnswers.length === 0) behReasons.push('No behavioral questions were answered.');
    else if (rawBeh < 40) behReasons.push('Behavioral answers scored ' + Math.round(rawBeh) + '/100 on average.');
    if (twCount === 0 && behAnswers.length > 0) behReasons.push('No teamwork examples were discussed.');
    if (ldCount === 0 && behAnswers.length > 0) behReasons.push('No leadership examples were discussed.');
    evidence.behavior = behReasons.length > 0 ? behReasons.join(' ') : 'Behavioral engagement was adequate.';

    evidence.emotion = emotionAnalysis.evidence.join(' ');

    const resReasons = [];
    if (roleSkillsList.length > 0) resReasons.push('Matched ' + matchedSkills.length + '/' + roleSkillsList.length + ' key skills for ' + role + '.');
    if (missingSkills.length > 0) resReasons.push('Missing or undeveloped: ' + missingSkills.slice(0, 4).join(', ') + '.');
    if (discussedRatio < 0.3) resReasons.push('Few claimed skills were demonstrated in answers.');
    evidence.resumeMatch = resReasons.length > 0 ? resReasons.join(' ') : 'Resume shows reasonable alignment for the ' + role + ' role.';

    const proctoringInfo = JSON.parse(sessionStorage.getItem('proctoringTermination') || '{}');
    if (proctoringInfo.terminated) {
      evidence.proctoring = `${proctoringInfo.terminationType}: ${proctoringInfo.terminationReason}. Warning count: ${proctoringInfo.warningCount}.`;
    }

    /* ── 15. Overall Score (no floor, no artificial minimums) ── */
    const roleWeights = {
      'Software Developer': { technical: 0.35, communication: 0.15, confidence: 0.10, behavior: 0.12, resumeMatch: 0.15, emotion: 0.05, semantic: 0.08 },
      'AI/ML Engineer': { technical: 0.40, communication: 0.12, confidence: 0.08, behavior: 0.10, resumeMatch: 0.15, emotion: 0.05, semantic: 0.10 },
      'Data Analyst': { technical: 0.30, communication: 0.18, confidence: 0.08, behavior: 0.14, resumeMatch: 0.17, emotion: 0.05, semantic: 0.08 },
      'Cloud Engineer': { technical: 0.35, communication: 0.12, confidence: 0.08, behavior: 0.13, resumeMatch: 0.18, emotion: 0.05, semantic: 0.09 },
      'Cyber Security Analyst': { technical: 0.35, communication: 0.12, confidence: 0.08, behavior: 0.13, resumeMatch: 0.18, emotion: 0.05, semantic: 0.09 },
    };
    const w = roleWeights[role] || roleWeights['Software Developer'];
    const semanticScore = avg(classified.map(a => a.score));
    let overall = technical * w.technical + communication * w.communication + confidence * w.confidence +
      behavior * w.behavior + resumeMatchScore * w.resumeMatch + emotion * w.emotion + semanticScore * w.semantic;

    /* Missing-data penalties (continuous, not threshold-based) */
    if (totalQuestions <= 2) overall *= 0.5;
    if (techAnswers.length === 0) overall *= 0.7;
    if (emotionHistory.length < 3) overall *= 0.9;
    if (confVals.length < 2) overall *= 0.85;

    overall = clamp(overall, 0, 100);

    const overallReasons = [];
    if (poorOrEmpty > 0) overallReasons.push(poorOrEmpty + ' of ' + totalQuestions + ' answers were poor quality.');
    if (idkExact > 0) overallReasons.push(idkExact + ' answer(s) expressed inability to answer.');
    if (technical < 25) overallReasons.push('Technical skills require significant development.');
    if (totalQuestions <= 2) overallReasons.push('Limited interview interaction prevented thorough assessment.');
    evidence.overall = overallReasons.join(' ');

    /* ── 16. Hiring Decision ── */
    let hiringDecision, hiringJustification;
    if (overall >= 80 && technical >= 70 && communication >= 60) {
      hiringDecision = 'Strong Hire';
      hiringJustification = 'Overall ' + overall + '/100. Strong technical (' + technical + ') and communication (' + communication + ') skills demonstrated. Ready for the ' + role + ' role.';
    } else if (overall >= 65 && technical >= 55) {
      hiringDecision = 'Hire';
      hiringJustification = 'Overall ' + overall + '/100. Adequate skills for the ' + role + ' role. Onboarding support recommended to address minor gaps.';
    } else if (overall >= 45) {
      hiringDecision = 'Hold';
      hiringJustification = 'Overall ' + overall + '/100. Candidate shows potential but needs development before being ready for the ' + role + ' role.';
    } else if (overall >= 25) {
      hiringDecision = 'Needs Improvement';
      hiringJustification = 'Overall ' + overall + '/100. Major skill gaps identified. Structured preparation strongly recommended before re-applying for the ' + role + ' role.';
    } else {
      hiringDecision = 'Not Recommended';
      hiringJustification = 'Overall ' + overall + '/100. Interview performance indicates significant gaps relative to the ' + role + ' role requirements. Not recommended at this time.';
    }

    /* ── 17. Detailed Feedback Per Parameter ── */
    function fmtScore(s) { return (s / 10).toFixed(1); }

    const techAvgRaw = techAnswers.length > 0 ? avg(techAnswers.map(a => a.score)) : 0;
    const techPoorC = techAnswers.filter(a => a.cls.grade === 'Poor' || a.cls.grade === 'No Answer').length;
    const techIdkC = techAnswers.filter(a => {
      const t = (a.answer || '').trim().toLowerCase();
      return /^(no|nah|nope|naaku teliyadhu|i don'?t know|not sure|i have no idea|i can'?t answer)/.test(t) || t.length < 3;
    }).length;
    const techExplanation = techAnswers.length > 0
      ? 'Technical assessment based on ' + techAnswers.length + ' question(s). Average score: ' + Math.round(techAvgRaw) + '/100. ' + (techPoorC > 0 ? techPoorC + ' poor/unanswered.' : '') + (techIdkC > 0 ? ' ' + techIdkC + ' unanswered ("I don\'t know").' : '')
      : 'No technical questions were answered.';
    const techStrengths = [];
    if (techAvgRaw >= 65) techStrengths.push('Strong technical knowledge demonstrated');
    if (techAnswers.filter(a => a.score >= 70).length >= 2) techStrengths.push('Consistent good performance on technical topics');
    if (techAnswers.length >= 3 && techPoorC === 0) techStrengths.push('Attempted all technical questions');
    if (techStrengths.length === 0) techStrengths.push('Shows foundational technical understanding');
    const techWeaknesses = [];
    if (techAvgRaw < 50) techWeaknesses.push('Technical knowledge needs significant improvement');
    if (techPoorC > 0) techWeaknesses.push(techPoorC + ' technical question(s) left unanswered');
    if (techIdkC > 0) techWeaknesses.push('Unable to answer multiple technical questions');
    if (techStrengths.length === 0 && techWeaknesses.length === 0) techWeaknesses.push('Limited technical depth assessed');
    const techSuggestions = techAvgRaw >= 65
      ? ['Explore advanced topics in core areas', 'Practice system design discussions', 'Share knowledge through mentoring']
      : ['Strengthen fundamentals through structured learning', 'Build hands-on projects to deepen practical understanding', 'Practice explaining technical concepts out loud'];

    const vocabDiversity = classified.length > 0 ? avg(classified.map(a => {
      const words = (a.answer || '').toLowerCase().split(/\s+/).filter(Boolean);
      return words.length > 0 ? (new Set(words).size / words.length) * 100 : 0;
    })) : 0;
    const commExplanation = 'Communication assessed across ' + totalQuestions + ' answer(s). Average length: ' + Math.round(avgWc) + ' words. ' + (idkExact > 0 ? idkExact + ' answer(s) were "I don\'t know" or "No". ' : '') + (poorOrEmpty > 0 ? poorOrEmpty + ' answer(s) were poor quality. ' : '') + (nonEng > 0 ? nonEng + ' answer(s) used Telugu. ' : '');
    const commStrengths = [];
    if (avgWc >= 30) commStrengths.push('Provided comprehensive answers');
    if (vocabDiversity >= 60) commStrengths.push('Good vocabulary range');
    if (goodCount >= 2) commStrengths.push('Delivered several high-quality responses');
    if (commStrengths.length === 0) commStrengths.push('Able to convey basic ideas');
    const commWeaknesses = [];
    if (idkExact > 0) commWeaknesses.push('Frequent "I don\'t know" or "No" responses (' + idkExact + ' time(s))');
    if (avgWc < 15) commWeaknesses.push('Answers are too brief');
    if (nonEng > 0) commWeaknesses.push('Used Telugu instead of English in answers');
    if (poorOrEmpty > 0) commWeaknesses.push(poorOrEmpty + ' poor-quality answer(s) detected');
    if (commWeaknesses.length === 0) commWeaknesses.push('Continue refining communication clarity');
    const commSuggestions = communication >= 60
      ? ['Structure responses using STAR framework', 'Practice concise technical explanations', 'Expand technical vocabulary']
      : ['Avoid single-word answers - expand with explanation', 'Practice answering questions in full sentences', 'Prepare for common questions in advance'];

    const confExplanation = 'Confidence assessed at ' + confidence + '/100. ' + (idkExact > 0 ? idkExact + ' answer(s) expressed uncertainty. ' : '') + (fillerPenalty > 5 ? 'Filler words detected in multiple answers. ' : '') + (sttPenalty > 0 ? 'Low transcription confidence noted. ' : '');
    const confStrengths = [];
    if (rawConf >= 60) confStrengths.push('Delivered answers with assurance');
    if (confStab >= 70) confStrengths.push('Confidence remained stable throughout');
    if (idkExact === 0) confStrengths.push('Did not express uncertainty');
    if (confStrengths.length === 0) confStrengths.push('Shows willingness to engage with questions');
    const confWeaknesses = [];
    if (idkExact > 0) confWeaknesses.push('Expressed uncertainty or inability to answer ' + idkExact + ' time(s)');
    if (rawConf < 45) confWeaknesses.push('Low confidence in responses');
    if (fillerPenalty > 10) confWeaknesses.push('Excessive filler words reduce confidence perception');
    if (confWeaknesses.length === 0) confWeaknesses.push('Maintain current confidence level');
    const confSuggestions = confidence >= 60
      ? ['Continue practicing assertive delivery', 'Prepare for challenging questions in advance', 'Use pause-and-think technique instead of filler words']
      : ['Practice answering questions out loud daily', 'Record mock interviews to identify hesitation patterns', 'Prepare structured stories for common question types'];

    const behExplanation = behAnswers.length > 0
      ? 'Behavioral assessment based on ' + behAnswers.length + ' question(s). Average score: ' + Math.round(rawBeh) + '/100. ' + (twCount > 0 ? 'Teamwork demonstrated. ' : '') + (ldCount > 0 ? 'Leadership demonstrated. ' : '')
      : 'No behavioral questions were answered.';
    const behStrengths = [];
    if (rawBeh >= 60) behStrengths.push('Strong behavioral responses');
    if (twCount >= 2) behStrengths.push('Demonstrated teamwork and collaboration');
    if (ldCount >= 1) behStrengths.push('Showed leadership initiative');
    if (behStrengths.length === 0) behStrengths.push('Demonstrated professional conduct');
    const behWeaknesses = [];
    if (rawBeh < 45 && behAnswers.length > 0) behWeaknesses.push('Behavioral responses lack depth');
    if (twCount === 0 && behAnswers.length > 0) behWeaknesses.push('Limited teamwork examples provided');
    if (ldCount === 0 && behAnswers.length > 0) behWeaknesses.push('Leadership examples not discussed');
    if (behWeaknesses.length === 0) behWeaknesses.push('Continue developing behavioral competencies');
    const behSuggestions = behavior >= 60
      ? ['Prepare more STAR stories', 'Quantify impact in teamwork examples', 'Practice conflict resolution scenarios']
      : ['Prepare 3-5 behavioral stories using STAR method', 'Focus on specific measurable outcomes', 'Practice discussing challenges overcome'];

    const resumeExplanation = 'Resume match: ' + resumeMatchScore + '/100. Matched ' + matchedSkills.length + '/' + roleSkillsList.length + ' skills. ' + (missingSkills.length > 0 ? 'Missing: ' + missingSkills.slice(0, 4).join(', ') + '. ' : 'All role skills present. ') + (discussedRatio < 0.4 ? 'Few claimed skills were demonstrated.' : 'Claimed skills were substantiated.');
    const resumeStrengths = [];
    if (roleMatchScore >= 60) resumeStrengths.push('Alignment with ' + role + ' role requirements');
    if (discussedRatio >= 0.5) resumeStrengths.push('Claimed skills substantiated in answers');
    if (matchedSkills.length >= 5) resumeStrengths.push('Broad skill coverage across role requirements');
    if (resumeStrengths.length === 0) resumeStrengths.push('Resume shows potential for development');
    const resumeWeaknesses = [];
    if (roleMatchScore < 50) resumeWeaknesses.push('Skill gap for ' + role + ' role');
    if (discussedRatio < 0.4) resumeWeaknesses.push('Claimed skills not demonstrated in interview');
    if (missingSkills.length >= 3) resumeWeaknesses.push('Missing ' + missingSkills.length + ' important skills for the role');
    if (resumeWeaknesses.length === 0) resumeWeaknesses.push('Continue expanding skill set');
    const resumeSuggestions = resumeMatchScore >= 60
      ? ['Deepen expertise in priority skills', 'Quantify impact in projects', 'Stay current with requirements']
      : ['Focus on core skills for the target role', 'Build portfolio projects demonstrating key technologies', 'Consider certifications or structured learning paths'];

    /* ── 17. Build Feedback Object ── */
    const detailedFeedback = {
      technical: {
        score: fmtScore(technical),
        label: describeScore(technical),
        explanation: techExplanation,
        evidence: evidence.technical,
        strengths: pickTop(techStrengths, 3),
        weaknesses: pickTop(techWeaknesses, 3),
        suggestions: pickTop(techSuggestions, 3),
      },
      communication: {
        score: fmtScore(communication),
        label: describeScore(communication),
        explanation: commExplanation,
        evidence: evidence.communication,
        strengths: pickTop(commStrengths, 3),
        weaknesses: pickTop(commWeaknesses, 3),
        suggestions: pickTop(commSuggestions, 3),
      },
      confidence: {
        score: fmtScore(confidence),
        label: describeScore(confidence),
        explanation: confExplanation,
        evidence: evidence.confidence,
        strengths: pickTop(confStrengths, 3),
        weaknesses: pickTop(confWeaknesses, 3),
        suggestions: pickTop(confSuggestions, 3),
      },
      behavioral: {
        score: fmtScore(behavior),
        label: describeScore(behavior),
        explanation: behExplanation,
        evidence: evidence.behavior,
        strengths: pickTop(behStrengths, 3),
        weaknesses: pickTop(behWeaknesses, 3),
        suggestions: pickTop(behSuggestions, 3),
      },
      emotion: {
        score: fmtScore(emotion),
        label: describeScore(emotion),
        explanation: emotionAnalysis.evidence.slice(0, 3).join(' '),
        evidence: evidence.emotion,
        strengths: [
          emotion >= 70 ? 'Emotionally stable throughout the interview' : 'Able to recover from nervousness',
          engagement >= 70 ? 'High engagement and attentiveness' : 'Shows engagement with the process',
          stressLvl <= 0.3 ? 'Remained calm under pressure' : 'Shows awareness of interview pressure',
        ],
        weaknesses: [
          stressLvl > 0.3 ? 'Visible nervousness in some responses' : 'Continue maintaining composure',
          emotion < 60 ? 'Emotional fluctuations affect consistency' : 'Stable emotional presentation',
          engagement < 60 ? 'Engagement could be higher' : 'Good participation level',
        ],
        suggestions: stressLvl > 0.3
          ? ['Practice breathing techniques before interviews', 'Prepare thoroughly to reduce uncertainty', 'Take brief pauses to compose thoughts before answering']
          : ['Continue maintaining composure under pressure', 'Channel positive energy into engaging responses'],
      },
      resumeMatch: {
        score: fmtScore(resumeMatchScore),
        label: describeScore(resumeMatchScore),
        explanation: resumeExplanation,
        evidence: evidence.resumeMatch,
        strengths: pickTop(resumeStrengths, 3),
        weaknesses: pickTop(resumeWeaknesses, 3),
        suggestions: pickTop(resumeSuggestions, 3),
      },
      overall: {
        score: overall,
        label: hiringDecision,
        evidence: evidence.overall,
        weightedComponents: {
          technical: Math.round(technical * w.technical) + '/' + Math.round(w.technical * 100),
          communication: Math.round(communication * w.communication) + '/' + Math.round(w.communication * 100),
          confidence: Math.round(confidence * w.confidence) + '/' + Math.round(w.confidence * 100),
          behavior: Math.round(behavior * w.behavior) + '/' + Math.round(w.behavior * 100),
          resumeMatch: Math.round(resumeMatchScore * w.resumeMatch) + '/' + Math.round(w.resumeMatch * 100),
          emotion: Math.round(emotion * w.emotion) + '/' + Math.round(w.emotion * 100),
        },
        justification: hiringJustification,
      },
    };

    const finalScores = {
      technical,
      communication,
      confidence,
      behavior,
      emotion,
      emotionStability: Math.round(emotion),
      resumeMatch: resumeMatchScore,
      projectKnowledge: Math.round(techAnswers.length > 0 ? avg(techAnswers.map(a => a.score)) : avg(classified.map(a => a.score))),
      roleMatch: roleMatchScore,
      semantic: Math.round(avg(classified.map(a => a.score))),
      overall,
      hiringDecision,
      evidence,
    };

    const allStrengths = [
      ...pickTop(techStrengths, 2),
      ...pickTop(commStrengths, 2),
      ...pickTop(confStrengths, 1),
      ...pickTop(behStrengths, 1),
    ];
    const allWeaknesses = [
      ...pickTop(techWeaknesses, 2),
      ...pickTop(commWeaknesses, 1),
      ...pickTop(confWeaknesses, 1),
      ...pickTop(behWeaknesses, 1),
      ...pickTop(resumeWeaknesses, 1),
    ];
    const recommendedSkills = missingSkills.length > 0
      ? pickTop(missingSkills, 4)
      : pickTop(roleSkillsList, 4);
    const improvementAreas = [
      ...pickTop(techSuggestions, 1),
      ...pickTop(commSuggestions, 1),
      ...pickTop(confSuggestions, 1),
    ];

    const feedback = {
      detailed: detailedFeedback,
      strengths: allStrengths,
      weaknesses: allWeaknesses,
      recommendedSkills,
      improvementAreas,
      summary: hiringJustification,
      recommendation: hiringDecision,
      evidence,
      generatedAt: new Date().toISOString(),
    };

    sessionStorage.setItem('finalScores', JSON.stringify(finalScores));
    sessionStorage.setItem('feedback', JSON.stringify(feedback));
    sessionStorage.setItem('answerQuality', JSON.stringify(classified.map(a => ({ question: a.question, answer: a.answer, grade: a.cls.grade, score: a.cls.score, language: a.lang }))));
    navigate('/result');
  };

  const canSubmit = transcript.trim().length > 10 && !isSpeaking && !isProcessing;

  return (
    <div className="page fade-in">
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>Adaptive AI Interview</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          {candidate.name} &middot; {candidate.role}
        </p>
      </div>

      {interviewComplete && (
        <div className="card slide-up" style={{ marginBottom: 24, textAlign: 'center', padding: '20px 24px' }}>
          <h2 className="gradient-text" style={{ marginBottom: 8, fontSize: 22 }}>Interview Complete!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
            {answers.length} adaptive questions answered. Generating your comprehensive feedback report...
          </p>
          <button className="btn btn-primary" onClick={handleFinish} style={{ padding: '14px 48px', fontSize: 16 }}>
            View Results
          </button>
        </div>
      )}

      {warningMessage && (
        <div className="card slide-up" style={{ marginBottom: 24, textAlign: 'center', padding: '16px 20px', border: '2px solid #ff4757', background: 'rgba(255,71,87,0.08)' }}>
          <p style={{ color: '#ff4757', fontWeight: 600, fontSize: 15, margin: 0 }}>
            ⚠ {warningMessage}
          </p>
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <CameraPreview
          videoRef={videoRef}
          cameraActive={cameraActive}
          emotion={emotion}
          emotionScores={emotionScores}
          emotionHistory={emotionHistory}
          emotionScoresHistory={emotionScoresHistory}
          faceDetected={faceDetected}
          multiFaceWarnings={multiFaceWarnings}
        />
        <div>
          {currentQuestion && !interviewComplete ? (
            <>

              <QuestionCard
                question={{ question: currentQuestion.text, type: currentQuestion.type }}
                isSpeaking={isSpeaking}
                onRepeat={speakCurrentQuestion}
                difficulty={currentQuestion.difficulty}
              />
            </>
          ) : !interviewComplete ? (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ color: 'var(--text-muted)' }}>
                {questionLoading ? 'Generating adaptive question...' : 'Preparing your first question...'}
              </p>
              {questionLoading && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--accent-4)' }}>
                  Analyzing your profile and skill graph...
                </div>
              )}
            </div>
          ) : null}

          {!interviewComplete && (
            <div className="card" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, color: 'var(--text-muted)' }}>CURRENT ANSWER</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {sttStatus && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 180, textAlign: 'right', lineHeight: 1.3 }}>
                      {isTranscribing ? '⏳' : isListening ? '🔴' : ''} {sttStatus}
                    </span>
                  )}
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px', fontSize: 13 }}
                    onClick={toggleListening}
                    disabled={isProcessing || interviewComplete || isTranscribing}
                  >
                    {isListening ? '⏹ Stop' : '🎤 Speak'}
                  </button>
                </div>
              </div>
              <div
                style={{
                  minHeight: 60,
                  padding: 16,
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 'var(--radius-sm)',
                  color: transcript ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: 15,
                  lineHeight: 1.6,
                  marginBottom: 16,
                }}
              >
                {transcript || 'Click "Speak" and start answering...'}
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={submitAnswer}
                  disabled={!canSubmit || isTranscribing}
                >
                  {isProcessing ? 'Submitting...' : isTranscribing ? 'Enhancing transcription...' : 'Submit Answer'}
                </button>
                {transcriptionConfidence > 0 && (
                  <div
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      background: transcriptionConfidence >= 70 ? 'rgba(0,212,170,0.15)' : transcriptionConfidence >= 45 ? 'rgba(255,217,61,0.15)' : 'rgba(255,107,157,0.15)',
                      color: transcriptionConfidence >= 70 ? 'var(--accent-2)' : transcriptionConfidence >= 45 ? 'var(--accent-4)' : 'var(--accent-3)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    STT: {transcriptionConfidence}%
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid-4">
        {[
          { label: 'Technical', value: scores.technical, color: 'var(--accent-1)' },
          { label: 'Semantic', value: scores.semantic, color: 'var(--accent-2)' },
          { label: 'Confidence', value: scores.confidence, color: 'var(--accent-4)' },
          { label: 'Emotion', value: scores.emotion, color: 'var(--accent-3)' },
        ].map((s) => (
          <CircularScore key={s.label} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      {scoreHistory.length > 0 && (
        <div className="card slide-up" style={{ marginTop: 20 }}>
          <h4 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Question Performance
          </h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {scoreHistory.map((s, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0,0,0,0.2)',
                  textAlign: 'center',
                  minWidth: 60,
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Q{s.qNumber}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.semantic >= 60 ? 'var(--accent-2)' : s.semantic >= 40 ? 'var(--accent-4)' : 'var(--accent-3)' }}>
                  {s.semantic}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
