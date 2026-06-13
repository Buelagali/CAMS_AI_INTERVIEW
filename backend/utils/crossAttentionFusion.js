exports.fuseFeatures = ({ resume, answers, emotions, confidence, behavior }) => {
  const resumeEmbedding = vectorizeResume(resume);
  const answerEmbedding = vectorizeAnswers(answers);
  const emotionEmbedding = vectorizeEmotions(emotions);
  const confidenceEmbedding = vectorizeConfidence(confidence);
  const behaviorEmbedding = vectorizeBehavior(behavior);

  const attentionWeights = computeCrossAttention([
    resumeEmbedding,
    answerEmbedding,
    emotionEmbedding,
    confidenceEmbedding,
    behaviorEmbedding,
  ]);

  const fused = fuseWeighted(
    [resumeEmbedding, answerEmbedding, emotionEmbedding, confidenceEmbedding, behaviorEmbedding],
    attentionWeights
  );

  return {
    technicalBoost: fused.technical || 0.5,
    behaviorScore: fused.behavior || 0.5,
    emotionScore: fused.emotion || 0.5,
    fusedRepresentation: fused,
    attentionWeights,
  };
};

function vectorizeResume(resume) {
  if (!resume) return { technical: 0.5, experience: 0.5, education: 0.5 };
  return {
    technical: Math.min(1, (resume.skills?.length || 0) / 10),
    experience: Math.min(1, (resume.experience || 0) / 10),
    education: Math.min(1, (resume.education?.length || 0) / 3),
  };
}

function vectorizeAnswers(answers) {
  if (!answers || answers.length === 0) return { technical: 0.5, relevance: 0.5 };
  const avgSemantic = answers.reduce((s, a) => s + (a.semanticScore || 0), 0) / answers.length;
  return { technical: avgSemantic / 100, relevance: avgSemantic / 100 };
}

function vectorizeEmotions(emotions) {
  if (!emotions || emotions.length === 0) return { emotion: 0.5, stability: 0.5 };
  const stable = emotions.filter((e) => e === 'neutral' || e === 'confident').length;
  return {
    emotion: emotions.length > 0 ? stable / emotions.length : 0.5,
    stability: 0.5,
  };
}

function vectorizeConfidence(confidence) {
  if (!confidence || confidence.length === 0) return { confidence: 0.5, consistency: 0.5 };
  const avg = confidence.reduce((a, b) => a + b, 0) / confidence.length;
  return { confidence: avg / 100, consistency: 0.5 };
}

function vectorizeBehavior(behavior) {
  if (!behavior || behavior.length === 0) return { behavior: 0.5, engagement: 0.5 };
  return { behavior: 0.6, engagement: 0.6 };
}

function computeCrossAttention(embeddings) {
  const numFeatures = embeddings.length;
  const weights = [];

  for (let i = 0; i < numFeatures; i++) {
    let score = 0;
    for (let j = 0; j < numFeatures; j++) {
      if (i !== j) {
        score += cosineSimilarity(flatten(embeddings[i]), flatten(embeddings[j]));
      }
    }
    weights.push(Math.max(0, score / (numFeatures - 1)));
  }

  const sum = weights.reduce((a, b) => a + b, 0);
  return sum > 0 ? weights.map((w) => w / sum) : weights.map(() => 1 / numFeatures);
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
