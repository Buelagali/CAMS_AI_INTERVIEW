import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = 'https://vladmandic.github.io/face-api/models/';

let loaded = false;

export async function loadModels() {
  if (loaded) return;
  try {
    await faceapi.nets.tinyFaceDetector.load(MODEL_URL);
    await faceapi.nets.faceExpressionNet.load(MODEL_URL);
    loaded = true;
  } catch (err) {
    console.error('Failed to load face-api models:', err);
  }
}

export async function detectEmotion(videoElement) {
  if (!loaded || !videoElement || !videoElement.videoWidth) {
    return null;
  }
  try {
    const result = await faceapi.detectSingleFace(
      videoElement,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
    ).withFaceExpressions();

    if (!result || !result.expressions) return null;

    const expressions = result.expressions;
    const entries = Object.entries(expressions);
    entries.sort((a, b) => b[1] - a[1]);
    const dominant = entries[0][0];
    const mapped = mapExpressionToEmotion(dominant);

    return {
      emotion: mapped.label,
      score: mapped.score,
      raw: dominant,
      scores: {
        Happy: expressions.happy || 0,
        Neutral: expressions.neutral || 0,
        Sad: expressions.sad || 0,
        Nervous: expressions.fearful || 0,
        Angry: expressions.angry || 0,
        Confident: expressions.happy * 0.6 + expressions.neutral * 0.4,
      },
    };
  } catch {
    return null;
  }
}

function mapExpressionToEmotion(expression) {
  const map = {
    happy: { label: 'Happy', score: 1 },
    neutral: { label: 'Neutral', score: 0.8 },
    sad: { label: 'Sad', score: 0.9 },
    fearful: { label: 'Nervous', score: 0.9 },
    angry: { label: 'Angry', score: 0.9 },
    surprised: { label: 'Confident', score: 0.7 },
    disgusted: { label: 'Sad', score: 0.6 },
  };
  return map[expression] || { label: 'Neutral', score: 0.5 };
}
