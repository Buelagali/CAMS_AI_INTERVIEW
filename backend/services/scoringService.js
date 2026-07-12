exports.calculateScore = ({ answers, resumeMatch, skillGraph, roleMatch, unified }) => {
  const technicalScores = answers
    .filter((a) => a.questionType === 'technical' || a.questionType === 'adaptive')
    .map((a) => a.semanticScore || 0);

  const communicationScores = answers.map((a) => {
    const text = (a.answer || '').trim();
    if (!text) return 0;
    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : wordCount;
    const fillerPattern = /\b(um|uh|like|basically|actually|sort of|kind of|you know|i mean)\b/gi;
    const fillerCount = (text.match(fillerPattern) || []).length;
    const hasTelugu = /[\u0C00-\u0C7F]/.test(text);

    let score = 30;
    if (wordCount >= 40) score += 35;
    else if (wordCount >= 20) score += 20;
    else if (wordCount >= 10) score += 10;
    if (avgWordsPerSentence >= 6 && avgWordsPerSentence <= 22) score += 15;
    if (fillerCount === 0) score += 10;
    else if (fillerCount <= 2) score += 5;
    else score -= Math.min(20, fillerCount * 5);
    if (hasTelugu) score = Math.min(score, 40);
    return Math.max(5, Math.min(100, score));
  });

  const confidenceScores = answers.map((a) => {
    const text = (a.answer || '').trim();
    if (!text) return 10;
    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const assertiveWords = ['i think', 'i believe', 'i know', 'i am confident', 'certainly', 'definitely', 'absolutely'];
    const hesitantWords = ['maybe', 'perhaps', 'i guess', 'not sure', 'probably', 'might', 'could be', 'i dont know'];
    const assertiveCount = assertiveWords.filter((w) => text.toLowerCase().includes(w)).length;
    const hesitantCount = hesitantWords.filter((w) => text.toLowerCase().includes(w)).length;
    let score = 40;
    if (wordCount >= 30) score += 15;
    else if (wordCount >= 15) score += 8;
    if (assertiveCount > 0) score += Math.min(25, assertiveCount * 10);
    if (hesitantCount > 0) score -= Math.min(30, hesitantCount * 10);
    const audioConf = a.confidenceScore || 0;
    score = score * 0.6 + audioConf * 0.4;
    return Math.max(10, Math.min(100, Math.round(score)));
  });

  const behaviorScores = answers.map((a) => {
    const text = (a.answer || '').trim();
    if (!text) return 30;
    const words = text.split(/\s+/).filter(Boolean);
    const poorPatterns = ['i don\'t know', 'i\'m not sure', 'i have no idea', 'pass', 'skip', 'next'];
    const hasPoor = poorPatterns.some((p) => text.toLowerCase().includes(p));
    const teamWords = text.match(/\b(team|collaborat|together|helped|mentor|support|lead|guid|coach)\b/gi);
    const structureWords = text.match(/\b(first|second|then|finally|however|therefore|because|example|approach|method|framework)\b/gi);
    let score = 40;
    if (hasPoor) score = 15;
    else {
      if (teamWords && teamWords.length >= 2) score += 15;
      else if (teamWords && teamWords.length === 1) score += 8;
      if (structureWords && structureWords.length >= 3) score += 15;
      else if (structureWords && structureWords.length >= 1) score += 5;
      if (words.length >= 40) score += 15;
      else if (words.length >= 20) score += 8;
    }
    return Math.max(5, Math.min(100, score));
  });

  const emotionScores = answers
    .filter((a) => a.emotionData)
    .map((a) => {
      const em = a.emotionData;
      if (typeof em === 'object' && em !== null) {
        const stable = em.Neutral || em.Confident || 0;
        return typeof stable === 'number' ? stable * 100 : 50;
      }
      return 50;
    });

  const semanticScores = answers.map((a) => a.semanticScore || 0);
  const difficulties = answers.map((a) => a.difficulty || 1);

  const avgTechnical = technicalScores.length
    ? Math.round(technicalScores.reduce((a, b) => a + b, 0) / technicalScores.length)
    : 0;

  const avgCommunication = communicationScores.length
    ? Math.round(communicationScores.reduce((a, b) => a + b, 0) / communicationScores.length)
    : 0;

  const avgConfidence = confidenceScores.length
    ? Math.round(confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length)
    : 0;

  const avgBehavior = behaviorScores.length
    ? Math.round(behaviorScores.reduce((a, b) => a + b, 0) / behaviorScores.length)
    : 0;

  const avgEmotion = emotionScores.length
    ? Math.round(emotionScores.reduce((a, b) => a + b, 0) / emotionScores.length)
    : 50;

  const avgSemantic = semanticScores.length
    ? Math.round(semanticScores.reduce((a, b) => a + b, 0) / semanticScores.length)
    : 0;

  const avgDifficulty = difficulties.length
    ? difficulties.reduce((a, b) => a + b, 0) / difficulties.length
    : 1;

  const difficultyBonus = Math.min(1.2, 1 + (avgDifficulty - 1) * 0.08);

  const unifiedTechBoost = unified?.technicalBoost || 0.5;
  const unifiedBehavior = unified?.behaviorScore || 0.5;
  const unifiedEmotion = unified?.emotionScore || 0.5;
  const unifiedEngagement = unified?.engagementScore || 0.5;
  const unifiedConfidence = unified?.confidenceBoost || 0.5;
  const signalStrength = unified?.signalStrength || 0.5;

  const technicalWeight = 0.25;
  const communicationWeight = 0.15;
  const confidenceWeight = 0.10;
  const behaviorWeight = 0.10;
  const resumeMatchWeight = 0.15;
  const semanticWeight = 0.10;
  const emotionWeight = 0.05;
  const roleMatchWeight = 0.10;

  const technicalFinal = Math.round(avgTechnical * (0.5 + 0.5 * unifiedTechBoost) * difficultyBonus);
  const communicationFinal = Math.round(avgCommunication);
  const confidenceFinal = Math.round(avgConfidence * (0.6 + 0.4 * unifiedConfidence));
  const behaviorFinal = Math.round(avgBehavior * (0.5 + 0.5 * unifiedBehavior));
  const resumeMatchScore = Math.round(resumeMatch || 0);
  const skillGraphScore = Math.round(skillGraph || 0);
  const resumeMatchFinal = Math.round(resumeMatchScore * 0.6 + skillGraphScore * 0.4);
  const semanticFinal = Math.round(avgSemantic);
  const emotionFinal = Math.round(avgEmotion * (0.5 + 0.5 * unifiedEmotion));
  const roleMatchFinal = Math.round(roleMatch || 0);

  const overall = Math.round(
    technicalFinal * technicalWeight +
    communicationFinal * communicationWeight +
    confidenceFinal * confidenceWeight +
    behaviorFinal * behaviorWeight +
    resumeMatchFinal * resumeMatchWeight +
    semanticFinal * semanticWeight +
    emotionFinal * emotionWeight +
    roleMatchFinal * roleMatchWeight
  );

  const evidence = {
    technicalScores,
    communicationScores,
    confidenceScores,
    behaviorScores,
    semanticScores,
    emotionScores,
    difficulties,
    answerCount: answers.length,
    technicalAnswerCount: technicalScores.length,
    hasVideoData: answers.some((a) => a.emotionData || a.visionAnalysis),
    hasAudioData: answers.some((a) => a.audioAnalysis),
    unifiedTechBoost: Math.round(unifiedTechBoost * 100) / 100,
    unifiedBehavior: Math.round(unifiedBehavior * 100) / 100,
    unifiedEmotion: Math.round(unifiedEmotion * 100) / 100,
    unifiedConfidence: Math.round(unifiedConfidence * 100) / 100,
    signalStrength: Math.round(signalStrength * 100) / 100,
  };

  return {
    technical: Math.min(100, Math.max(0, technicalFinal)),
    communication: Math.min(100, Math.max(0, communicationFinal)),
    confidence: Math.min(100, Math.max(0, confidenceFinal)),
    behavior: Math.min(100, Math.max(0, behaviorFinal)),
    resumeMatch: Math.min(100, Math.max(0, resumeMatchFinal)),
    skillGraph: Math.min(100, Math.max(0, skillGraphScore)),
    semantic: Math.min(100, Math.max(0, semanticFinal)),
    emotion: Math.min(100, Math.max(0, emotionFinal)),
    roleMatch: Math.min(100, Math.max(0, roleMatchFinal)),
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
    evidence,
    scoreWeights: {
      technical: technicalWeight,
      communication: communicationWeight,
      confidence: confidenceWeight,
      behavior: behaviorWeight,
      resumeMatch: resumeMatchWeight,
      semantic: semanticWeight,
      emotion: emotionWeight,
      roleMatch: roleMatchWeight,
    },
  };
};
