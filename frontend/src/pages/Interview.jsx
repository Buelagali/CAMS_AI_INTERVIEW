import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QuestionCard from '../components/QuestionCard';
import CameraPreview from '../components/CameraPreview';
import SkillMeter from '../components/SkillMeter';
import CircularScore from '../components/CircularScore';
import { speakText, stopSpeaking } from '../services/speechService';
import { loadModels, detectEmotion } from '../services/faceDetection';

export default function Interview() {
  const navigate = useNavigate();
  const sessionId = sessionStorage.getItem('sessionId');
  const candidate = JSON.parse(sessionStorage.getItem('candidate') || '{}');
  const questions = JSON.parse(sessionStorage.getItem('questions') || '[]');

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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

  const recognitionRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const spokenRef = useRef(false);
  const emotionIntervalRef = useRef(null);

  const resumeData = JSON.parse(sessionStorage.getItem('resumeData') || '{}');
  const resumeMatch = JSON.parse(sessionStorage.getItem('resumeMatch') || '{}');

  useEffect(() => {
    initSpeechRecognition();
    initCamera();
    loadModels();
    return () => {
      stopSpeaking();
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
    if (currentQ < questions.length) {
      const timer = setTimeout(() => speakCurrentQuestion(), 300);
      return () => clearTimeout(timer);
    }
  }, [currentQ]);

  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      setTranscript(final || interim);
    };

    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
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
    if (currentQ >= questions.length) return;
    setIsSpeaking(true);
    speakText(questions[currentQ].question, () => setIsSpeaking(false));
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const submitAnswer = useCallback(async () => {
    if (!transcript.trim() || isProcessing) return;
    setIsProcessing(true);
    setIsListening(false);
    if (recognitionRef.current) recognitionRef.current.stop();

    const answerWords = transcript.toLowerCase().split(' ').filter(Boolean);
    const questionWords = (questions[currentQ]?.question || '').toLowerCase().split(' ').filter(Boolean);
    const overlap = questionWords.filter((w) => answerWords.includes(w)).length;
    const semanticScore = Math.round(Math.min(100, (overlap / Math.max(questionWords.length, 1)) * 100 + Math.random() * 20));
    const confidenceScore = 40 + Math.round(Math.random() * 50);

    const submittedEntry = { question: questions[currentQ].question, answer: transcript, score: semanticScore };
    const newAnswers = [...answers, submittedEntry];
    setAnswers(newAnswers);

    setConfidenceHistory((prev) => [...prev, confidenceScore]);

    const newScores = { ...scores };
    const techQuestions = newAnswers.filter((a) => questions.find((q) => q.question === a.question)?.type === 'technical');
    if (techQuestions.length > 0) {
      newScores.technical = Math.round(techQuestions.reduce((s, a) => s + a.score, 0) / techQuestions.length);
    }
    newScores.semantic = Math.round(newAnswers.reduce((s, a) => s + a.score, 0) / newAnswers.length);
    newScores.confidence = Math.round(confidenceHistory.concat(confidenceScore).reduce((a, b) => a + b, 0) / (confidenceHistory.length + 1));
    setScores(newScores);

    if (currentQ + 1 >= questions.length) {
      setInterviewComplete(true);
    } else {
      setCurrentQ((prev) => prev + 1);
      setTranscript('');
    }
    setIsProcessing(false);
  }, [transcript, currentQ, isProcessing, questions, answers, scores, confidenceHistory]);

  const handleFinish = () => {
    const avgEmotion = confidenceHistory.length > 0
      ? Math.round(confidenceHistory.reduce((a, b) => a + b, 0) / confidenceHistory.length)
      : 60;

    const finalScores = {
      technical: scores.technical,
      communication: Math.round(scores.semantic * 0.7 + scores.confidence * 0.3),
      confidence: scores.confidence,
      behavior: avgEmotion,
      resumeMatch: resumeMatch.matchScore || Math.round(Math.random() * 30 + 50),
      semantic: scores.semantic,
      emotion: avgEmotion,
      skillGraph: resumeMatch.matchScore || Math.round(Math.random() * 30 + 50),
      overall: Math.round(
        scores.technical * 0.30 +
        (scores.semantic * 0.7 + scores.confidence * 0.3) * 0.15 +
        scores.confidence * 0.15 +
        avgEmotion * 0.10 +
        0.15 * (resumeMatch.matchScore || 70) +
        0.15 * scores.semantic
      ),
    };

    const tier = finalScores.overall >= 80 ? 'excellent' : finalScores.overall >= 65 ? 'good' : finalScores.overall >= 50 ? 'average' : 'below_average';

    const strengthPool = {
      technical: [
        'Demonstrates strong technical aptitude and problem-solving skills',
        'Shows depth of knowledge in core technical concepts',
        'Able to articulate complex technical topics with clarity',
        'Strong analytical thinking and technical reasoning',
      ],
      semantic: [
        'Answers are well-structured and directly address the questions',
        'Provides relevant and contextually appropriate responses',
        'Excellent ability to stay on-topic and cover key points',
        'Responses show clear understanding of the subject matter',
      ],
      confidence: [
        'Speaks with assurance and maintains composure under pressure',
        'Demonstrates self-confidence in presenting ideas',
        'Handles challenging questions with poise',
        'Shows strong conviction in technical decisions',
      ],
      communication: [
        'Excellent verbal communication and articulation skills',
        'Communicates ideas in a clear and organized manner',
        'Effective at explaining complex concepts simply',
        'Strong interpersonal and presentation skills',
      ],
      behavior: [
        'Maintains positive demeanor and professional attitude throughout',
        'Shows resilience and adaptability during the interview',
        'Demonstrates strong engagement and active listening',
        'Exhibits leadership qualities and team-oriented mindset',
      ],
    };

    const weaknessPool = {
      technical: [
        'Technical knowledge needs strengthening in key areas',
        'Should deepen understanding of fundamental concepts',
        'Needs more hands-on practice with core technologies',
        'Technical answers lack depth and specificity',
      ],
      semantic: [
        'Answers sometimes stray off-topic or miss key points',
        'Responses would benefit from more structure and focus',
        'Should ensure answers directly address what was asked',
        'Needs to provide more concrete examples and evidence',
      ],
      confidence: [
        'Appears hesitant or unsure in certain responses',
        'Could benefit from more assertive delivery',
        'Confidence wavers when faced with complex questions',
        'Should practice delivering answers with more conviction',
      ],
      communication: [
        'Communication could be more concise and well-organized',
        'Should work on structuring thoughts before responding',
        'Needs to improve clarity in explaining technical concepts',
        'Could benefit from more precise terminology and language',
      ],
      behavior: [
        'Shows signs of nervousness that affect delivery',
        'Could maintain more consistent engagement throughout',
        'Body language and eye contact could be improved',
        'Should work on maintaining composure under pressure',
      ],
    };

    const strengths = [];
    if (finalScores.technical >= 60) strengths.push(pickRandom(strengthPool.technical));
    if (finalScores.semantic >= 60) strengths.push(pickRandom(strengthPool.semantic));
    if (finalScores.confidence >= 60) strengths.push(pickRandom(strengthPool.confidence));
    if (finalScores.communication >= 60) strengths.push(pickRandom(strengthPool.communication));
    if (finalScores.behavior >= 60) strengths.push(pickRandom(strengthPool.behavior));
    if (strengths.length === 0) strengths.push('Shows potential for growth and development');

    const weaknesses = [];
    if (finalScores.technical < 55) weaknesses.push(pickRandom(weaknessPool.technical));
    if (finalScores.semantic < 55) weaknesses.push(pickRandom(weaknessPool.semantic));
    if (finalScores.confidence < 55) weaknesses.push(pickRandom(weaknessPool.confidence));
    if (finalScores.communication < 55) weaknesses.push(pickRandom(weaknessPool.communication));
    if (finalScores.behavior < 55) weaknesses.push(pickRandom(weaknessPool.behavior));
    if (weaknesses.length === 0) weaknesses.push('Continue building on existing strengths');

    const skillMap = {
      'Software Developer': [
        ['TypeScript', 'deepen TypeScript expertise with advanced generics and utility types'],
        ['System Design', 'study distributed system design patterns'],
        ['Docker', 'gain hands-on experience with Docker and container orchestration'],
        ['Testing', 'strengthen test-driven development practices'],
        ['CI/CD', 'learn CI/CD pipeline configuration and automation'],
      ],
      'AI/ML Engineer': [
        ['MLOps', 'learn MLOps for model deployment and monitoring'],
        ['TensorFlow', 'deepen TensorFlow expertise with custom training loops'],
        ['PyTorch', 'explore advanced PyTorch features and distributed training'],
        ['Kubernetes', 'learn Kubernetes for ML workload orchestration'],
        ['Computer Vision', 'expand knowledge into computer vision applications'],
      ],
      'Data Analyst': [
        ['Python', 'strengthen Python skills for advanced data manipulation'],
        ['Tableau', 'learn advanced Tableau dashboard techniques'],
        ['Power BI', 'explore Power BI for enterprise reporting'],
        ['Statistics', 'deepen statistical knowledge for hypothesis testing'],
        ['ETL', 'learn ETL pipeline design and data warehousing'],
      ],
      'Cloud Engineer': [
        ['AWS/Azure/GCP', 'obtain advanced cloud certifications'],
        ['Kubernetes', 'gain expertise in Kubernetes cluster management'],
        ['Terraform', 'learn Infrastructure as Code with Terraform'],
        ['Jenkins', 'strengthen CI/CD pipeline skills'],
        ['Microservices', 'study microservices architecture patterns'],
      ],
      'Cyber Security Analyst': [
        ['Penetration Testing', 'gain hands-on penetration testing experience'],
        ['SIEM', 'learn SIEM tool configuration and threat analysis'],
        ['Cryptography', 'deepen understanding of cryptographic protocols'],
        ['Incident Response', 'study incident response frameworks'],
        ['Cloud Security', 'explore cloud security best practices'],
      ],
    };

    const roleSkills = skillMap[candidate.role] || [
      ['Communication', 'practice articulating technical concepts clearly'],
      ['Problem Solving', 'work on systematic problem-solving approaches'],
      ['Leadership', 'develop team leadership and mentoring skills'],
    ];

    const selectedSkills = roleSkills.sort(() => Math.random() - 0.5).slice(0, 3);
    const recommendedSkills = selectedSkills.map((s) => s[0]);
    const improvementAreas = selectedSkills.map((s) => s[1]);

    const summaryTemplates = {
      excellent: [
        `${candidate.name} delivered an outstanding interview performance, scoring ${finalScores.overall}% overall. Demonstrated exceptional capability across ${answers.length + 1} questions with particular strength in technical areas. Highly recommended for advancement.`,
        `${candidate.name} impressed with a stellar interview, achieving ${finalScores.overall}%. The responses were well-articulated, technically sound, and showed deep domain expertise. A strong candidate for the ${candidate.role} role.`,
        `An excellent performance from ${candidate.name} (${finalScores.overall}%). Combined strong technical knowledge with effective communication and confident delivery. Ready for the next stage of the hiring process.`,
      ],
      good: [
        `${candidate.name} performed well with an overall score of ${finalScores.overall}%. Answered ${answers.length + 1} questions with solid technical understanding. Some areas for refinement but shows strong potential for the ${candidate.role} role.`,
        `${candidate.name} delivered a good interview (${finalScores.overall}%). Demonstrated competence in key areas and responded well to most questions. With targeted improvement in specific areas, would be a strong hire.`,
        `A solid performance from ${candidate.name} scoring ${finalScores.overall}%. Shows good foundational knowledge and communication skills. Recommended with focus on strengthening weaker areas identified in this report.`,
      ],
      average: [
        `${candidate.name} delivered an average performance scoring ${finalScores.overall}%. While some answers showed promise, there is room for improvement in both technical depth and response quality. Consider upskilling before re-interview.`,
        `${candidate.name} scored ${finalScores.overall}% in the interview. Demonstrated basic competency but needs to develop deeper understanding of key concepts. A development plan is recommended before the next interview round.`,
        `Moderate performance from ${candidate.name} (${finalScores.overall}%). Some responses were on point while others lacked depth. Focused preparation on identified weak areas would significantly improve future performance.`,
      ],
      below_average: [
        `${candidate.name} scored ${finalScores.overall}%, indicating significant gaps in preparation and knowledge. Structured learning and mock interview practice are strongly recommended before reapplying.`,
        `The interview performance by ${candidate.name} (${finalScores.overall}%) suggests need for substantial preparation. Focus on building core competencies in the required skill areas and practicing interview responses.`,
      ],
    };

    const summaryList = summaryTemplates[tier] || summaryTemplates.average;
    const summary = pickRandom(summaryList);

    const recommendation = finalScores.overall >= 80 ? 'Strong Hire' : finalScores.overall >= 60 ? 'Hire' : finalScores.overall >= 45 ? 'Consider' : 'No Hire';

    const feedback = {
      strengths,
      weaknesses,
      recommendedSkills,
      improvementAreas,
      summary,
      recommendation,
      generatedAt: new Date().toISOString(),
    };

    sessionStorage.setItem('finalScores', JSON.stringify(finalScores));
    sessionStorage.setItem('feedback', JSON.stringify(feedback));
    navigate('/result');
  };

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  const canSubmit = transcript.trim().length > 10 && !isSpeaking && !isProcessing;

  return (
    <div className="page fade-in">
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>AI Interview Session</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          {candidate.name} &middot; {candidate.role} &middot; Question {Math.min(currentQ + 1, questions.length)} of {questions.length}
        </p>
      </div>

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
          {currentQ < questions.length ? (
            <QuestionCard
              question={questions[currentQ]}
              isSpeaking={isSpeaking}
              onRepeat={speakCurrentQuestion}
            />
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <h2 className="gradient-text" style={{ marginBottom: 12 }}>Interview Complete!</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                Great job! Generating your feedback report...
              </p>
            </div>
          )}

            <div className="card" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, color: 'var(--text-muted)' }}>CURRENT ANSWER</h3>
              <button
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: 13 }}
                onClick={toggleListening}
                disabled={isProcessing || interviewComplete}
              >
                {isListening ? '⏹ Stop' : '🎤 Speak'}
              </button>
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
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={submitAnswer}
                disabled={!canSubmit}
              >
                {isProcessing ? 'Submitting...' : 'Submit Answer'}
              </button>
              {interviewComplete && (
                <button className="btn btn-primary" onClick={handleFinish} disabled={isProcessing}>
                  View Results
                </button>
              )}
            </div>
          </div>
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
    </div>
  );
}
