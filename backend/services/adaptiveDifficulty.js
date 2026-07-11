const logger = require('../utils/logger');

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard', 'expert'];
const DIFFICULTY_THRESHOLDS = {
  easy: { minScore: 0, maxScore: 40, minAnswers: 2 },
  medium: { minScore: 41, maxScore: 65, minAnswers: 2 },
  hard: { minScore: 66, maxScore: 85, minAnswers: 3 },
  expert: { minScore: 86, maxScore: 100, minAnswers: 3 },
};

function determineDifficultyLevel(state) {
  if (!state || !state.answerHistory || state.answerHistory.length === 0) {
    return { level: 'easy', reason: 'No answers yet, starting with easy' };
  }

  const totalAnswers = state.answerHistory.length;
  const scores = state.answerHistory
    .filter((a) => a.scores && a.scores.overall !== undefined)
    .map((a) => a.scores.overall);

  if (scores.length === 0) {
    return { level: 'easy', reason: 'No scored answers yet' };
  }

  const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
  const trend = scores.length >= 3
    ? scores.slice(-3).reduce((s, v) => s + v, 0) / 3 - scores.slice(0, 3).reduce((s, v) => s + v, 0) / 3
    : 0;

  const adjustedScore = avgScore + (trend > 0 ? 5 : trend < 0 ? -5 : 0);
  const recentScore = scores.slice(-3).reduce((s, v) => s + v, 0) / Math.min(scores.length, 3);

  let level = 'easy';
  let reason = '';

  if (totalAnswers < 3) {
    if (avgScore > 60) {
      level = 'medium';
      reason = `Starting medium: avg score ${avgScore.toFixed(0)} above threshold`;
    } else {
      level = 'easy';
      reason = `Starting easy: only ${totalAnswers} answers`;
    }
  } else if (recentScore >= 86 && totalAnswers >= 5) {
    level = 'expert';
    reason = `Expert level: recent avg ${recentScore.toFixed(0)} with ${totalAnswers} answers`;
  } else if (recentScore >= 66) {
    level = 'hard';
    reason = `Hard level: recent avg ${recentScore.toFixed(0)}`;
  } else if (recentScore >= 41) {
    level = 'medium';
    reason = `Medium level: recent avg ${recentScore.toFixed(0)}`;
  } else {
    level = 'easy';
    reason = `Easy level: recent avg ${recentScore.toFixed(0)}`;
  }

  if (state.confidence && state.confidence < 0.3) {
    const downgrade = DIFFICULTY_LEVELS.indexOf(level);
    if (downgrade > 0) {
      level = DIFFICULTY_LEVELS[downgrade - 1];
      reason += '. Downgraded due to low confidence';
    }
  }

  if (state.stress && state.stress > 0.8) {
    const downgrade = DIFFICULTY_LEVELS.indexOf(level);
    if (downgrade > 0) {
      level = DIFFICULTY_LEVELS[downgrade - 1];
      reason += '. Downgraded due to high stress';
    }
  }

  return { level, reason, avgScore: Math.round(avgScore), recentScore: Math.round(recentScore), trend: Math.round(trend * 100) / 100 };
}

function getDifficultyBoost(level) {
  const boosts = { easy: 0, medium: 0.1, hard: 0.2, expert: 0.35 };
  return boosts[level] || 0;
}

function getDifficultyLabel(level) {
  const labels = { easy: 'Entry Level', medium: 'Intermediate', hard: 'Advanced', expert: 'Expert' };
  return labels[level] || 'Standard';
}

function calculateQuestionDifficulty(level, questionType) {
  const baseDifficulty = DIFFICULTY_LEVELS.indexOf(level);
  const typeModifier = questionType === 'technical' ? 1 : questionType === 'behavioral' ? 0 : -1;
  const adjustedIndex = Math.max(0, Math.min(3, baseDifficulty + typeModifier));
  return DIFFICULTY_LEVELS[adjustedIndex];
}

module.exports = {
  determineDifficultyLevel,
  getDifficultyBoost,
  getDifficultyLabel,
  calculateQuestionDifficulty,
  DIFFICULTY_LEVELS,
};
