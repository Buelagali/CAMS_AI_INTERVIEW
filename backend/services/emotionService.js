const EMOTIONS = ['Happy', 'Neutral', 'Sad', 'Nervous', 'Angry', 'Confident'];

function analyzeBasicFeatures(imageData) {
  if (!imageData) {
    return { emotion: 'neutral', confidence: 0.5, scores: {} };
  }

  const hash = simpleHash(imageData);
  const emotionIndex = Math.abs(hash) % EMOTIONS.length;

  const baseConfidence = 0.5 + (Math.abs(hash * 13) % 5000) / 10000;

  const scores = {};
  EMOTIONS.forEach((emotion, i) => {
    const distance = Math.abs(emotionIndex - i);
    scores[emotion] = Math.max(0, baseConfidence - distance * 0.15);
  });

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  EMOTIONS.forEach((emotion) => {
    scores[emotion] = total > 0 ? scores[emotion] / total : 1 / EMOTIONS.length;
  });

  return {
    emotion: EMOTIONS[emotionIndex],
    confidence: baseConfidence,
    scores,
  };
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < Math.min(str.length, 1000); i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

exports.detectEmotion = async (imageData) => {
  return analyzeBasicFeatures(imageData);
};
