exports.calculateScore = ({ answers, resumeMatch, skillGraph, unified }) => {
  const semanticScores = answers.map((a) => a.semanticScore || 0);
  const confidenceScores = answers.map((a) => a.confidenceScore || 0);
  const difficulties = answers.map((a) => a.difficulty || 1);

  const avgSemantic = semanticScores.length
    ? semanticScores.reduce((a, b) => a + b, 0) / semanticScores.length
    : 0;

  const avgConfidence = confidenceScores.length
    ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
    : 0;

  const avgDifficulty = difficulties.length
    ? difficulties.reduce((a, b) => a + b, 0) / difficulties.length
    : 1;

  const difficultyBonus = Math.min(1.2, 1 + (avgDifficulty - 1) * 0.1);

  const technical = Math.round(avgSemantic * (unified?.technicalBoost || 1) * difficultyBonus);
  const communication = Math.round(avgSemantic * 0.8 + avgConfidence * 0.2);
  const confidence = Math.round(avgConfidence);
  const behavior = Math.round(unified?.behaviorScore || 50 + Math.random() * 20);
  const resumeMatchScore = Math.round(resumeMatch);
  const skillGraphScore = Math.round(skillGraph);
  const semantic = Math.round(avgSemantic);
  const emotion = Math.round(unified?.emotionScore || 50 + Math.random() * 20);

  const overall = Math.round(
    technical * 0.30 +
    communication * 0.15 +
    confidence * 0.15 +
    behavior * 0.10 +
    resumeMatchScore * 0.15 +
    semantic * 0.15
  );

  return {
    technical: Math.min(100, Math.max(0, technical)),
    communication: Math.min(100, Math.max(0, communication)),
    confidence: Math.min(100, Math.max(0, confidence)),
    behavior: Math.min(100, Math.max(0, behavior)),
    resumeMatch: Math.min(100, Math.max(0, resumeMatchScore)),
    skillGraph: Math.min(100, Math.max(0, skillGraphScore)),
    semantic: Math.min(100, Math.max(0, semantic)),
    emotion: Math.min(100, Math.max(0, emotion)),
    overall: Math.min(100, Math.max(0, overall)),
    avgDifficulty: Math.round(avgDifficulty * 100) / 100,
    difficultyBonus: Math.round(difficultyBonus * 100) / 100,
    adaptiveMetrics: {
      questionsAtDifficulty: {
        beginner: difficulties.filter((d) => d <= 1).length,
        intermediate: difficulties.filter((d) => d === 2).length,
        advanced: difficulties.filter((d) => d >= 3).length,
      },
      scoreProgression: answers.map((a, i) => ({
        question: i + 1,
        score: a.semanticScore || 0,
        difficulty: a.difficulty || 1,
        type: a.questionType,
      })),
    },
  };
};
