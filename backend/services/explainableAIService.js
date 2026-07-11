const crossAttentionFusion = require('../utils/crossAttentionFusion');
const logger = require('../utils/logger');

function buildEvidence(dimension, score, contributors, metadata = {}) {
  return {
    dimension,
    score: Math.round(score),
    evidence: contributors.map((c) => ({
      factor: c.name,
      contribution: c.value,
      weight: c.weight || 0,
      reason: c.reason || '',
    })),
    totalContributions: contributors.reduce((s, c) => s + c.value, 0),
    confidence: metadata.confidence || 0.85,
    timestamp: new Date().toISOString(),
  };
}

const explainableAI = {
  explainTechnical(score, answerText, questionText, keywords = []) {
    const contributors = [];
    const keywordMatches = keywords.filter((k) => answerText.toLowerCase().includes(k.toLowerCase()));
    const keywordScore = keywords.length > 0 ? (keywordMatches.length / keywords.length) * 100 : 50;
    contributors.push({ name: 'Keyword Match', value: Math.round(keywordScore * 0.3), weight: 0.3, reason: `${keywordMatches.length}/${keywords.length} key terms matched` });

    const wordCount = answerText.split(/\s+/).length;
    const lengthScore = Math.min(100, (wordCount / 50) * 100);
    contributors.push({ name: 'Answer Length', value: Math.round(lengthScore * 0.15), weight: 0.15, reason: `${wordCount} words provided` });

    const structureWords = ['first', 'second', 'finally', 'because', 'therefore', 'example', 'specifically', 'additionally', 'however', 'conclusion'];
    const structureCount = structureWords.filter((w) => answerText.toLowerCase().includes(w)).length;
    const structureScore = Math.min(100, structureCount * 20);
    contributors.push({ name: 'Structure', value: Math.round(structureScore * 0.2), weight: 0.2, reason: `${structureCount} structural markers detected` });

    const relevanceScore = Math.min(100, (keywordScore + lengthScore) / 2);
    contributors.push({ name: 'Relevance', value: Math.round(relevanceScore * 0.2), weight: 0.2, reason: 'Semantic relevance to question' });

    const confidence = Math.min(0.95, 0.7 + keywordScore / 500);

    return buildEvidence('Technical', score, contributors, { confidence });
  },

  explainCommunication(score, answerText) {
    const contributors = [];
    const words = answerText.split(/\s+/);
    const totalWords = words.length;

    const fillerWords = ['um', 'uh', 'like', 'basically', 'actually', 'literally', 'sort of', 'kind of', 'you know', 'i mean', 'well', 'so'];
    const fillerCount = fillerWords.reduce((s, fw) => {
      const regex = new RegExp(`\\b${fw}\\b`, 'gi');
      const matches = answerText.match(regex);
      return s + (matches ? matches.length : 0);
    }, 0);
    const fillerScore = Math.max(0, 100 - (fillerCount / Math.max(totalWords, 1)) * 200);
    contributors.push({ name: 'Clarity', value: Math.round(fillerScore * 0.35), weight: 0.35, reason: `${fillerCount} filler words detected` });

    const avgWordLen = words.reduce((s, w) => s + w.length, 0) / Math.max(totalWords, 1);
    const vocabScore = Math.min(100, (avgWordLen / 8) * 100);
    contributors.push({ name: 'Vocabulary', value: Math.round(vocabScore * 0.25), weight: 0.25, reason: `Average word length: ${avgWordLen.toFixed(1)} chars` });

    const sentences = answerText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const avgSentenceLen = sentences.length > 0 ? totalWords / sentences.length : 0;
    const grammarScore = avgSentenceLen > 3 && avgSentenceLen < 40 ? 85 : Math.max(40, 100 - Math.abs(avgSentenceLen - 20) * 2);
    contributors.push({ name: 'Grammar', value: Math.round(grammarScore * 0.25), weight: 0.25, reason: `${sentences.length} sentences, avg ${avgSentenceLen.toFixed(1)} words` });

    const completeness = Math.min(100, (totalWords / 30) * 100);
    contributors.push({ name: 'Completeness', value: Math.round(completeness * 0.15), weight: 0.15, reason: `${totalWords} total words` });

    const confidence = Math.min(0.9, 0.7 + (100 - fillerScore) / 500);

    return buildEvidence('Communication', score, contributors, { confidence });
  },

  explainConfidence(score, audioFeatures, textFeatures) {
    const contributors = [];
    const speechRate = audioFeatures?.speechRate || textFeatures?.speechRate || 150;
    const rateScore = speechRate > 100 && speechRate < 200 ? 85 : Math.max(40, 100 - Math.abs(speechRate - 150) * 0.5);
    contributors.push({ name: 'Speech Rate', value: Math.round(rateScore * 0.25), weight: 0.25, reason: `${Math.round(speechRate)} wpm` });

    const hesitationScore = textFeatures?.hesitationRatio !== undefined
      ? Math.max(0, 100 - textFeatures.hesitationRatio * 200)
      : 70;
    contributors.push({ name: 'Hesitation', value: Math.round(hesitationScore * 0.25), weight: 0.25, reason: `Hesitation ratio: ${textFeatures?.hesitationRatio?.toFixed(2) || 'N/A'}` });

    const assertiveness = textFeatures?.assertiveCount
      ? Math.min(100, textFeatures.assertiveCount * 25)
      : 60;
    contributors.push({ name: 'Assertiveness', value: Math.round(assertiveness * 0.2), weight: 0.2, reason: `${textFeatures?.assertiveCount || 0} assertive statements` });

    const audioConf = audioFeatures?.confidence !== undefined ? audioFeatures.confidence * 100 : 70;
    contributors.push({ name: 'Audio Confidence', value: Math.round(audioConf * 0.2), weight: 0.2, reason: `Voice confidence: ${Math.round(audioConf)}%` });

    const confidence = Math.min(0.95, 0.65 + Math.max(rateScore, hesitationScore) / 500);

    return buildEvidence('Confidence', score, contributors, { confidence });
  },

  explainBehavior(score, behaviorData) {
    const contributors = [];
    const engagement = behaviorData?.engagement !== undefined ? behaviorData.engagement * 100 : 70;
    contributors.push({ name: 'Engagement', value: Math.round(engagement * 0.3), weight: 0.3, reason: `Engagement level: ${Math.round(engagement)}%` });

    const eyeContact = behaviorData?.eyeContact !== undefined ? behaviorData.eyeContact * 100 : 75;
    contributors.push({ name: 'Eye Contact', value: Math.round(eyeContact * 0.25), weight: 0.25, reason: `Eye contact: ${Math.round(eyeContact)}%` });

    const posture = behaviorData?.posture !== undefined ? behaviorData.posture * 100 : 70;
    contributors.push({ name: 'Posture', value: Math.round(posture * 0.2), weight: 0.2, reason: `Posture score: ${Math.round(posture)}%` });

    const expression = behaviorData?.expression || 'neutral';
    const expressionScore = expression === 'neutral' || expression === 'happy' ? 80 : 60;
    contributors.push({ name: 'Expression', value: Math.round(expressionScore * 0.15), weight: 0.15, reason: `Dominant expression: ${expression}` });

    const confidence = Math.min(0.9, 0.6 + engagement / 400);

    return buildEvidence('Behavior', score, contributors, { confidence });
  },

  explainEmotion(score, emotionData) {
    const contributors = [];
    const stability = emotionData?.stability !== undefined ? emotionData.stability * 100 : 70;
    contributors.push({ name: 'Stability', value: Math.round(stability * 0.3), weight: 0.3, reason: `Emotion stability: ${Math.round(stability)}%` });

    const stress = emotionData?.stress !== undefined ? (1 - emotionData.stress) * 100 : 65;
    contributors.push({ name: 'Stress Management', value: Math.round(stress * 0.25), weight: 0.25, reason: `Stress level: ${Math.round(100 - stress)}%` });

    const confidence = emotionData?.confidence !== undefined ? emotionData.confidence * 100 : 70;
    contributors.push({ name: 'Emotional Confidence', value: Math.round(confidence * 0.2), weight: 0.2, reason: `Emotion detection confidence: ${Math.round(confidence)}%` });

    const recovery = emotionData?.recoveryAbility !== undefined ? emotionData.recoveryAbility * 100 : 70;
    contributors.push({ name: 'Recovery', value: Math.round(recovery * 0.15), weight: 0.15, reason: `Recovery ability: ${Math.round(recovery)}%` });

    const confidence_ = Math.min(0.9, 0.6 + stability / 400);

    return buildEvidence('Emotion', score, contributors, { confidence: confidence_ });
  },

  explainOverall(overallScore, dimensionScores) {
    const dimensions = ['Technical', 'Communication', 'Confidence', 'Behavior', 'Emotion'];
    const weights = { Technical: 0.25, Communication: 0.2, Confidence: 0.2, Behavior: 0.2, Emotion: 0.15 };
    const contributors = dimensions.map((d) => ({
      name: d,
      value: Math.round((dimensionScores[d.toLowerCase()] || 0) * (weights[d] || 0.2)),
      weight: weights[d] || 0.2,
      reason: `${d} score: ${Math.round(dimensionScores[d.toLowerCase()] || 0)}`,
      fullScore: Math.round(dimensionScores[d.toLowerCase()] || 0),
    }));

    const totalWeighted = contributors.reduce((s, c) => s + c.value, 0);
    const confidence = Math.min(0.95, 0.7 + totalWeighted / 2000);

    return {
      dimension: 'Overall',
      score: Math.round(overallScore),
      evidence: contributors,
      totalContributions: totalWeighted,
      confidence,
      timestamp: new Date().toISOString(),
    };
  },

  generateFullReport(scores, metadata = {}) {
    const report = {
      overall: this.explainOverall(scores.overall || 0, scores),
      dimensions: {},
      metadata: {
        candidateName: metadata.name || 'Unknown',
        role: metadata.role || 'Unknown',
        totalAnswers: metadata.totalAnswers || 0,
        interviewDuration: metadata.duration || 0,
        generatedAt: new Date().toISOString(),
      },
    };

    const dimensionMap = {
      technical: 'explainTechnical',
      communication: 'explainCommunication',
      confidence: 'explainConfidence',
      behavior: 'explainBehavior',
      emotion: 'explainEmotion',
    };

    for (const [key, method] of Object.entries(dimensionMap)) {
      if (scores[key] !== undefined) {
        report.dimensions[key] = this[method](scores[key], scores._answerText || '', scores._questionText || '', scores._keywords || []);
      }
    }

    return report;
  },
};

module.exports = explainableAI;
