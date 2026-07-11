const logger = require('../utils/logger');

const sessions = {};

const recruiterAnalytics = {
  registerSession(sessionId, data = {}) {
    sessions[sessionId] = {
      id: sessionId,
      name: data.name || 'Unknown',
      email: data.email || '',
      role: data.role || 'Unknown',
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      completedAt: null,
      scores: {},
      answers: [],
      currentQuestion: null,
      currentEmotion: null,
      currentConfidence: null,
      currentStress: null,
      currentEngagement: null,
      eyeContact: null,
      warnings: [],
      speechSpeed: null,
      questionCount: 0,
      progress: 0,
      emotionHistory: [],
      confidenceHistory: [],
    };
    return sessions[sessionId];
  },

  updateLiveData(sessionId, data) {
    const session = sessions[sessionId];
    if (!session) return false;

    if (data.currentQuestion !== undefined) session.currentQuestion = data.currentQuestion;
    if (data.currentEmotion !== undefined) {
      session.currentEmotion = data.currentEmotion;
      session.emotionHistory.push({ emotion: data.currentEmotion, timestamp: new Date().toISOString() });
    }
    if (data.currentConfidence !== undefined) {
      session.currentConfidence = data.currentConfidence;
      session.confidenceHistory.push({ confidence: data.currentConfidence, timestamp: new Date().toISOString() });
    }
    if (data.currentStress !== undefined) session.currentStress = data.currentStress;
    if (data.currentEngagement !== undefined) session.currentEngagement = data.currentEngagement;
    if (data.eyeContact !== undefined) session.eyeContact = data.eyeContact;
    if (data.speechSpeed !== undefined) session.speechSpeed = data.speechSpeed;
    if (data.warning !== undefined) {
      session.warnings.push({ message: data.warning, timestamp: new Date().toISOString() });
    }
    if (data.answer !== undefined) {
      session.answers.push({ text: data.answer, timestamp: new Date().toISOString() });
      session.questionCount = session.answers.length;
    }
    if (data.progress !== undefined) session.progress = data.progress;

    if (session.emotionHistory.length > 100) session.emotionHistory = session.emotionHistory.slice(-100);
    if (session.confidenceHistory.length > 100) session.confidenceHistory = session.confidenceHistory.slice(-100);

    return true;
  },

  completeSession(sessionId, finalScores = {}) {
    const session = sessions[sessionId];
    if (!session) return null;
    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    session.scores = finalScores;
    return session;
  },

  getLiveSession(sessionId) {
    return sessions[sessionId] || null;
  },

  getAllLiveSessions() {
    return Object.values(sessions)
      .filter((s) => s.status === 'in_progress')
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  },

  getCompletedSessions() {
    return Object.values(sessions)
      .filter((s) => s.status === 'completed')
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  },

  getCandidateRanking() {
    const completed = this.getCompletedSessions();
    const ranked = completed
      .filter((s) => s.scores && s.scores.overall)
      .sort((a, b) => (b.scores.overall || 0) - (a.scores.overall || 0))
      .map((s, i) => ({
        rank: i + 1,
        name: s.name,
        email: s.email,
        role: s.role,
        overall: s.scores.overall || 0,
        technical: s.scores.technical || 0,
        communication: s.scores.communication || 0,
        duration: s.completedAt ? Math.round((new Date(s.completedAt) - new Date(s.startedAt)) / 60000) : 0,
        questionCount: s.questionCount,
      }));
    return ranked;
  },

  getHiringRecommendations() {
    const completed = this.getCompletedSessions();
    const recommendations = completed.map((s) => {
      const overall = s.scores.overall || 0;
      let decision = 'reject';
      let confidence = 0;

      if (overall >= 80) {
        decision = 'strong_hire';
        confidence = 0.9;
      } else if (overall >= 65) {
        decision = 'hire';
        confidence = 0.7;
      } else if (overall >= 50) {
        decision = 'consider';
        confidence = 0.5;
      } else {
        decision = 'reject';
        confidence = 0.8;
      }

      return {
        name: s.name,
        role: s.role,
        overall,
        decision,
        confidence,
        reason: getHiringReason(decision, s.scores),
        scores: s.scores,
      };
    });
    return recommendations.sort((a, b) => b.overall - a.overall);
  },

  getSkillDistribution() {
    const completed = this.getCompletedSessions();
    const distribution = {};

    for (const session of completed) {
      const scores = session.scores || {};
      for (const [key, value] of Object.entries(scores)) {
        if (typeof value === 'number' && ['technical', 'communication', 'confidence', 'behavior', 'emotion'].includes(key)) {
          if (!distribution[key]) distribution[key] = [];
          distribution[key].push(value);
        }
      }
    }

    const result = {};
    for (const [key, values] of Object.entries(distribution)) {
      if (values.length > 0) {
        result[key] = {
          avg: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
          min: Math.round(Math.min(...values)),
          max: Math.round(Math.max(...values)),
          median: Math.round(values.sort((a, b) => a - b)[Math.floor(values.length / 2)]),
          sampleSize: values.length,
        };
      }
    }
    return result;
  },

  getAggregatedStats() {
    const completed = this.getCompletedSessions();
    if (completed.length === 0) {
      return { totalSessions: 0, message: 'No completed sessions' };
    }

    const avgDuration = completed
      .filter((s) => s.completedAt)
      .reduce((s, session) => {
        const duration = (new Date(session.completedAt) - new Date(session.startedAt)) / 60000;
        return s + duration;
      }, 0) / completed.length;

    const avgQuestions = completed.reduce((s, session) => s + session.questionCount, 0) / completed.length;

    const avgScores = {};
    const dims = ['technical', 'communication', 'confidence', 'behavior', 'emotion', 'overall'];
    for (const dim of dims) {
      const values = completed.map((s) => s.scores[dim]).filter((v) => v !== undefined);
      if (values.length > 0) {
        avgScores[dim] = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      }
    }

    return {
      totalSessions: completed.length,
      activeSessions: this.getAllLiveSessions().length,
      avgDurationMinutes: Math.round(avgDuration),
      avgQuestionsPerInterview: Math.round(avgQuestions * 10) / 10,
      avgScores,
      performanceTrend: calculateTrend(completed),
      timestamp: new Date().toISOString(),
    };
  },

  generateInsights() {
    return {
      stats: this.getAggregatedStats(),
      ranking: this.getCandidateRanking(),
      hiringRecommendations: this.getHiringRecommendations(),
      skillDistribution: this.getSkillDistribution(),
      generatedAt: new Date().toISOString(),
    };
  },

  _getAll() {
    return sessions;
  },
};

function getHiringReason(decision, scores) {
  const reasons = {
    strong_hire: 'Excellent performance across all dimensions. Strongly recommended.',
    hire: 'Good overall performance. Meets requirements for the role.',
    consider: 'Average performance. Consider for specific strengths.',
    reject: 'Below expected performance for this role.',
  };
  return reasons[decision] || 'Review required';
}

function calculateTrend(completed) {
  if (completed.length < 3) return null;
  const sorted = [...completed].sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
  const recent = sorted.slice(-3).map((s) => s.scores.overall || 0);
  if (recent.length < 2) return null;
  return recent[recent.length - 1] > recent[0] ? 'improving' : recent[recent.length - 1] < recent[0] ? 'declining' : 'stable';
}

module.exports = recruiterAnalytics;
