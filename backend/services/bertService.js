const natural = require('natural');

const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();

function preprocess(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function computeCosineSimilarity(vec1, vec2) {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  const keys = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
  for (const key of keys) {
    const v1 = vec1[key] || 0;
    const v2 = vec2[key] || 0;
    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  }
  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

function getTfIdfVector(text, tfidf, docIndex) {
  const vector = {};
  tfidf.listTerms(docIndex).forEach((term) => {
    vector[term.term] = term.tfidf;
  });
  return vector;
}

exports.evaluateAnswer = async (question, answer) => {
  const cleanQuestion = preprocess(question);
  const cleanAnswer = preprocess(answer);

  if (!cleanAnswer) return 0;

  const tfidf = new TfIdf();
  tfidf.addDocument(cleanQuestion);
  tfidf.addDocument(cleanAnswer);

  const questionVec = getTfIdfVector(cleanQuestion, tfidf, 0);
  const answerVec = getTfIdfVector(cleanAnswer, tfidf, 1);

  const similarity = computeCosineSimilarity(questionVec, answerVec);

  const keywordOverlap = cleanQuestion.split(' ').filter((w) =>
    cleanAnswer.includes(w)
  ).length / Math.max(cleanQuestion.split(' ').length, 1);

  const finalScore = Math.min(1, similarity * 0.7 + keywordOverlap * 0.3);

  return Math.round(finalScore * 100);
};

exports.getEmbedding = async (text) => {
  const tokens = tokenizer.tokenize(preprocess(text));
  const embedding = {};
  tokens.forEach((token) => {
    embedding[token] = (embedding[token] || 0) + 1;
  });
  return embedding;
};
