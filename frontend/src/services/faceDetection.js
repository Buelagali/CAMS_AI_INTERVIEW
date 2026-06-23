import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/face-api-models/';

let loaded = false;
let loadingAttempted = false;

export async function loadModels() {
  if (loaded || loadingAttempted) return;
  loadingAttempted = true;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await faceapi.nets.tinyFaceDetector.load(MODEL_URL);
      await faceapi.nets.faceExpressionNet.load(MODEL_URL);
      loaded = true;
      return;
    } catch (err) {
      console.warn(`Face-api model load attempt ${attempt}/3 failed:`, err.message);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  console.error('Face-api models failed to load after 3 attempts');
}

export async function detectEmotion(videoElement) {
  if (!videoElement || !videoElement.videoWidth) {
    return {
      emotion: 'Neutral', score: 0, raw: 'none', faceDetected: false,
      scores: { Happy: 0, Neutral: 1, Sad: 0, Nervous: 0, Angry: 0, Confident: 0 },
    };
  }

  if (loaded) {
    try {
      const result = await faceapi.detectSingleFace(
        videoElement,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.3 })
      ).withFaceExpressions();

      if (result && result.expressions) {
        const expressions = result.expressions;
        const entries = Object.entries(expressions);
        entries.sort((a, b) => b[1] - a[1]);
        const dominant = entries[0][0];
        const mapped = mapExpressionToEmotion(dominant);
        return {
          emotion: mapped.label,
          score: mapped.score,
          raw: dominant,
          faceDetected: true,
          scores: {
            Happy: expressions.happy || 0,
            Neutral: expressions.neutral || 0,
            Sad: expressions.sad || 0,
            Nervous: expressions.fearful || 0,
            Angry: expressions.angry || 0,
            Confident: expressions.happy * 0.6 + expressions.neutral * 0.4,
          },
        };
      }
    } catch (err) {
      console.warn('face-api error, falling back to backend ViT:', err.message);
    }
  }

  return detectEmotionBackend(videoElement);
}

async function detectEmotionBackend(videoElement) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, 224, 224);
    const imageData = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

    const res = await fetch('/api/resume/emotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData }),
    });
    if (!res.ok) throw new Error('Backend emotion API error');
    const data = await res.json();
    const em = data.emotion;

    return {
      emotion: em.emotion || 'Neutral',
      score: em.confidence || 0.5,
      raw: em.vitLabel || 'vit',
      faceDetected: true,
      scores: {
        Happy: em.scores?.Happy || 0,
        Neutral: em.scores?.Neutral || 1,
        Sad: em.scores?.Sad || 0,
        Nervous: em.scores?.Nervous || 0,
        Angry: em.scores?.Angry || 0,
        Confident: em.scores?.Confident || 0,
      },
    };
  } catch (err) {
    console.warn('Backend emotion fallback failed:', err.message);
    return {
      emotion: 'Neutral', score: 0, raw: 'error', faceDetected: false,
      scores: { Happy: 0, Neutral: 1, Sad: 0, Nervous: 0, Angry: 0, Confident: 0 },
    };
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
