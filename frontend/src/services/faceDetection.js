import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/face-api-models/';

let loaded = false;
let loadingAttempted = false;

const EMA_ALPHA = 0.35;
let smoothedScores = null;
let lastRawResult = null;

const MULTI_FACE_COOLDOWN_MS = 2500;
let lastMultiFaceTime = 0;
let multiFaceConfirmations = 0;

let frameQualityStats = {
  lastBrightness: -1,
  lastBlurMetric: -1,
  consecutiveLowQuality: 0,
};

export async function loadModels() {
  if (loaded || loadingAttempted) return;
  loadingAttempted = true;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await faceapi.nets.tinyFaceDetector.load(MODEL_URL);
      await faceapi.nets.faceExpressionNet.load(MODEL_URL);
      loaded = true;
      resetSmoothing();
      return;
    } catch (err) {
      console.warn(`Face-api model load attempt ${attempt}/3 failed:`, err.message);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  console.error('Face-api models failed to load after 3 attempts');
}

function resetSmoothing() {
  smoothedScores = null;
  lastRawResult = null;
  lastMultiFaceTime = 0;
  multiFaceConfirmations = 0;
  frameQualityStats = { lastBrightness: -1, lastBlurMetric: -1, consecutiveLowQuality: 0 };
}

function applyTemporalSmoothing(rawScores) {
  if (!smoothedScores) {
    smoothedScores = { ...rawScores };
    return smoothedScores;
  }
  const result = {};
  for (const key of Object.keys(rawScores)) {
    const prev = smoothedScores[key] !== undefined ? smoothedScores[key] : rawScores[key];
    result[key] = prev * (1 - EMA_ALPHA) + rawScores[key] * EMA_ALPHA;
  }
  for (const key of Object.keys(smoothedScores)) {
    if (result[key] === undefined) {
      result[key] = smoothedScores[key] * (1 - EMA_ALPHA);
    }
  }
  smoothedScores = result;
  return result;
}

function calibrateConfidence(dominantScore, expressionStability) {
  let confidence = dominantScore;
  if (confidence > 0.8) confidence = Math.min(0.95, confidence);
  else if (confidence < 0.3) confidence = Math.max(0.1, confidence);
  confidence = confidence * (0.85 + 0.15 * expressionStability);
  return Math.max(0.05, Math.min(0.98, confidence));
}

function computeExpressionStability(expressions) {
  if (!expressions) return 0.5;
  const vals = Object.values(expressions);
  const maxVal = Math.max(...vals);
  const secondMax = vals.sort((a, b) => b - a)[1] || 0;
  const gap = maxVal - secondMax;
  return Math.min(1, Math.max(0, gap * 3));
}

function assessFrameQuality(videoElement) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, 224, 224);
    const imageData = ctx.getImageData(0, 0, 224, 224);
    const pixels = imageData.data;

    let totalBrightness = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      totalBrightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    }
    const avgBrightness = totalBrightness / (pixels.length / 4);

    let brightnessDiff = 0;
    for (let i = 4; i < pixels.length; i += 4) {
      const curr = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      const prev = (pixels[i - 4] + pixels[i - 3] + pixels[i - 2]) / 3;
      brightnessDiff += Math.abs(curr - prev);
    }
    const blurMetric = 1 - Math.min(1, brightnessDiff / (pixels.length / 4) / 50);

    const isLowLight = avgBrightness < 40;
    const isBlurry = blurMetric > 0.7;

    frameQualityStats.lastBrightness = avgBrightness;
    frameQualityStats.lastBlurMetric = blurMetric;

    if (isLowLight || isBlurry) {
      frameQualityStats.consecutiveLowQuality++;
    } else {
      frameQualityStats.consecutiveLowQuality = Math.max(0, frameQualityStats.consecutiveLowQuality - 1);
    }

    return {
      avgBrightness,
      blurMetric: Math.round(blurMetric * 100) / 100,
      isLowLight,
      isBlurry,
      qualityOk: !isLowLight && !isBlurry,
      consecutiveLowQuality: frameQualityStats.consecutiveLowQuality,
    };
  } catch {
    return { avgBrightness: 128, blurMetric: 0.5, isLowLight: false, isBlurry: false, qualityOk: true, consecutiveLowQuality: 0 };
  }
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
        const stability = computeExpressionStability(expressions);
        const entries = Object.entries(expressions);
        entries.sort((a, b) => b[1] - a[1]);
        const dominant = entries[0][0];
        const dominantScore = entries[0][1];

        const mapped = mapExpressionToEmotion(dominant);
        const calibratedScore = calibrateConfidence(dominantScore, stability);

        const rawScores = {
          Happy: expressions.happy || 0,
          Neutral: expressions.neutral || 0,
          Sad: expressions.sad || 0,
          Nervous: expressions.fearful || 0,
          Angry: expressions.angry || 0,
          Confident: expressions.happy * 0.5 + expressions.neutral * 0.5,
        };

        const smoothed = applyTemporalSmoothing(rawScores);
        const smoothedEntries = Object.entries(smoothed);
        smoothedEntries.sort((a, b) => b[1] - a[1]);
        const smoothedDominant = smoothedEntries[0][0];
        const smoothedMapped = mapExpressionToEmotion(smoothedDominant);

        const frameQuality = assessFrameQuality(videoElement);
        const qualityPenalty = frameQuality.qualityOk ? 1.0 : 0.85;

        lastRawResult = {
          emotion: smoothedMapped.label,
          score: Math.round(calibratedScore * qualityPenalty * 100) / 100,
          raw: smoothedDominant,
          faceDetected: true,
          scores: smoothed,
          expressionStability: Math.round(stability * 100) / 100,
          frameQuality,
        };
        return lastRawResult;
      }
    } catch (err) {
      console.warn('face-api error, falling back to backend ViT:', err.message);
    }
  }

  return detectEmotionBackend(videoElement);
}

export async function detectFaces(videoElement) {
  if (!videoElement || !videoElement.videoWidth || !loaded) {
    return { faceCount: 0, faceDetected: false, faceBoxes: [], faceChangeWarning: false };
  }

  try {
    const results = await faceapi.detectAllFaces(
      videoElement,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.3 })
    );

    const faceCount = results.length;

    if (faceCount > 1) {
      const now = Date.now();
      if (now - lastMultiFaceTime < MULTI_FACE_COOLDOWN_MS) {
        return {
          faceCount,
          faceDetected: faceCount > 0,
          faceBoxes: results.map((r) => r.box),
          faceChangeWarning: false,
        };
      }
      lastMultiFaceTime = now;
      multiFaceConfirmations++;
    } else {
      multiFaceConfirmations = Math.max(0, multiFaceConfirmations - 1);
    }

    return {
      faceCount,
      faceDetected: faceCount > 0,
      faceBoxes: results.map((r) => r.box),
      faceChangeWarning: faceCount > 1,
      multiFaceConfirmations,
    };
  } catch (err) {
    console.warn('Multi-face detection error:', err.message);
    return { faceCount: 0, faceDetected: false, faceBoxes: [], faceChangeWarning: false, multiFaceConfirmations };
  }
}

export function getMultiFaceWarningCount() {
  return multiFaceConfirmations;
}

export function getFrameQualityStats() {
  return { ...frameQualityStats };
}

export function resetDetectionState() {
  resetSmoothing();
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

    const rawScores = {
      Happy: em.scores?.Happy || 0,
      Neutral: em.scores?.Neutral || 1,
      Sad: em.scores?.Sad || 0,
      Nervous: em.scores?.Nervous || 0,
      Angry: em.scores?.Angry || 0,
      Confident: em.scores?.Confident || 0,
    };

    const smoothed = applyTemporalSmoothing(rawScores);

    return {
      emotion: em.emotion || 'Neutral',
      score: em.confidence || 0.5,
      raw: em.vitLabel || 'vit',
      faceDetected: true,
      scores: smoothed,
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
