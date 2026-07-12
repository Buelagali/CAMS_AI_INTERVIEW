const POSITIVE_EMOTIONS = ['Happy', 'Confident', 'Neutral'];
const NEGATIVE_EMOTIONS = ['Nervous', 'Angry', 'Sad'];
const STRESS_EMOTIONS = ['Nervous', 'Angry'];

const EMOTION_VALENCE = {
  'Happy': 1.0, 'Confident': 0.8, 'Neutral': 0.5,
  'Sad': 0.25, 'Nervous': 0.15, 'Angry': 0.1,
};

export function analyzeEmotionStability({ emotionHistory, emotionScoresHistory, confidenceHistory, answers }) {
  console.debug(`[EmotionStability] inputs: emotionHistory=${emotionHistory?.length ?? 0}, emotionScoresHistory=${emotionScoresHistory?.length ?? 0}, confidenceHistory=${confidenceHistory?.length ?? 0}, answers=${answers?.length ?? 0}`);

  if (!emotionHistory || emotionHistory.length === 0) {
    console.debug('[EmotionStability] no emotion data, returning score=0');
    return {
      score: 0,
      evidence: ['No emotion data captured during the interview.'],
      subScores: {
        sequenceStability: 0,
        confidenceStability: 0,
        stressTrend: 0,
        nervousnessTrend: 0,
        confidenceTrend: 0,
        engagementTrend: 0,
        fluctuationScore: 0,
        recoveryAbility: 0,
      },
    };
  }

  const n = emotionHistory.length;

  const sequenceStability = analyzeEmotionSequence(emotionHistory);
  const confidenceStability = analyzeConfidenceStability(emotionScoresHistory, emotionHistory);
  const stressTrend = analyzeStressTrend(emotionHistory);
  const nervousnessTrend = analyzeNervousnessTrend(emotionHistory);
  const confidenceTrend = analyzeConfidenceTrend(emotionHistory);
  const engagementTrend = analyzeEngagementTrend(emotionHistory, confidenceHistory);
  const fluctuationScore = analyzeFluctuations(emotionHistory);
  const recoveryAbility = analyzeRecovery(emotionHistory, answers);

  const evidence = buildEvidence(
    n, emotionHistory, emotionScoresHistory, confidenceHistory, answers,
    sequenceStability, confidenceStability, stressTrend,
    nervousnessTrend, confidenceTrend, engagementTrend,
    fluctuationScore, recoveryAbility
  );

  const score = computeFinalScore({
    sequenceStability,
    confidenceStability,
    stressTrend,
    nervousnessTrend,
    confidenceTrend,
    engagementTrend,
    fluctuationScore,
    recoveryAbility,
  });

  console.debug(`[EmotionStability] n=${n}, sub-scores:`, { sequenceStability, confidenceStability, stressTrend, nervousnessTrend, confidenceTrend, engagementTrend, fluctuationScore, recoveryAbility, weightScore: score.toFixed(1) });

  return {
    score: Math.round(Math.max(0, Math.min(100, score))),
    evidence,
    subScores: {
      sequenceStability,
      confidenceStability,
      stressTrend,
      nervousnessTrend,
      confidenceTrend,
      engagementTrend,
      fluctuationScore,
      recoveryAbility,
    },
  };
}

function analyzeEmotionSequence(history) {
  if (history.length < 2) return 50;

  let transitions = 0;
  let consecutiveStable = 0;
  let maxConsecutiveStable = 0;

  for (let i = 1; i < history.length; i++) {
    if (history[i] !== history[i - 1]) {
      transitions++;
      consecutiveStable = 0;
    } else {
      consecutiveStable++;
      if (consecutiveStable > maxConsecutiveStable) {
        maxConsecutiveStable = consecutiveStable;
      }
    }
  }

  const transitionRate = transitions / Math.max(1, history.length - 1);
  const stabilityDurationRatio = maxConsecutiveStable / Math.max(1, history.length);

  let score = 0;
  if (transitionRate < 0.05) score = 90;
  else if (transitionRate < 0.12) score = 80;
  else if (transitionRate < 0.2) score = 70;
  else if (transitionRate < 0.3) score = 55;
  else if (transitionRate < 0.4) score = 40;
  else if (transitionRate < 0.55) score = 25;
  else score = 15;

  score = score * 0.7 + (stabilityDurationRatio * 100) * 0.3;

  const valenceSwings = countValenceSwings(history);
  score -= Math.min(20, valenceSwings * 3);

  return Math.max(0, Math.min(100, score));
}

function countValenceSwings(history) {
  if (history.length < 3) return 0;
  let swings = 0;
  for (let i = 2; i < history.length; i++) {
    const v1 = EMOTION_VALENCE[history[i - 2]] || 0.5;
    const v2 = EMOTION_VALENCE[history[i - 1]] || 0.5;
    const v3 = EMOTION_VALENCE[history[i]] || 0.5;
    if (Math.abs(v1 - v2) > 0.5 && Math.abs(v2 - v3) > 0.5) {
      swings++;
    }
  }
  return swings;
}

function analyzeConfidenceStability(scoreHistory, emotionHistory) {
  if (!scoreHistory || scoreHistory.length < 2) return 50;

  const confidences = [];
  for (const scores of scoreHistory) {
    if (scores && typeof scores === 'object') {
      const neutral = scores.Neutral || 0;
      const confident = scores.Confident || 0;
      const happy = scores.Happy || 0;
      const maxVal = Math.max(neutral, confident, happy, scores.Nervous || 0, scores.Sad || 0, scores.Angry || 0);
      confidences.push(maxVal);
    }
  }

  if (confidences.length < 2) return 50;

  const avgConf = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  const variance = confidences.reduce((a, b) => a + (b - avgConf) ** 2, 0) / confidences.length;
  const stdDev = Math.sqrt(variance);

  let stability = 0;
  if (stdDev < 0.05) stability = 90;
  else if (stdDev < 0.1) stability = 80;
  else if (stdDev < 0.15) stability = 70;
  else if (stdDev < 0.2) stability = 55;
  else if (stdDev < 0.3) stability = 35;
  else stability = 20;

  if (avgConf > 0.7) stability = Math.min(95, stability + 10);
  else if (avgConf < 0.3) stability = Math.max(10, stability - 15);

  return Math.max(0, Math.min(100, stability));
}

function analyzeStressTrend(history) {
  if (history.length < 3) return 50;

  const windowSize = Math.max(2, Math.floor(history.length / 4));
  const windows = [];

  for (let i = 0; i <= history.length - windowSize; i += Math.max(1, Math.floor(windowSize / 2))) {
    const window = history.slice(i, i + windowSize);
    const stressCount = window.filter(e => STRESS_EMOTIONS.includes(e)).length;
    windows.push(stressCount / windowSize);
  }

  if (windows.length < 2) {
    const totalStress = history.filter(e => STRESS_EMOTIONS.includes(e)).length / history.length;
    return (1 - totalStress) * 100;
  }

  const increasingStress = windows.slice(1).filter((w, i) => w > windows[i]).length;
  const trendDirection = increasingStress / (windows.length - 1);

  const overallStress = history.filter(e => STRESS_EMOTIONS.includes(e)).length / history.length;
  const neutralRun = calculateLongestStableRun(history, 'Neutral');

  let score = (1 - overallStress) * 60;
  score += (neutralRun / Math.max(1, history.length)) * 20;

  if (trendDirection < 0.3) score += 20;
  else if (trendDirection < 0.5) score += 10;
  else score -= 10;

  const recentStress = history.slice(-Math.min(10, history.length))
    .filter(e => STRESS_EMOTIONS.includes(e)).length / Math.min(10, history.length);
  if (recentStress > 0.3) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function analyzeNervousnessTrend(history) {
  if (history.length < 3) return 50;

  const nervousCount = history.filter(e => e === 'Nervous').length;
  const nervousRatio = nervousCount / history.length;

  const nervousRuns = [];
  let currentRun = 0;
  for (const e of history) {
    if (e === 'Nervous') {
      currentRun++;
    } else if (currentRun > 0) {
      nervousRuns.push(currentRun);
      currentRun = 0;
    }
  }
  if (currentRun > 0) nervousRuns.push(currentRun);

  const avgRunLength = nervousRuns.length > 0
    ? nervousRuns.reduce((a, b) => a + b, 0) / nervousRuns.length
    : 0;

  const firstHalf = history.slice(0, Math.floor(history.length / 2));
  const secondHalf = history.slice(Math.floor(history.length / 2));
  const firstNervous = firstHalf.filter(e => e === 'Nervous').length / Math.max(1, firstHalf.length);
  const secondNervous = secondHalf.filter(e => e === 'Nervous').length / Math.max(1, secondHalf.length);
  const trendImproving = secondNervous < firstNervous;

  let score = (1 - nervousRatio) * 50;
  if (avgRunLength <= 1) score += 20;
  else if (avgRunLength <= 2) score += 10;
  else score -= 10;

  if (trendImproving) score += 20;
  else if (secondNervous > firstNervous * 1.3) score -= 15;

  if (nervousRatio === 0) score = Math.max(score, 80);

  const lastFew = history.slice(-Math.min(5, history.length));
  const recentNervous = lastFew.filter(e => e === 'Nervous').length / lastFew.length;
  if (recentNervous < 0.2 && nervousRatio > 0.2) score += 5;

  return Math.max(0, Math.min(100, score));
}

function analyzeConfidenceTrend(history) {
  if (history.length < 3) return 50;

  const confidentCount = history.filter(e => e === 'Confident' || e === 'Happy').length;
  const confidentRatio = confidentCount / history.length;

  const firstHalf = history.slice(0, Math.floor(history.length / 2));
  const secondHalf = history.slice(Math.floor(history.length / 2));
  const firstConf = firstHalf.filter(e => e === 'Confident' || e === 'Happy').length / Math.max(1, firstHalf.length);
  const secondConf = secondHalf.filter(e => e === 'Confident' || e === 'Happy').length / Math.max(1, secondHalf.length);

  const trendImproving = secondConf > firstConf;

  let score = confidentRatio * 70;
  if (trendImproving) score += 20;
  else if (secondConf < firstConf * 0.7) score -= 15;

  const recentConfident = history.slice(-Math.min(10, history.length))
    .filter(e => e === 'Confident' || e === 'Happy').length / Math.min(10, history.length);
  if (recentConfident > 0.5) score += 10;

  return Math.max(0, Math.min(100, score));
}

function analyzeEngagementTrend(history, confidenceHistory) {
  if (history.length < 2) return 50;

  const positiveRatio = history.filter(e => POSITIVE_EMOTIONS.includes(e)).length / history.length;

  let engagementFromConfidence = 50;
  if (confidenceHistory && confidenceHistory.length >= 2) {
    const avgConf = confidenceHistory.reduce((a, b) => a + b, 0) / confidenceHistory.length;
    engagementFromConfidence = avgConf;

    if (confidenceHistory.length >= 4) {
      const firstHalf = confidenceHistory.slice(0, Math.floor(confidenceHistory.length / 2));
      const secondHalf = confidenceHistory.slice(Math.floor(confidenceHistory.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      if (secondAvg > firstAvg) engagementFromConfidence = Math.min(100, engagementFromConfidence + 10);
      else if (secondAvg < firstAvg * 0.7) engagementFromConfidence = Math.max(10, engagementFromConfidence - 15);
    }
  }

  return Math.round(positiveRatio * 55 + engagementFromConfidence * 0.35);
}

function analyzeFluctuations(history) {
  if (history.length < 3) return 50;

  let totalFluctuation = 0;
  let fluctuationCount = 0;

  for (let i = 1; i < history.length; i++) {
    const prev = EMOTION_VALENCE[history[i - 1]] || 0.5;
    const curr = EMOTION_VALENCE[history[i]] || 0.5;
    const diff = Math.abs(curr - prev);
    if (diff > 0.3) {
      totalFluctuation += diff;
      fluctuationCount++;
    }
  }

  if (fluctuationCount === 0) return 90;

  const avgFluctuation = totalFluctuation / fluctuationCount;
  const fluctuationRate = fluctuationCount / Math.max(1, history.length - 1);

  let score = 90;
  score -= fluctuationRate * 30;
  score -= avgFluctuation * 35;

  const extremeSwings = countValenceSwings(history);
  score -= extremeSwings * 5;

  return Math.max(0, Math.min(100, score));
}

function analyzeRecovery(history, answers) {
  if (history.length < 4 || !answers || answers.length < 2) return 50;

  const answerTimeline = answers.filter(a => a && a.semanticScore !== undefined);
  if (answerTimeline.length < 2) return 50;

  const difficultIndices = findDifficultQuestionIndices(answerTimeline);

  if (difficultIndices.length === 0) return 70;

  let recoveryScores = [];

  for (const answerIdx of difficultIndices) {
    const framePerAnswer = Math.max(1, Math.floor(history.length / answerTimeline.length));
    const startFrame = Math.max(0, answerIdx * framePerAnswer - Math.floor(framePerAnswer * 0.3));
    const endFrame = Math.min(history.length - 1, startFrame + framePerAnswer);
    const afterEnd = Math.min(history.length, endFrame + Math.max(2, Math.floor(framePerAnswer * 0.5)));

    const duringEmotions = history.slice(startFrame, endFrame + 1);
    const afterEmotions = history.slice(endFrame + 1, afterEnd);

    const beforeRecovery = history.slice(Math.max(0, startFrame - framePerAnswer), startFrame);

    if (duringEmotions.length === 0 || afterEmotions.length === 0) continue;

    const duringValence = duringEmotions.map(e => EMOTION_VALENCE[e] || 0.5)
      .reduce((a, b) => a + b, 0) / duringEmotions.length;

    const afterValence = afterEmotions.map(e => EMOTION_VALENCE[e] || 0.5)
      .reduce((a, b) => a + b, 0) / afterEmotions.length;

    const beforeValence = beforeRecovery.length > 0
      ? beforeRecovery.map(e => EMOTION_VALENCE[e] || 0.5).reduce((a, b) => a + b, 0) / beforeRecovery.length
      : 0.5;

    const baselineDrop = Math.max(0, beforeValence - duringValence);

    if (baselineDrop > 0.15 && afterValence > duringValence) {
      const recoveryPercent = Math.min(1, (afterValence - duringValence) / Math.max(0.01, baselineDrop));
      recoveryScores.push(recoveryPercent * 100);
    } else if (baselineDrop <= 0.15) {
      recoveryScores.push(80);
    } else if (afterValence <= duringValence) {
      recoveryScores.push(Math.max(10, afterValence * 100));
    }
  }

  if (recoveryScores.length === 0) return 65;

  const avgRecovery = recoveryScores.reduce((a, b) => a + b, 0) / recoveryScores.length;
  return Math.max(0, Math.min(100, avgRecovery));
}

function findDifficultQuestionIndices(answers) {
  if (!answers || answers.length === 0) return [];

  const indices = [];
  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    if (!a) continue;
    const isDifficult = (a.difficulty >= 3)
      || (a.semanticScore !== undefined && a.semanticScore < 40)
      || (a.score !== undefined && a.score < 35);
    if (isDifficult) {
      indices.push(i);
    }
  }
  return indices;
}

function calculateLongestStableRun(history, emotion) {
  let maxRun = 0;
  let currentRun = 0;
  for (const e of history) {
    if (e === emotion) {
      currentRun++;
      if (currentRun > maxRun) maxRun = currentRun;
    } else {
      currentRun = 0;
    }
  }
  return maxRun;
}

function computeFinalScore(subScores) {
  const weights = {
    sequenceStability: 0.20,
    confidenceStability: 0.15,
    stressTrend: 0.15,
    nervousnessTrend: 0.10,
    confidenceTrend: 0.10,
    engagementTrend: 0.10,
    fluctuationScore: 0.10,
    recoveryAbility: 0.10,
  };

  let score = 0;
  for (const [key, weight] of Object.entries(weights)) {
    score += (subScores[key] || 0) * weight;
  }

  return score;
}

function buildEvidence(
  n, history, scoreHistory, confidenceHistory, answers,
  seqStab, confStab, stress, nervous, confident,
  engagement, fluctuation, recovery
) {
  const lines = [];

  const dominantEmotion = findDominantEmotion(history);
  const dominantRatio = history.filter(e => e === dominantEmotion).length / n;
  lines.push(
    `Emotion remained "${dominantEmotion}" during ${Math.round(dominantRatio * 100)}% of ${n} captured frames.`
  );

  const transitions = countTransitions(history);
  lines.push(`${transitions} emotion transition${transitions !== 1 ? 's' : ''} detected across the interview timeline.`);

  if (scoreHistory && scoreHistory.length > 0) {
    const avgConf = computeAverageFaceConfidence(scoreHistory, history);
    lines.push(`Average facial expression confidence = ${avgConf}%.`);
  }

  if (confidenceHistory && confidenceHistory.length > 0) {
    const avgDetectConf = Math.round(
      confidenceHistory.reduce((a, b) => a + b, 0) / confidenceHistory.length
    );
    lines.push(`Average face detection confidence = ${avgDetectConf}%.`);
  }

  const nervousCount = history.filter(e => e === 'Nervous').length;
  const stressCount = history.filter(e => STRESS_EMOTIONS.includes(e)).length;

  const difficultAnswers = findDifficultQuestionIndices(answers);
  if (stressCount > 0) {
    if (difficultAnswers.length > 0) {
      lines.push(`Stress indicators increased during ${difficultAnswers.length} challenging question(s) (difficulty ≥ 3 or score < 40%).`);
    } else {
      lines.push(`Stress was detected during ${Math.round(stressCount / n * 100)}% of the interview.`);
    }
  } else {
    lines.push('No stress indicators detected throughout the interview.');
  }

  if (recovery > 60) {
    lines.push('Strong emotional recovery observed after challenging questions.');
  } else if (recovery > 40) {
    lines.push('Moderate emotional recovery after difficult segments.');
  } else if (recovery < 30 && nervousCount > 0) {
    lines.push('Limited emotional recovery observed after stress indicators.');
  }

  if (fluctuation >= 70) {
    lines.push('Minimal emotional fluctuations — candidate maintained consistent affect.');
  } else if (fluctuation >= 45) {
    lines.push('Moderate emotional fluctuations detected during the interview.');
  } else {
    lines.push('Frequent emotional fluctuations observed throughout the timeline.');
  }

  if (nervous >= 70) {
    lines.push('Nervousness remained low or diminished as the interview progressed.');
  } else if (nervous >= 45) {
    lines.push('Nervousness was present but showed improvement over the timeline.');
  } else {
    lines.push('Nervousness was detected across multiple segments.');
  }

  if (engagement >= 70) {
    lines.push('Engagement remained consistently high throughout the interview.');
  } else if (engagement >= 45) {
    lines.push('Engagement was moderate with some variation.');
  } else {
    lines.push('Engagement was low during parts of the interview.');
  }

  return lines;
}

function findDominantEmotion(history) {
  const counts = {};
  for (const e of history) {
    counts[e] = (counts[e] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Neutral';
}

function countTransitions(history) {
  let count = 0;
  for (let i = 1; i < history.length; i++) {
    if (history[i] !== history[i - 1]) count++;
  }
  return count;
}

function computeAverageFaceConfidence(scoreHistory, emotionHistory) {
  if (!scoreHistory || scoreHistory.length === 0) return 50;
  let sum = 0;
  let count = 0;
  for (const scores of scoreHistory) {
    if (scores && typeof scores === 'object') {
      const vals = Object.values(scores).filter(v => typeof v === 'number');
      if (vals.length > 0) {
        const maxVal = Math.max(...vals);
        sum += maxVal;
        count++;
      }
    }
  }
  if (count === 0) return 50;
  return Math.round((sum / count) * 100);
}

export function calculateEmotionStability(history) {
  return analyzeEmotionStability({ emotionHistory: history });
}
