const PROJECTION_DIM = 64;
const NUM_HEADS = 4;
const HEAD_DIM = PROJECTION_DIM / NUM_HEADS;

const MODALITY_NAMES = ['resume', 'answers', 'emotions', 'confidence', 'behavior', 'vision', 'audio'];

const FIXED_WEIGHTS = initFixedWeights();

function initFixedWeights() {
  const w = {};
  MODALITY_NAMES.forEach((mod, i) => {
    const key = `modality_${i}`;
    w[key] = { query: 1.0, key: 1.0, value: 1.0, gate: 0.5 + (i / MODALITY_NAMES.length) * 0.5 };
    if (mod === 'answers' || mod === 'audio') w[key].gate = 1.0;
    if (mod === 'emotions') w[key].gate = 0.85;
    if (mod === 'confidence') w[key].gate = 0.75;
    if (mod === 'resume') w[key].gate = 0.7;
  });
  return w;
}

exports.fuseFeatures = ({ resume, answers, emotions, confidence, behavior, visionFeatures, audioFeatures }) => {
  const modalityData = [
    { name: 'resume', vec: vectorizeResume(resume) },
    { name: 'answers', vec: vectorizeAnswers(answers) },
    { name: 'emotions', vec: vectorizeEmotions(emotions) },
    { name: 'confidence', vec: vectorizeConfidence(confidence) },
    { name: 'behavior', vec: vectorizeBehavior(behavior) },
    { name: 'vision', vec: vectorizeVision(visionFeatures) },
    { name: 'audio', vec: vectorizeAudio(audioFeatures) },
  ];

  const projected = modalityData.map((m, i) => {
    const weights = FIXED_WEIGHTS[`modality_${i}`];
    return projectToCommonSpace(m.vec, PROJECTION_DIM, weights);
  });

  const qualityScores = modalityData.map((m) => computeModalityQuality(m.vec));

  const headWeights = [];
  for (let h = 0; h < NUM_HEADS; h++) {
    const headStart = h * HEAD_DIM;
    const headEnd = Math.min(headStart + HEAD_DIM, PROJECTION_DIM);
    const n = projected.length;
    const attn = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          attn[i][j] = 1.0;
          continue;
        }
        const vi = projected[i].slice(headStart, headEnd);
        const vj = projected[j].slice(headStart, headEnd);
        attn[i][j] = scaledDotProduct(vi, vj);
      }
    }

    for (let i = 0; i < n; i++) {
      const rowSum = attn[i].reduce((a, b) => a + b, 0) || 1;
      for (let j = 0; j < n; j++) {
        attn[i][j] /= rowSum;
      }
    }
    headWeights.push(attn);
  }

  const avgAttn = Array.from({ length: projected.length }, () => 0);
  for (let i = 0; i < projected.length; i++) {
    let sum = 0;
    for (let h = 0; h < NUM_HEADS; h++) {
      sum += headWeights[h][i].reduce((a, b) => a + b, 0) / projected.length;
    }
    avgAttn[i] = sum / NUM_HEADS;
  }

  const maxW = Math.max(...avgAttn, 0.001);
  const normalizedWeights = avgAttn.map((w) => Math.max(0.05, w / maxW));

  const fused = fuseWeighted(projected, normalizedWeights, qualityScores);
  const gated = applyContextGating(fused, normalizedWeights);
  const scores = decodeContextVector(gated, modalityData, normalizedWeights, qualityScores);

  return scores;
};

function scaledDotProduct(a, b) {
  const len = Math.min(a.length, b.length);
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB) || 1;
  const cos = dot / denom;
  const scale = Math.sqrt(HEAD_DIM);
  return (cos + 1) / scale;
}

function projectToCommonSpace(obj, dim, weights) {
  const vals = flatten(obj);
  const result = new Array(dim).fill(0);
  const mean = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0.5;
  for (let i = 0; i < dim; i++) {
    const src = vals[i % vals.length] !== undefined ? vals[i % vals.length] : mean;
    result[i] = (src - 0.5) * weights.value + 0.5;
    result[i] = Math.max(0.01, Math.min(0.99, result[i]));
  }
  return result;
}

function computeModalityQuality(vec) {
  const vals = flatten(vec);
  if (vals.length === 0) return 0.3;
  const hasSignal = vals.some((v) => Math.abs(v - 0.5) > 0.1);
  return hasSignal ? Math.min(1, vals.length / 6) : 0.3;
}

function fuseWeighted(projected, weights, qualityScores) {
  const n = projected.length;
  const dim = projected[0].length;
  const fused = new Array(dim).fill(0);
  let totalWeight = 0;

  for (let i = 0; i < n; i++) {
    const w = weights[i] * (qualityScores[i] || 0.5);
    for (let d = 0; d < dim; d++) {
      fused[d] += projected[i][d] * w;
    }
    totalWeight += w;
  }

  if (totalWeight > 0) {
    for (let d = 0; d < dim; d++) {
      fused[d] /= totalWeight;
    }
  }

  return fused;
}

function applyContextGating(fused, weights) {
  const gate = weights.reduce((a, b) => a + b, 0) / weights.length;
  const gateScale = 0.6 + 0.4 * gate;
  return fused.map((v) => {
    const gated = (v - 0.5) * gateScale + 0.5;
    return Math.max(0.01, Math.min(0.99, gated));
  });
}

function decodeContextVector(fused, weights, modalityData, qualityScores) {
  const signalStrength = fused.reduce((a, b) => a + Math.abs(b - 0.5), 0) / fused.length * 2;
  const techIdx = modalityData.findIndex((m) => m.name === 'answers');
  const behIdx = modalityData.findIndex((m) => m.name === 'behavior');
  const emoIdx = modalityData.findIndex((m) => m.name === 'emotions');
  const confIdx = modalityData.findIndex((m) => m.name === 'confidence');
  const audIdx = modalityData.findIndex((m) => m.name === 'audio');

  const techBoost = computeDimensionScore(modalityData[techIdx], qualityScores[techIdx], 0.6);
  const behaviorScore = computeDimensionScore(modalityData[behIdx], qualityScores[behIdx], 0.5);
  const emotionScore = computeDimensionScore(modalityData[emoIdx], qualityScores[emoIdx], 0.5);
  const engagementScore = computeDimensionScore(modalityData[behIdx], qualityScores[behIdx], 0.5);
  const confidenceBoost = computeDimensionScore(modalityData[confIdx], qualityScores[confIdx], 0.5);
  const audioScore = computeDimensionScore(modalityData[audIdx], qualityScores[audIdx], 0.5);

  return {
    technicalBoost: clamp(techBoost * (0.8 + 0.2 * signalStrength)),
    behaviorScore: clamp(behaviorScore * (0.8 + 0.2 * signalStrength)),
    emotionScore: clamp(emotionScore * (0.8 + 0.2 * signalStrength)),
    engagementScore: clamp(engagementScore * (0.8 + 0.2 * signalStrength)),
    confidenceBoost: clamp(confidenceBoost * (0.8 + 0.2 * signalStrength)),
    audioScore: clamp(audioScore * (0.8 + 0.2 * signalStrength)),
    fusedRepresentation: fused,
    attentionWeights: weights.map((w) => Math.round(w * 100) / 100),
    modalityNames: MODALITY_NAMES,
    signalStrength: Math.round(signalStrength * 100) / 100,
    qualityScores: qualityScores.map((q) => Math.round(q * 100) / 100),
  };
}

function computeDimensionScore(modality, quality, defaultVal) {
  if (!modality || !modality.vec) return defaultVal;
  const vals = flatten(modality.vec);
  if (vals.length === 0) return defaultVal;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return avg * (0.5 + 0.5 * (quality || 0.5));
}

function vectorizeResume(resume) {
  if (!resume) return { technical: 0.5, experience: 0.5, education: 0.5, domainMatch: 0.5 };
  const skillsLen = resume.skills?.length || 0;
  const exp = resume.experience || 0;
  const eduLen = resume.education?.length || 0;
  return {
    technical: Math.min(1, skillsLen / 10),
    experience: Math.min(1, exp / 10),
    education: Math.min(1, eduLen / 3),
    domainMatch: resume.matchScore ? resume.matchScore / 100 : 0.5,
    relevance: skillsLen > 0 ? 0.6 + (skillsLen / 20) * 0.4 : 0.5,
  };
}

function vectorizeAnswers(answers) {
  if (!answers || answers.length === 0) return { technical: 0.5, relevance: 0.5, depth: 0.5, completeness: 0.5 };
  const avgSemantic = answers.reduce((s, a) => s + (a.semanticScore || 50), 0) / answers.length;
  const avgConf = answers.reduce((s, a) => s + (a.confidenceScore || 50), 0) / answers.length;
  const completeness = Math.min(1, answers.length / 10);
  return {
    technical: avgSemantic / 100,
    relevance: avgSemantic / 100,
    depth: (avgSemantic / 100) * 0.6 + (avgConf / 100) * 0.4,
    completeness,
    consistency: answers.length > 2
      ? 1 - Math.abs(answers[answers.length - 1].semanticScore - answers[0].semanticScore) / 200
      : 0.5,
  };
}

function vectorizeEmotions(emotions) {
  if (!emotions || emotions.length === 0) return { stability: 0.5, positivity: 0.5, variance: 0.5, confidence: 0.5 };
  const positive = emotions.filter((e) => e === 'Happy' || e === 'Confident' || e === 'Neutral').length;
  const stable = emotions.filter((e) => e === 'Neutral' || e === 'Confident').length;
  const n = emotions.length;
  return {
    stability: n > 0 ? stable / n : 0.5,
    positivity: n > 0 ? positive / n : 0.5,
    variance: n > 1 ? 1 - stable / n : 0.5,
    confidence: n > 0 ? (positive / n) * 0.5 + (stable / n) * 0.5 : 0.5,
    trendDirection: n > 3
      ? (positive - emotions.slice(-3).filter((e) => e === 'Happy' || e === 'Confident').length / 3 > 0 ? 0.7 : 0.3)
      : 0.5,
  };
}

function vectorizeConfidence(confidence) {
  if (!confidence || confidence.length === 0) return { confidence: 0.5, consistency: 0.5, trend: 0.5 };
  const avg = confidence.reduce((a, b) => a + b, 0) / confidence.length;
  const variance = confidence.reduce((a, b) => a + (b - avg) ** 2, 0) / confidence.length;
  return {
    confidence: avg / 100,
    consistency: Math.max(0.1, 1 - Math.min(1, variance / 2500)),
    trend: confidence.length > 3 ? Math.max(0, Math.min(1, (confidence[confidence.length - 1] - confidence[0]) / 100 + 0.5)) : 0.5,
    recentConfidence: confidence.length > 3
      ? confidence.slice(-3).reduce((a, b) => a + b, 0) / 300
      : avg / 100,
  };
}

function vectorizeBehavior(behavior) {
  if (!behavior || behavior.length === 0) return { engagement: 0.5, attentiveness: 0.5, profileStability: 0.5 };
  const avgEngagement = behavior.reduce((a, b) => a + (b.engagementScore || 50), 0) / behavior.length;
  const avgAttention = behavior.reduce((a, b) => a + (b.attentionSpan || 50), 0) / behavior.length;
  return {
    engagement: avgEngagement / 100,
    attentiveness: avgAttention / 100,
    profileStability: 0.3 + (avgEngagement / 100) * 0.4 + (avgAttention / 100) * 0.3,
    consistency: 1 - calculateBehaviorVariance(behavior),
  };
}

function calculateBehaviorVariance(behavior) {
  if (behavior.length < 3) return 0;
  const recent = behavior.slice(-5);
  const scores = recent.map((b) => b.engagementScore || 50);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.min(1, scores.reduce((a, b) => a + (b - avg) ** 2, 0) / (scores.length * 2500));
}

function vectorizeVision(visionFeatures) {
  if (!visionFeatures || visionFeatures.length === 0) return { visualAttention: 0.5, facialEngagement: 0.5, behavioralConsistency: 0.5 };
  const avgConfidence = visionFeatures.reduce((s, f) => s + (f.confidence || 0.5), 0) / visionFeatures.length;
  const attentiveCount = visionFeatures.filter((f) => f.behavior === 'attentive' || f.behavior === 'engaged').length;
  const n = visionFeatures.length;
  return {
    visualAttention: n > 0 ? Math.min(1, attentiveCount / n) : 0.5,
    facialEngagement: avgConfidence,
    behavioralConsistency: n > 10 ? 1 - Math.abs(attentiveCount / n - 0.5) * 2 : 0.5,
    frameQuality: computeFrameQualityScore(visionFeatures),
  };
}

function computeFrameQualityScore(features) {
  if (features.length < 3) return 0.5;
  const recent = features.slice(-5);
  const hasFace = recent.filter((f) => f.confidence > 0.3).length;
  return hasFace / recent.length;
}

function vectorizeAudio(audioFeatures) {
  if (!audioFeatures || audioFeatures.length === 0) return { vocalConfidence: 0.5, speechClarity: 0.5, vocalStability: 0.5, pitchVariation: 0.5 };
  const recent = audioFeatures.slice(-10);
  const n = recent.length;
  const avgConf = recent.reduce((s, f) => s + (f.confidence || 50), 0) / n;
  const avgStability = recent.reduce((s, f) => s + (f.voiceStability || 0.5), 0) / n;
  const avgPitch = recent.reduce((s, f) => s + (f.pitchConfidence || f.confidence || 50), 0) / n;
  return {
    vocalConfidence: avgConf / 100,
    speechClarity: avgStability,
    vocalStability: avgStability,
    pitchVariation: Math.min(1, n / 20),
    toneQuality: avgPitch / 100,
    energyLevel: recent.filter((f) => (f.energy || 0.5) > 0.6).length / n,
  };
}

function flatten(obj) {
  if (!obj) return [0.5];
  if (Array.isArray(obj)) return obj;
  return Object.values(obj).filter((v) => typeof v === 'number');
}

function clamp(v) {
  return Math.round(Math.min(1, Math.max(0, v)) * 100) / 100;
}
