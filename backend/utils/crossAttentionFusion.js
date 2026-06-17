exports.fuseFeatures = ({ resume, answers, emotions, confidence, behavior, visionFeatures, audioFeatures }) => {
  const resumeEmb = vectorizeResume(resume);
  const answerEmb = vectorizeAnswers(answers);
  const emotionEmb = vectorizeEmotions(emotions);
  const confidenceEmb = vectorizeConfidence(confidence);
  const behaviorEmb = vectorizeBehavior(behavior);
  const visionEmb = vectorizeVision(visionFeatures);
  const audioEmb = vectorizeAudio(audioFeatures);

  const embeddings = [
    resumeEmb, answerEmb, emotionEmb, confidenceEmb, behaviorEmb, visionEmb, audioEmb,
  ];

  const projected = embeddings.map((e) => projectToCommonSpace(e, 64));

  const attentionWeights = computeMultiHeadCrossAttention(projected, 4);

  const fused = fuseWeighted(projected, attentionWeights);

  const contextVector = applyContextGating(fused, attentionWeights);

  return {
    technicalBoost: clamp(contextVector.technical || 0.5),
    behaviorScore: clamp(contextVector.behavior || 0.5),
    emotionScore: clamp(contextVector.emotion || 0.5),
    engagementScore: clamp(contextVector.engagement || 0.5),
    confidenceBoost: clamp(contextVector.confidence || 0.5),
    fusedRepresentation: contextVector,
    attentionWeights: attentionWeights.map((w) => Math.round(w * 100) / 100),
    modalityNames: ['resume', 'answers', 'emotions', 'confidence', 'behavior', 'vision', 'audio'],
  };
};

function projectToCommonSpace(embedding, dim) {
  const result = {};
  const values = flatten(embedding);
  for (let i = 0; i < dim; i++) {
    result[`d${i}`] = values[i % values.length] || 0.5;
  }
  return result;
}

function computeMultiHeadCrossAttention(embeddings, numHeads) {
  const n = embeddings.length;
  const headDim = Math.max(1, Math.floor(n / numHeads));

  const allWeights = [];
  for (let h = 0; h < numHeads; h++) {
    const headStart = h * headDim;
    const headEnd = Math.min(headStart + headDim, n);

    const weights = [];
    for (let i = 0; i < n; i++) {
      let score = 0;
      let count = 0;
      for (let j = headStart; j < headEnd; j++) {
        if (i !== j) {
          score += cosineSimilarity(flatten(embeddings[i]), flatten(embeddings[j]));
          count++;
        }
      }
      weights.push(count > 0 ? score / count : 0);
    }
    allWeights.push(weights);
  }

  const avgWeights = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let h = 0; h < numHeads; h++) sum += allWeights[h][i];
    avgWeights.push(sum / numHeads);
  }

  const maxW = Math.max(...avgWeights, 0.001);
  return avgWeights.map((w) => Math.max(0, w / maxW));
}

function contextGating(fused, weights) {
  const gate = weights.reduce((a, b) => a + b, 0) / weights.length;
  const gated = {};
  for (const [key, val] of Object.entries(fused)) {
    gated[key] = val * (0.5 + 0.5 * gate);
  }
  return gated;
}

function applyContextGating(fused, weights) {
  const gate = weights.reduce((a, b) => a + b, 0) / weights.length;
  const gated = {};
  for (const [key, val] of Object.entries(fused)) {
    gated[key] = val * (0.5 + 0.5 * gate);
  }
  return gated;
}

function fuseWeighted(embeddings, weights) {
  const fused = {};
  const allKeys = new Set();
  embeddings.forEach((emb) => Object.keys(emb).forEach((k) => allKeys.add(k)));

  for (const key of allKeys) {
    let sum = 0;
    let weightSum = 0;
    embeddings.forEach((emb, i) => {
      if (emb[key] !== undefined) {
        sum += emb[key] * weights[i];
        weightSum += weights[i];
      }
    });
    fused[key] = weightSum > 0 ? sum / weightSum : 0.5;
  }

  return fused;
}

function vectorizeResume(resume) {
  if (!resume) return { technical: 0.5, experience: 0.5, education: 0.5 };
  return {
    technical: Math.min(1, (resume.skills?.length || 0) / 10),
    experience: Math.min(1, (resume.experience || 0) / 10),
    education: Math.min(1, (resume.education?.length || 0) / 3),
    domainMatch: resume.matchScore ? resume.matchScore / 100 : 0.5,
  };
}

function vectorizeAnswers(answers) {
  if (!answers || answers.length === 0) return { technical: 0.5, relevance: 0.5, depth: 0.5 };
  const avgSemantic = answers.reduce((s, a) => s + (a.semanticScore || 0), 0) / answers.length;
  const avgConf = answers.reduce((s, a) => s + (a.confidenceScore || 0), 0) / answers.length;
  const completeness = Math.min(1, answers.length / 8);
  return {
    technical: avgSemantic / 100,
    relevance: avgSemantic / 100,
    depth: (avgSemantic / 100) * 0.6 + avgConf * 0.4,
    completeness,
  };
}

function vectorizeEmotions(emotions) {
  if (!emotions || emotions.length === 0) return { emotion: 0.5, stability: 0.5, positivity: 0.5 };
  const positive = emotions.filter((e) =>
    e === 'Happy' || e === 'Confident' || e === 'Neutral'
  ).length;
  const stable = emotions.filter((e) => e === 'Neutral' || e === 'Confident').length;
  return {
    emotion: emotions.length > 0 ? positive / emotions.length : 0.5,
    stability: emotions.length > 0 ? stable / emotions.length : 0.5,
    positivity: emotions.length > 0 ? positive / emotions.length : 0.5,
    variance: 1 - (emotions.length > 1 ? stable / emotions.length : 0.5),
  };
}

function vectorizeConfidence(confidence) {
  if (!confidence || confidence.length === 0) return { confidence: 0.5, consistency: 0.5 };
  const avg = confidence.reduce((a, b) => a + b, 0) / confidence.length;
  const variance = confidence.reduce((a, b) => a + (b - avg) ** 2, 0) / confidence.length;
  return {
    confidence: avg / 100,
    consistency: Math.max(0, 1 - variance / 2500),
    trend: confidence.length > 3
      ? (confidence[confidence.length - 1] - confidence[0]) / 100
      : 0,
  };
}

function vectorizeBehavior(behavior) {
  if (!behavior || behavior.length === 0) return { behavior: 0.5, engagement: 0.5, attentiveness: 0.5 };
  const avgEngagement = behavior.reduce((a, b) => a + (b.engagementScore || 50), 0) / behavior.length;
  const avgAttention = behavior.reduce((a, b) => a + (b.attentionSpan || 50), 0) / behavior.length;
  return {
    behavior: avgEngagement / 100,
    engagement: avgEngagement / 100,
    attentiveness: avgAttention / 100,
    profileStability: 0.5 + (avgEngagement - 50) / 100,
  };
}

function vectorizeVision(visionFeatures) {
  if (!visionFeatures || visionFeatures.length === 0) {
    return { visualAttention: 0.5, facialEngagement: 0.5, behavioralConsistency: 0.5 };
  }
  const avgConfidence = visionFeatures.reduce((s, f) => s + (f.confidence || 0.5), 0) / visionFeatures.length;
  const attentiveCount = visionFeatures.filter((f) =>
    f.behavior === 'attentive' || f.behavior === 'engaged'
  ).length;
  return {
    visualAttention: Math.min(1, attentiveCount / Math.max(visionFeatures.length, 1)),
    facialEngagement: avgConfidence,
    behavioralConsistency: Math.min(1, visionFeatures.length / 30),
  };
}

function vectorizeAudio(audioFeatures) {
  if (!audioFeatures || audioFeatures.length === 0) {
    return { vocalConfidence: 0.5, speechClarity: 0.5, vocalStability: 0.5 };
  }
  const recent = audioFeatures.slice(-10);
  const avgConf = recent.reduce((s, f) => s + (f.confidence || 50), 0) / recent.length;
  const avgStability = recent.reduce((s, f) => s + (f.voiceStability || 0.5), 0) / recent.length;
  return {
    vocalConfidence: avgConf / 100,
    speechClarity: avgStability,
    vocalStability: avgStability,
    pitchVariation: Math.min(1, recent.length / 20),
  };
}

function flatten(obj) {
  return Object.values(obj);
}

function cosineSimilarity(a, b) {
  const len = Math.max(a.length, b.length);
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < len; i++) {
    const va = a[i] || 0;
    const vb = b[i] || 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function clamp(v) {
  return Math.round(Math.min(1, Math.max(0, v)) * 100) / 100;
}
