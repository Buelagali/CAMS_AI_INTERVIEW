const { pipeline } = require('@xenova/transformers');
const { cos_sim } = require('@xenova/transformers');

let embeddingPipeline = null;

async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embeddingPipeline;
}

function preprocess(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

exports.evaluateAnswer = async (question, answer) => {
  const cleanQuestion = preprocess(question);
  const cleanAnswer = preprocess(answer);

  if (!cleanAnswer) return 0;

  try {
    const pipe = await getEmbeddingPipeline();

    const qEmb = await pipe(cleanQuestion, { pooling: 'mean', normalize: true });
    const aEmb = await pipe(cleanAnswer, { pooling: 'mean', normalize: true });

    const similarity = cos_sim(qEmb.data, aEmb.data);

    const keywordOverlap = cleanQuestion.split(' ').filter((w) =>
      cleanAnswer.includes(w)
    ).length / Math.max(cleanQuestion.split(' ').length, 1);

    const finalScore = Math.min(1, similarity * 0.7 + keywordOverlap * 0.3);
    return Math.round(finalScore * 100);
  } catch (err) {
    console.error('Sentence-BERT eval error:', err.message);
    const keywordOverlap = cleanQuestion.split(' ').filter((w) =>
      cleanAnswer.includes(w)
    ).length / Math.max(cleanQuestion.split(' ').length, 1);
    return Math.round(Math.min(100, keywordOverlap * 100));
  }
};

exports.getEmbedding = async (text) => {
  try {
    const pipe = await getEmbeddingPipeline();
    const emb = await pipe(preprocess(text), { pooling: 'mean', normalize: true });
    return Array.from(emb.data);
  } catch (err) {
    console.error('Sentence-BERT embedding error:', err.message);
    return [];
  }
};

exports.getSimilarity = async (text1, text2) => {
  try {
    const pipe = await getEmbeddingPipeline();
    const [emb1, emb2] = await Promise.all([
      pipe(preprocess(text1), { pooling: 'mean', normalize: true }),
      pipe(preprocess(text2), { pooling: 'mean', normalize: true }),
    ]);
    return cos_sim(emb1.data, emb2.data);
  } catch {
    return 0.5;
  }
};
