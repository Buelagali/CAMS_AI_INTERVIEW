import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QuestionCard from '../components/QuestionCard';
import CameraPreview from '../components/CameraPreview';
import CircularScore from '../components/CircularScore';
import { speakText, stopSpeaking } from '../services/speechService';
import { loadModels, detectEmotion } from '../services/faceDetection';
import {
  startCapture,
  stopCapture,
  isCurrentlyRecording,
  getRecordingDuration,
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
} from '../services/sttService';
import {
  calculateAnswerScore,
  calculateCommunicationScore,
  calculateConfidenceFromAnswer,
  calculateEmotionStability,
  getSkillGraph,
  fetchAdaptiveQuestion,
  generateQuestion as localGenerateQuestion,
} from '../utils/questionEngine';

const MAX_QUESTIONS = 8;

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
  const [confidenceHistory, setConfidenceHistory] = useState([]);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [scoreHistory, setScoreHistory] = useState([]);

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

  const initInterviewSession = async () => {
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
      maxQuestions: MAX_QUESTIONS,
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
      if (isCurrentlyRecording()) stopCapture();
      if (emotionIntervalRef.current) clearInterval(emotionIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && cameraActive) {
      emotionIntervalRef.current = setInterval(async () => {
        const result = await detectEmotion(videoRef.current);
        if (result) {
          setEmotion(result.emotion);
          setEmotionScores(result.scores);
          setEmotionHistory((prev) => [...prev.slice(-19), result.emotion]);
          setEmotionScoresHistory((prev) => [...prev.slice(-19), result.scores]);
          setConfidenceHistory((prev) => {
            const newVal = [...prev, Math.round(result.score * 100)];
            return newVal.slice(-30);
          });
        }
      }, 1000);
    }
    return () => {
      if (emotionIntervalRef.current) clearInterval(emotionIntervalRef.current);
    };
  }, [cameraActive]);

  useEffect(() => {
    if (currentQuestion && currentQ <= MAX_QUESTIONS) {
      const timer = setTimeout(() => speakCurrentQuestion(), 300);
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, currentQ]);

  const generateNextQuestion = async (mem) => {
    const m = mem || memoryRef.current;
    if (!m) return;
    if ((m.questionCount || m.currentQuestionIndex || 0) >= MAX_QUESTIONS) {
      setInterviewComplete(true);
      return;
    }
    setQuestionLoading(true);

    if (sessionId) {
      try {
        const data = await fetchAdaptiveQuestion(sessionId);
        if (data.isComplete) {
          setInterviewComplete(true);
          setQuestionLoading(false);
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

    const interviewMemory = {
      askedQuestions: (m.answerHistory || []).map((a) => ({
        id: a.questionId || a.text,
        text: a.text,
        type: a.type,
      })),
      scores: m.scores || { technical: 0, communication: 0, confidence: 0, semantic: 0 },
      questionCount: (m.currentQuestionIndex || 0),
    };
    const localQ = localGenerateQuestion({
      role: m.role || candidate.role,
      resumeSkills: m.resumeSkills || resumeData.skills || [],
      interviewMemory,
      currentEmotion: emotion,
    });
    const q = localQ || {
      id: `fallback_${Date.now()}`,
      type: 'technical',
      difficulty: Math.min(3, (m.currentDifficulty || 1)),
      text: 'Can you describe a technical project you have worked on recently and the challenges you faced?',
      metadata: { skill: null, rationale: 'Last resort fallback', generationMethod: 'fallback' },
    };
    currentQuestionRef.current = q;
    setCurrentQuestion(q);
    setCurrentQ(m.currentQuestionIndex || 0);
    setCurrentDifficulty(q.difficulty || (m.currentDifficulty || 1));
    setQuestionLoading(false);
  };

  const initDualPathSTT = () => {
    const wsInitialized = initWebSpeech();

    onTranscript((text, isInterim) => {
      setTranscript(text);
    });

    onStatus((status) => {
      if (status.type === 'listening') {
        setSttStatus('Listening via speech recognition...');
      } else if (status.type === 'transcribed') {
        setSttStatus(`Backend transcription complete (${status.confidence}% confidence)`);
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

      stopWebSpeech();

      let audioResult = null;
      if (isCurrentlyRecording()) {
        audioResult = stopCapture();
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

      startWebSpeech();

      try {
        const captureResult = await startCapture({
          noiseGate: true,
          noiseGateThreshold: 0.008,
          autoNormalize: true,
        });
        audioCaptureRef.current = captureResult;
      } catch (err) {
        console.warn('Audio capture not available, using Web Speech only:', err.message);
      }
    }
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
        await fetch(`/api/interview/session/${sessionId}/answer`, {
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
      maxQuestions: MAX_QUESTIONS,
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

    if (semanticScore > 75) {
      mem.currentDifficulty = Math.min(3, (mem.currentDifficulty || 1) + 1);
    } else if (semanticScore < 50) {
      mem.currentDifficulty = Math.max(1, (mem.currentDifficulty || 1) - 1);
    }

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

    if (mem.currentQuestionIndex >= MAX_QUESTIONS) {
      setInterviewComplete(true);
    } else {
      setTranscript('');
      await generateNextQuestion(mem);
    }
    setIsProcessing(false);
  }, [transcript, currentQuestion, isProcessing, answers, scores, emotion, confidenceHistory, emotionScores, candidate.role, resumeData, transcriptionConfidence, sessionId]);

  const handleFinish = () => {
    const avgConfidence = confidenceHistory.length > 0
      ? Math.round(confidenceHistory.reduce((a, b) => a + b, 0) / confidenceHistory.length)
      : 50;
    const emotionStability = calculateEmotionStability(emotionScoresHistory);
    const avgEmotion = scores.emotion || 50;

    const roleSkills = getSkillGraph(candidate.role);
    const candidateSkills = resumeData.skills || [];
    const matchedRoleSkills = roleSkills.filter((s) =>
      candidateSkills.some((cs) => cs.toLowerCase().includes(s.toLowerCase()))
    );
    const roleMatchScore = Math.round((matchedRoleSkills.length / Math.max(roleSkills.length, 1)) * 100);

    const projectKnowledge = answers.filter((a) => a.questionType === 'resume').length > 0
      ? Math.round(answers.filter((a) => a.questionType === 'resume').reduce((s, a) => s + a.score, 0) /
          answers.filter((a) => a.questionType === 'resume').length)
      : scores.semantic;

    const communicationScore = answers.length > 0
      ? Math.round(answers.reduce((s, a) => s + a.communication, 0) / answers.length)
      : scores.communication || 50;

    const finalScores = {
      technical: scores.technical || 0,
      communication: communicationScore,
      confidence: scores.confidence || avgConfidence,
      behavior: avgEmotion,
      emotionStability,
      resumeMatch: resumeMatch.matchScore || roleMatchScore,
      projectKnowledge,
      roleMatch: roleMatchScore,
      semantic: scores.semantic || 0,
      overall: Math.round(
        (scores.technical || 0) * 0.20 +
        communicationScore * 0.12 +
        (scores.confidence || avgConfidence) * 0.12 +
        avgEmotion * 0.08 +
        emotionStability * 0.08 +
        (resumeMatch.matchScore || roleMatchScore) * 0.15 +
        projectKnowledge * 0.10 +
        roleMatchScore * 0.10 +
        (scores.semantic || 0) * 0.05
      ),
    };

    const tier = finalScores.overall >= 80 ? 'excellent' : finalScores.overall >= 65 ? 'good' : finalScores.overall >= 50 ? 'average' : 'below_average';

    const strengthPool = {
      technical: ['Demonstrates strong technical aptitude and problem-solving skills', 'Shows depth of knowledge in core technical concepts', 'Able to articulate complex technical topics with clarity', 'Strong analytical thinking and technical reasoning'],
      semantic: ['Answers are well-structured and directly address the questions', 'Provides relevant and contextually appropriate responses', 'Excellent ability to stay on-topic and cover key points', 'Responses show clear understanding of the subject matter'],
      confidence: ['Speaks with assurance and maintains composure under pressure', 'Demonstrates self-confidence in presenting ideas', 'Handles challenging questions with poise', 'Shows strong conviction in technical decisions'],
      communication: ['Excellent verbal communication and articulation skills', 'Communicates ideas in a clear and organized manner', 'Effective at explaining complex concepts simply', 'Strong interpersonal and presentation skills'],
      behavior: ['Maintains positive demeanor and professional attitude throughout', 'Shows resilience and adaptability during the interview', 'Demonstrates strong engagement and active listening', 'Exhibits leadership qualities and team-oriented mindset'],
      emotion: ['Shows excellent emotional regulation under interview pressure', 'Maintains consistent composure throughout challenging questions', 'Demonstrates self-awareness and emotional intelligence'],
    };

    const weaknessPool = {
      technical: ['Technical knowledge needs strengthening in key areas', 'Should deepen understanding of fundamental concepts', 'Needs more hands-on practice with core technologies', 'Technical answers lack depth and specificity'],
      semantic: ['Answers sometimes stray off-topic or miss key points', 'Responses would benefit from more structure and focus', 'Should ensure answers directly address what was asked', 'Needs to provide more concrete examples and evidence'],
      confidence: ['Appears hesitant or unsure in certain responses', 'Could benefit from more assertive delivery', 'Confidence wavers when faced with complex questions', 'Should practice delivering answers with more conviction'],
      communication: ['Communication could be more concise and well-organized', 'Should work on structuring thoughts before responding', 'Needs to improve clarity in explaining technical concepts', 'Could benefit from more precise terminology and language'],
      behavior: ['Shows signs of nervousness that affect delivery', 'Could maintain more consistent engagement throughout', 'Body language and eye contact could be improved', 'Should work on maintaining composure under pressure'],
    };

    function pickRandom(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    const strengths = [];
    if (finalScores.technical >= 60) strengths.push(pickRandom(strengthPool.technical));
    if (finalScores.semantic >= 60) strengths.push(pickRandom(strengthPool.semantic));
    if (finalScores.confidence >= 60) strengths.push(pickRandom(strengthPool.confidence));
    if (finalScores.communication >= 55) strengths.push(pickRandom(strengthPool.communication));
    if (finalScores.behavior >= 55) strengths.push(pickRandom(strengthPool.behavior));
    if (finalScores.emotionStability >= 60) strengths.push(pickRandom(strengthPool.emotion));
    if (strengths.length === 0) strengths.push('Shows potential for growth and development');

    const weaknesses = [];
    if (finalScores.technical < 55) weaknesses.push(pickRandom(weaknessPool.technical));
    if (finalScores.semantic < 55) weaknesses.push(pickRandom(weaknessPool.semantic));
    if (finalScores.confidence < 55) weaknesses.push(pickRandom(weaknessPool.confidence));
    if (finalScores.communication < 55) weaknesses.push(pickRandom(weaknessPool.communication));
    if (finalScores.behavior < 55) weaknesses.push(pickRandom(weaknessPool.behavior));
    if (weaknesses.length === 0) weaknesses.push('Continue building on existing strengths');

    const skillMap = {
      'Software Developer': [['TypeScript', 'deepen TypeScript expertise with advanced generics and utility types'], ['System Design', 'study distributed system design patterns'], ['Docker', 'gain hands-on experience with Docker and container orchestration'], ['Testing', 'strengthen test-driven development practices'], ['CI/CD', 'learn CI/CD pipeline configuration and automation']],
      'AI/ML Engineer': [['MLOps', 'learn MLOps for model deployment and monitoring'], ['TensorFlow', 'deepen TensorFlow expertise with custom training loops'], ['PyTorch', 'explore advanced PyTorch features and distributed training'], ['Kubernetes', 'learn Kubernetes for ML workload orchestration'], ['Computer Vision', 'expand knowledge into computer vision applications']],
      'Data Analyst': [['Python', 'strengthen Python skills for advanced data manipulation'], ['Tableau', 'learn advanced Tableau dashboard techniques'], ['Power BI', 'explore Power BI for enterprise reporting'], ['Statistics', 'deepen statistical knowledge for hypothesis testing'], ['ETL', 'learn ETL pipeline design and data warehousing']],
      'Cloud Engineer': [['AWS/Azure/GCP', 'obtain advanced cloud certifications'], ['Kubernetes', 'gain expertise in Kubernetes cluster management'], ['Terraform', 'learn Infrastructure as Code with Terraform'], ['Jenkins', 'strengthen CI/CD pipeline skills'], ['Microservices', 'study microservices architecture patterns']],
      'Cyber Security Analyst': [['Penetration Testing', 'gain hands-on penetration testing experience'], ['SIEM', 'learn SIEM tool configuration and threat analysis'], ['Cryptography', 'deepen understanding of cryptographic protocols'], ['Incident Response', 'study incident response frameworks'], ['Cloud Security', 'explore cloud security best practices']],
    };

    const roleSkillRecs = skillMap[candidate.role] || [['Communication', 'practice articulating technical concepts clearly'], ['Problem Solving', 'work on systematic problem-solving approaches'], ['Leadership', 'develop team leadership and mentoring skills']];
    const selectedSkills = roleSkillRecs.sort(() => Math.random() - 0.5).slice(0, 3);
    const recommendedSkills = selectedSkills.map((s) => s[0]);
    const improvementAreas = selectedSkills.map((s) => s[1]);

    const summaryTemplates = {
      excellent: [`${candidate.name} delivered an outstanding interview performance, scoring ${finalScores.overall}% overall. Demonstrated exceptional capability across ${answers.length + 1} questions with particular strength in technical areas. Highly recommended for advancement.`, `${candidate.name} impressed with a stellar interview, achieving ${finalScores.overall}%. The responses were well-articulated, technically sound, and showed deep domain expertise. A strong candidate for the ${candidate.role} role.`],
      good: [`${candidate.name} performed well with an overall score of ${finalScores.overall}%. Answered ${answers.length + 1} questions with solid technical understanding. Some areas for refinement but shows strong potential for the ${candidate.role} role.`, `${candidate.name} delivered a good interview (${finalScores.overall}%). Demonstrated competence in key areas and responded well to most questions.`],
      average: [`${candidate.name} delivered an average performance scoring ${finalScores.overall}%. While some answers showed promise, there is room for improvement in both technical depth and response quality.`, `${candidate.name} scored ${finalScores.overall}% in the interview. Demonstrated basic competency but needs to develop deeper understanding of key concepts.`],
      below_average: [`${candidate.name} scored ${finalScores.overall}%, indicating significant gaps in preparation and knowledge. Structured learning and mock interview practice are strongly recommended.`],
    };
    const summary = pickRandom(summaryTemplates[tier] || summaryTemplates.average);
    const recommendation = finalScores.overall >= 80 ? 'Strong Hire' : finalScores.overall >= 60 ? 'Hire' : finalScores.overall >= 45 ? 'Consider' : 'No Hire';

    const feedback = { strengths, weaknesses, recommendedSkills, improvementAreas, summary, recommendation, generatedAt: new Date().toISOString() };

    sessionStorage.setItem('finalScores', JSON.stringify(finalScores));
    sessionStorage.setItem('feedback', JSON.stringify(feedback));
    navigate('/result');
  };

  const canSubmit = transcript.trim().length > 10 && !isSpeaking && !isProcessing;
  const progress = Math.min(100, (answers.length / MAX_QUESTIONS) * 100);
  const questionNum = Math.min(answers.length + 1, MAX_QUESTIONS);
  const diffLabel = currentQuestion ? DIFFICULTY_LABELS[currentQuestion.difficulty] : '';
  const diffColor = currentQuestion ? DIFFICULTY_COLORS[currentQuestion.difficulty] : '';

  return (
    <div className="page fade-in">
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>Adaptive AI Interview</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          {candidate.name} &middot; {candidate.role} &middot; Question {questionNum} of {MAX_QUESTIONS}
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

      {!interviewComplete && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Interview Progress</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ width: '100%', height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-1), var(--accent-2))', borderRadius: 3, transition: 'width 0.5s ease' }} />
          </div>
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
        />
        <div>
          {currentQuestion && !interviewComplete ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                {diffLabel && (
                  <span style={{ padding: '2px 12px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: `${diffColor}22`, color: diffColor }}>
                    {diffLabel}
                  </span>
                )}
                {currentDifficulty && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Difficulty: {DIFFICULTY_LABELS[currentDifficulty]} &middot; Q{questionNum} of {MAX_QUESTIONS}
                  </span>
                )}
              </div>
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
