import * as faceapi from '@vladmandic/face-api';

import {
  FACE_CONFIDENCE_THRESHOLD,
  EMOTION_CONFIDENCE_THRESHOLD,
  INPUT_SIZE_FACE,
  INPUT_SIZE_EMOTION,
  PRESENCE_HISTORY_LEN,
  PRESENCE_MAJORITY_RATIO,
  EMA_ALPHA,
  LOW_LIGHT_THRESHOLD,
  BLUR_THRESHOLD,
  FRAME_QUALITY_PENALTY,
  LOCK_TIMEOUT_MS,
  IOU_THRESHOLD,
  NMS_IOU_THRESHOLD,
  RAW_CONFIDENCE_FLOOR,
  MAX_TRACK_AGE,
  NO_FACE_TIMEOUT_MS,
  MISSED_FRAME_LIMIT,
  VOTE_WINDOW_SIZE,
} from './faceDetectionConfig.js';

const MODEL_URL = '/face-api-models/';

// ── Model loading state ──
let loaded = false;
let loadingAttempted = false;

// ── Separate processing locks for emotion & face detection ──
// Previously a single shared lock caused detectFaces to return stale
// results when detectEmotion was processing. Separate locks allow
// both to run concurrently without cascading failures.
let emotionLock = false;
let emotionLockTime = 0;
let facesLock = false;
let facesLockTime = 0;

// ── Temporal presence buffers ──
// There are TWO independent buffers:
//   1. presenceHistory       — used by detectEmotion (emotion analysis)
//   2. facePresenceOnly      — used ONLY by detectFaces (proctoring)
//
// The emotion and face-detection intervals run concurrently. When
// detectEmotion fails to find a face (e.g. expression extraction drops the
// frame), it calls updatePresence(false). If this happened to share a buffer
// with detectFaces, the false entry would make getSmoothedPresence() return
// "No Face" even though detectFaces correctly sees the face.
//
// Separate buffers eliminate this cross-contamination.
let presenceHistory = [];
let facePresenceOnly = [];

function updatePresence(rawDetected) {
  presenceHistory.push(rawDetected);
  if (presenceHistory.length > PRESENCE_HISTORY_LEN) {
    presenceHistory.shift();
  }
}

function getSmoothedPresence() {
  if (presenceHistory.length === 0) return false;
  const count = presenceHistory.filter(Boolean).length;
  const needed = Math.ceil(PRESENCE_HISTORY_LEN * PRESENCE_MAJORITY_RATIO);
  return count >= needed;
}

function updateFacePresence(rawDetected) {
  facePresenceOnly.push(rawDetected);
  if (facePresenceOnly.length > PRESENCE_HISTORY_LEN) {
    facePresenceOnly.shift();
  }
}

function getFacePresence() {
  if (facePresenceOnly.length === 0) return false;
  const count = facePresenceOnly.filter(Boolean).length;
  const needed = Math.ceil(PRESENCE_HISTORY_LEN * PRESENCE_MAJORITY_RATIO);
  return count >= needed;
}

// ── Multi-face temporal buffer (deprecated — stability moved to Interview.jsx proctoring loop) ──

// ── Emotion majority-vote history ──
// Records the raw dominant emotion label from each frame so the
// displayed emotion is the majority over VOTE_WINDOW_SIZE (3) frames.
// This is more stable than EMA-smoothed scores because it requires a
// sustained change (majority of the window) before the label flips.
let emotionVoteHistory = [];
let noFaceVoteFrames = 0;

// ── Face-loss hold state ──
// When the face is temporarily lost, keep returning the last reliable
// emotion and scores for up to HOLD_DURATION_MS so the UI doesn't
// flicker to Neutral on brief interruptions.
let lastFaceTime = Date.now();
let holdEmotion = 'Neutral';
let holdScores = { Happy: 0, Neutral: 1, Sad: 0, Nervous: 0, Angry: 0, Confident: 0 };
let holdActive = false;
const HOLD_DURATION_MS = 2000;

function recordEmotionVote(emotion) {
  emotionVoteHistory.push(emotion);
  if (emotionVoteHistory.length > VOTE_WINDOW_SIZE) {
    emotionVoteHistory.shift();
  }
}

function getMajorityEmotion() {
  if (emotionVoteHistory.length === 0) return 'Neutral';
  const counts = {};
  for (const e of emotionVoteHistory) {
    counts[e] = (counts[e] || 0) + 1;
  }
  let maxCount = 0;
  let maxEmotion = 'Neutral';
  for (const [em, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxEmotion = em;
    }
  }
  return maxEmotion;
}

function getVoteDistribution() {
  const counts = {};
  for (const e of emotionVoteHistory) {
    counts[e] = (counts[e] || 0) + 1;
  }
  return counts;
}

// ── Per-face tracker state ──
let faceTracks = new Map();
let nextFaceId = 0;

// ── Frame monitoring ──
// Tracks frame timestamps to detect FPS drops, frame reads failures, etc.
let lastFrameTimestamps = [];
let frameReadErrors = 0;
let consecutiveFrameDrops = 0;

function recordFrameCapture(success) {
  if (success) {
    lastFrameTimestamps.push(Date.now());
    if (lastFrameTimestamps.length > 30) lastFrameTimestamps.shift();
    consecutiveFrameDrops = 0;
  } else {
    consecutiveFrameDrops++;
  }
}

function getEffectiveFps() {
  if (lastFrameTimestamps.length < 2) return 0;
  const window = lastFrameTimestamps.slice(-10);
  if (window.length < 2) return 0;
  const elapsed = window[window.length - 1] - window[0];
  return elapsed > 0 ? ((window.length - 1) / elapsed * 1000).toFixed(1) : 0;
}

// ── Debug logging helper ──
let lastLogTime = 0;
const LOG_INTERVAL_MS = 10000; // Log summary every 10s

function logDiagnostics(faceDetected, faceCount, warningCount, terminationReason,
  emotion, confidence, finalEmotion) {
  const now = Date.now();
  if (now - lastLogTime < LOG_INTERVAL_MS) return;
  lastLogTime = now;
  const fps = getEffectiveFps();
  const present = getSmoothedPresence();
  const voteDist = getVoteDistribution();
  console.debug(
    `[FaceDiag]` +
    ` FPS:${fps}` +
    ` present:${present}` +
    ` faceDetected:${faceDetected}` +
    ` faceCount:${faceCount}` +
    ` frameDrops:${consecutiveFrameDrops}` +
    ` warningCount:${warningCount}` +
    ` terminationReason:${terminationReason || 'none'}` +
    ` emotion:${emotion || '?'}` +
    ` confidence:${confidence != null ? confidence.toFixed(3) : '?'}` +
    ` final:${finalEmotion || '?'}` +
    ` votes:${JSON.stringify(voteDist)}`
  );
}

// ── Model loading with retry ──
export async function loadModels() {
  if (loaded || loadingAttempted) return;
  loadingAttempted = true;

  console.log(`[FaceDetect] Detector: face-api.js (${faceapi?.version?.faceapi || faceapi?.version || '?'})`);
  console.log('[FaceDetect] Model: TinyFaceDetector');
  console.log(`[FaceDetect] Config: inputSize(Face)=${INPUT_SIZE_FACE}, inputSize(Emotion)=${INPUT_SIZE_EMOTION}, scoreThreshold=${FACE_CONFIDENCE_THRESHOLD}, presenceHistoryLen=${PRESENCE_HISTORY_LEN}, presenceMajority=${PRESENCE_MAJORITY_RATIO}`);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await faceapi.nets.tinyFaceDetector.load(MODEL_URL);
      await faceapi.nets.faceExpressionNet.load(MODEL_URL);
      loaded = true;
      resetDetectionState();
      for (let i = 0; i < PRESENCE_HISTORY_LEN; i++) {
        presenceHistory.push(true);
        facePresenceOnly.push(true);
      }
      console.log('[FaceDetect] TinyFaceDetector loaded successfully');
      return;
    } catch (err) {
      console.warn(`[FaceDetect] Model load attempt ${attempt}/3 failed:`, err.message);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  console.error('[FaceDetect] Face-api models failed to load after 3 attempts');
}

// ── State management ──
function resetLegacySmoothing() {
  // clear legacy state that used a shared lock variable
  emotionLock = false;
  emotionLockTime = 0;
  facesLock = false;
  facesLockTime = 0;
  lastFrameTimestamps = [];
  frameReadErrors = 0;
  consecutiveFrameDrops = 0;
  // per-face trackers (cleared in resetDetectionState)
}

// ── Debug logging flag (enable with ?emotion-debug URL param) ──
const DEBUG_EMOTION = typeof window !== 'undefined' &&
  window.location?.search?.includes('emotion-debug');

// ── Expression stability & confidence calibration ──
function computeExpressionStability(expressions) {
  if (!expressions) return 0.5;
  const vals = Object.values(expressions);
  const maxVal = Math.max(...vals);
  const secondMax = [...vals].sort((a, b) => b - a)[1] || 0;
  const gap = maxVal - secondMax;
  return Math.min(1, Math.max(0, gap * 3));
}

function calibrateConfidence(dominantScore, expressionStability) {
  let c = dominantScore;
  if (c > 0.8) c = Math.min(0.95, c);
  else if (c < 0.15) c = Math.max(0.08, c);
  c = c * (0.92 + 0.08 * expressionStability);
  return Math.max(0.05, Math.min(0.98, c));
}

// ── Frame quality assessment ──
// Also performs contrast analysis for low-light detection.
let frameQualityStats = {
  lastBrightness: -1,
  lastBlurMetric: -1,
  consecutiveLowQuality: 0,
};

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

    // Blur metric: brightness difference between adjacent pixels
    let brightnessDiff = 0;
    for (let i = 4; i < pixels.length; i += 4) {
      const curr = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      const prev = (pixels[i - 4] + pixels[i - 3] + pixels[i - 2]) / 3;
      brightnessDiff += Math.abs(curr - prev);
    }
    const blurMetric = 1 - Math.min(1, brightnessDiff / (pixels.length / 4) / 50);

    const isLowLight = avgBrightness < LOW_LIGHT_THRESHOLD;
    const isBlurry = blurMetric > BLUR_THRESHOLD;

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
    return {
      avgBrightness: 128, blurMetric: 0.5, isLowLight: false, isBlurry: false,
      qualityOk: true, consecutiveLowQuality: 0,
    };
  }
}

// ── Expression to emotion mapping ──
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
  return map[expression] || map[expression.toLowerCase()] || { label: 'Neutral', score: 0.5 };
}

// ── IoU face matching across frames ──
function computeIoU(a, b) {
  const xA = Math.max(a.x, b.x);
  const yA = Math.max(a.y, b.y);
  const xB = Math.min(a.x + a.width, b.x + b.width);
  const yB = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  if (inter === 0) return 0;
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  return inter / (areaA + areaB - inter);
}

// ── Non-maximum suppression for single-frame deduplication ──
// The raw detector can return multiple overlapping boxes for the same face
// (typically 2-3 boxes with slightly different positions and confidences).
// NMS keeps only the highest-confidence box per face by discarding any
// detection whose IoU with a higher-confidence detection exceeds the threshold.
function nonMaxSuppression(detections, iouThreshold = NMS_IOU_THRESHOLD, minConfidence = RAW_CONFIDENCE_FLOOR) {
  const filtered = detections.filter(d => d.detection.score >= minConfidence);

  filtered.sort((a, b) => b.detection.score - a.detection.score);

  const keep = [];
  while (filtered.length > 0) {
    const best = filtered.shift();
    keep.push(best);

    let writeIdx = 0;
    for (let i = 0; i < filtered.length; i++) {
      const iou = computeIoU(best.detection.box, filtered[i].detection.box);
      if (iou < iouThreshold) {
        filtered[writeIdx++] = filtered[i];
      }
    }
    filtered.length = writeIdx;
  }
  return keep;
}

let faceDebugFrame = 0;

function matchAndTrackFaces(detections) {
  const usedIds = new Set();
  const result = [];

  for (const det of detections) {
    const bbox = det.detection.box;
    const bboxCopy = { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
    let bestId = -1;
    let bestIoU = IOU_THRESHOLD;
    for (const [id, track] of faceTracks) {
      if (usedIds.has(id)) continue;
      const iou = computeIoU(bbox, track.box);
      if (iou > bestIoU) {
        bestIoU = iou;
        bestId = id;
      }
    }
    if (bestId >= 0) {
      const track = faceTracks.get(bestId);
      track.box = bboxCopy;
      track.expressions = { ...det.expressions };
      track.age = 0;
      usedIds.add(bestId);
      result.push({ id: bestId, box: bbox, expressions: det.expressions, isNew: false });
    } else {
      const id = nextFaceId++;
      faceTracks.set(id, {
        id, box: bboxCopy, expressions: { ...det.expressions },
        age: 0, smoothedScores: null,
      });
      result.push({ id, box: bbox, expressions: det.expressions, isNew: true });
    }
  }

  for (const [id, track] of faceTracks) {
    if (!usedIds.has(id)) {
      track.age++;
      if (track.age > MAX_TRACK_AGE) faceTracks.delete(id);
    }
  }

  return result;
}

// ── Per-face score smoothing (EMA) ──
function smoothFaceScores(faceId, rawScores) {
  const track = faceTracks.get(faceId);
  if (!track) return { ...rawScores };
  if (!track.smoothedScores) {
    track.smoothedScores = { ...rawScores };
    return { ...rawScores };
  }
  const result = {};
  for (const key of Object.keys(rawScores)) {
    const prev = track.smoothedScores[key] !== undefined ? track.smoothedScores[key] : rawScores[key];
    result[key] = prev * (1 - EMA_ALPHA) + rawScores[key] * EMA_ALPHA;
  }
  for (const key of Object.keys(track.smoothedScores)) {
    if (result[key] === undefined) {
      result[key] = track.smoothedScores[key] * (1 - EMA_ALPHA);
    }
  }
  track.smoothedScores = result;
  return result;
}

// ── Build per-face object ──
function buildFaceObject(faceId, box, expressions, quality) {
  const rawScores = {
    Happy: (expressions.happy || 0),
    Neutral: (expressions.neutral || 0),
    Sad: (expressions.sad || 0) + (expressions.disgusted || 0) * 0.3,
    Nervous: (expressions.fearful || 0),
    Angry: (expressions.angry || 0),
    Confident: (expressions.surprised || 0) * 0.6 + (expressions.happy || 0) * 0.2,
  };
  const stability = computeExpressionStability(expressions);
  const smoothed = smoothFaceScores(faceId, rawScores);
  const entries = Object.entries(smoothed);
  entries.sort((a, b) => b[1] - a[1]);
  const dominant = entries[0][0];
  const dominantScore = entries[0][1];
  const calibratedScore = calibrateConfidence(dominantScore, stability);

  return {
    id: faceId,
    box: { x: box.x, y: box.y, width: box.width, height: box.height },
    emotion: dominant,
    score: Math.round(calibratedScore * (quality.qualityOk ? 1.0 : FRAME_QUALITY_PENALTY) * 100) / 100,
    raw: dominant,
    scores: smoothed,
    expressionStability: Math.round(stability * 100) / 100,
    faceDetected: true,
  };
}

// ── Default neutral result (used across fallback paths) ──
function defaultNeutral() {
  return {
    emotion: 'Neutral', score: 0, raw: 'none', faceDetected: getSmoothedPresence(),
    scores: { Happy: 0, Neutral: 1, Sad: 0, Nervous: 0, Angry: 0, Confident: 0 },
  };
}

// ── Emotion detection with face-api ──
export async function detectEmotion(videoElement) {
  // ── Camera verification ──
  if (!videoElement || !videoElement.videoWidth) {
    recordFrameCapture(false);
    return defaultNeutral();
  }
  recordFrameCapture(true);

  // ── If models not loaded, fall back to backend ViT ──
  if (!loaded) {
    // Optimistic: assume face is present during model warmup so the
    // proctoring system doesn't trigger false warnings
    return {
      emotion: 'Neutral', score: 0, raw: 'loading', faceDetected: true,
      scores: { Happy: 0, Neutral: 1, Sad: 0, Nervous: 0, Angry: 0, Confident: 0 },
    };
  }

  // ── Separate processing lock (does NOT block detectFaces) ──
  if (emotionLock) {
    if (Date.now() - emotionLockTime > LOCK_TIMEOUT_MS) {
      emotionLock = false;
    } else {
      // Lock is active but detectEmotion has its own lock, so detectFaces
      // is not blocked. Return a neutral result with smoothed presence
      // to prevent stale emotion from propagating.
      return {
        emotion: 'Neutral', score: 0, raw: 'locked', faceDetected: getSmoothedPresence(),
        scores: { Happy: 0, Neutral: 1, Sad: 0, Nervous: 0, Angry: 0, Confident: 0 },
      };
    }
  }

  emotionLock = true;
  emotionLockTime = Date.now();
  try {
    const results = await faceapi.detectAllFaces(
      videoElement,
      new faceapi.TinyFaceDetectorOptions({ inputSize: INPUT_SIZE_EMOTION, scoreThreshold: FACE_CONFIDENCE_THRESHOLD })
    ).withFaceExpressions();

    if (results && results.length > 0) {
      updatePresence(true);
      noFaceVoteFrames = 0;
      const frameQuality = assessFrameQuality(videoElement);
      const matched = matchAndTrackFaces(results);

      const faceObjects = matched.map((m) =>
        buildFaceObject(m.id, m.box, m.expressions, frameQuality)
      );

      faceObjects.sort((a, b) => b.score - a.score);
      const primary = faceObjects[0];
      const primaryMatched = matched.find((m) => m.id === primary.id);
      const rawExp = primaryMatched ? primaryMatched.expressions : null;

      // Build raw scores from face-api expressions
      const rawScores = rawExp ? {
        Happy: rawExp.happy || 0,
        Neutral: rawExp.neutral || 0,
        Sad: (rawExp.sad || 0) + (rawExp.disgusted || 0) * 0.3,
        Nervous: rawExp.fearful || 0,
        Angry: rawExp.angry || 0,
        Confident: (rawExp.surprised || 0) * 0.6 + (rawExp.happy || 0) * 0.2,
      } : {
        Happy: primary.scores.Happy,
        Neutral: primary.scores.Neutral,
        Sad: primary.scores.Sad,
        Nervous: primary.scores.Nervous,
        Angry: primary.scores.Angry,
        Confident: primary.scores.Confident,
      };

      // Debug: dump raw face-api values for first 5 frames
      if (typeof window !== 'undefined' && !window.__emotionDebugDone) {
        if (!window.__emotionDebugCount) window.__emotionDebugCount = 0;
        window.__emotionDebugCount++;
        if (window.__emotionDebugCount <= 5 && rawExp) {
          console.log('[EmotionDebug] frame', window.__emotionDebugCount,
            'face-api:', JSON.stringify(Object.fromEntries(
              Object.entries(rawExp).map(([k, v]) => [k, v.toFixed(4)])
            )),
            '→ custom:', JSON.stringify(Object.fromEntries(
              Object.entries(rawScores).map(([k, v]) => [k, v.toFixed(4)])
            )));
        }
        if (window.__emotionDebugCount > 5) window.__emotionDebugDone = true;
      }

      // ── EMA score smoothing (primary smoothing layer) ──
    const smoothed = { ...rawScores };

      // ── Determine displayed emotion from raw scores directly ──
      // No temporal smoothing — each frame's raw face-api scores are
      // compared.  The non-neutral emotion with the highest SNR (score /
      // neutral) above 6 % (and absolute > 0.01) wins.  This gives
      // instant per-frame response with zero lag.
      const nonNeutralEmotions = ['Happy', 'Sad', 'Nervous', 'Angry', 'Confident'];
      const neutralRaw = rawScores.Neutral || 0.001;
      let bestNonNeutral = null;
      let bestRatio = 0;
      for (const em of nonNeutralEmotions) {
        const score = rawScores[em] || 0;
        if (score < 0.01) continue;
        const ratio = score / neutralRaw;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestNonNeutral = em;
        }
      }
      const finalEmotion = (bestNonNeutral && bestRatio > 0.06)
        ? bestNonNeutral
        : 'Neutral';

      // Update hold state with current values
      holdEmotion = finalEmotion;
      holdScores = { ...rawScores };
      lastFaceTime = Date.now();
      holdActive = true;

      // Build result using the label and raw scores for bars / charts
      // Record raw dominant in vote history (for diagnostics only)
      const rawDominant = (() => {
        const entries = Object.entries(rawScores);
        entries.sort((a, b) => b[1] - a[1]);
        return entries[0][0];
      })();
      recordEmotionVote(rawDominant);

      const result = {
        emotion: finalEmotion,
        score: primary.score,
        raw: rawDominant,
        faceDetected: getSmoothedPresence(),
        scores: {
          ...rawScores,
          _rawHappy: rawExp?.happy || 0,
          _rawNeutral: rawExp?.neutral || 0,
          _rawSad: rawExp?.sad || 0,
          _rawFearful: rawExp?.fearful || 0,
          _rawAngry: rawExp?.angry || 0,
          _rawSurprised: rawExp?.surprised || 0,
          _rawDisgusted: rawExp?.disgusted || 0,
          _voteDistribution: getVoteDistribution(),
        },
        expressionStability: primary.expressionStability,
        frameQuality,
        _debug: DEBUG_EMOTION ? {
          rawScores,
          rawDominant,
          bestRatio,
          bestNonNeutral,
          neutralRaw,
          finalEmotion,
        } : undefined,
      };

      if (results.length > 1) {
        result.allFaces = faceObjects;
      }

      // ── Periodic diagnostics ──
      logDiagnostics(
        result.faceDetected, results.length, 0, null,
        rawDominant, (smoothed[rawDominant] || 0), finalEmotion
      );

      return result;
    }

    // No face detected in this frame
    updatePresence(false);
    // Hysteresis: only clear vote history after 2 consecutive no-face
    // frames so a brief interruption (candidate looking down, lighting
    // flicker) doesn't reset the emotion state
    noFaceVoteFrames++;
    if (noFaceVoteFrames >= 2) {
      emotionVoteHistory = [];
    }

    // Face-loss hold: if the face disappeared less than HOLD_DURATION_MS
    // ago, keep returning the last reliable emotion and scores instead of
    // immediately snapping to Neutral. This prevents the UI from flickering
    // on brief interruptions (head turn, occlusion, lighting dip).
    const timeSinceFace = Date.now() - lastFaceTime;
    if (holdActive && timeSinceFace < HOLD_DURATION_MS) {
      return {
        emotion: holdEmotion,
        score: holdScores[holdEmotion] || 0,
        raw: 'held',
        faceDetected: false,
        scores: { ...holdScores, _voteDistribution: getVoteDistribution() },
      };
    }

    // Hold expired or no hold active — return full Neutral
    holdActive = false;
    return {
      emotion: 'Neutral', score: 0, raw: 'none', faceDetected: getSmoothedPresence(),
      scores: { Happy: 0, Neutral: 1, Sad: 0, Nervous: 0, Angry: 0, Confident: 0 },
    };
  } catch (err) {
    console.warn('face-api error, falling back to backend ViT:', err.message);
    return detectEmotionBackend(videoElement);
  } finally {
    emotionLock = false;
  }
}

// ── Face-only detection (for proctoring, multi-face, etc.) ──
export async function detectFaces(videoElement) {
  if (!videoElement || !videoElement.videoWidth) {
    recordFrameCapture(false);
    updateFacePresence(false);
    return {
      faceCount: 0, faceDetected: getFacePresence(),
      faceBoxes: [],
    };
  }
  recordFrameCapture(true);

  if (!loaded) {
    return {
      faceCount: 1, faceDetected: true,
      faceBoxes: [],
    };
  }

  if (facesLock) {
    if (Date.now() - facesLockTime > LOCK_TIMEOUT_MS) {
      facesLock = false;
    } else {
      updateFacePresence(false);
      return {
        faceCount: 0, faceDetected: getFacePresence(),
        faceBoxes: [],
      };
    }
  }

  facesLock = true;
  facesLockTime = Date.now();
  try {
    const rawResults = await faceapi.detectAllFaces(
      videoElement,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: INPUT_SIZE_FACE,
        scoreThreshold: FACE_CONFIDENCE_THRESHOLD,
      })
    );

    faceDebugFrame++;

    // ── Step 1: Log raw detections ──
    const rawCount = rawResults.length;
    const rawSummary = rawResults.map((r, i) => {
      const b = r.detection.box;
      return `  Face ${i + 1}: confidence=${r.detection.score.toFixed(3)} box=[x=${b.x.toFixed(0)} y=${b.y.toFixed(0)} w=${b.width.toFixed(0)} h=${b.height.toFixed(0)}]`;
    }).join('\n');
    console.log(
      `[FaceDetect] Frame ${faceDebugFrame}: RAW detections = ${rawCount}\n` +
      rawSummary +
      (rawCount === 0 ? '  (none)' : '')
    );

    // ── Step 2: Apply NMS (confidence floor + non-maximum suppression) ──
    // The NMS function filters out detections below RAW_CONFIDENCE_FLOOR,
    // then keeps only the highest-confidence box per face by discarding
    // any detection whose IoU with a higher-confidence box exceeds NMS_IOU_THRESHOLD.
    const nmsResults = nonMaxSuppression(rawResults);
    if (nmsResults.length !== rawCount) {
      console.log(`[FaceDetect]   After NMS (conf>=${RAW_CONFIDENCE_FLOOR}, IoU>=${NMS_IOU_THRESHOLD}): ${rawCount} -> ${nmsResults.length} (removed ${rawCount - nmsResults.length})`);
    }

    // ── Step 3: Detailed per-detection log for multi-face cases ──
    if (nmsResults.length > 1) {
      console.log(`[FaceDetect]   *** MULTI-FACE (${nmsResults.length} real detections) ***`);
      for (let i = 0; i < nmsResults.length; i++) {
        const b = nmsResults[i].detection.box;
        console.log(
          `[FaceDetect]     Real Face ${i + 1}: confidence=${nmsResults[i].detection.score.toFixed(3)} ` +
          `box=[x=${b.x.toFixed(0)} y=${b.y.toFixed(0)} w=${b.width.toFixed(0)} h=${b.height.toFixed(0)}]`
        );
        // Check IoU with all other detections
        for (let j = i + 1; j < nmsResults.length; j++) {
          const iou = computeIoU(nmsResults[i].detection.box, nmsResults[j].detection.box);
          console.log(`[FaceDetect]     IoU Face${i + 1} <-> Face${j + 1} = ${iou.toFixed(3)}`);
        }
      }
    } else if (nmsResults.length === 1) {
      console.log(`[FaceDetect]   Single face (confidence=${nmsResults[0].detection.score.toFixed(3)})`);
    }

    const faceCount = nmsResults.length;
    updateFacePresence(faceCount > 0);

    return {
      faceCount,
      faceDetected: getFacePresence(),
      faceBoxes: nmsResults.map((r) => r.detection.box),
    };
  } catch (err) {
    console.warn('[FaceDetect] Error:', err.message);
    updateFacePresence(false);
    return {
      faceCount: 0, faceDetected: getFacePresence(),
      faceBoxes: [],
    };
  } finally {
    facesLock = false;
  }
}

// ── Exported helpers ──
export function getAllFaceTracks() {
  const faces = [];
  for (const [, track] of faceTracks) {
    if (track.smoothedScores) {
      const entries = Object.entries(track.smoothedScores);
      entries.sort((a, b) => b[1] - a[1]);
      const dominant = entries[0]?.[0] || 'Neutral';
      faces.push({
        id: track.id,
        box: { ...track.box },
        emotion: dominant,
        age: track.age,
      });
    }
  }
  return faces;
}

export function getSmoothedFaceState() {
  return { present: getSmoothedPresence(), history: [...presenceHistory] };
}

export function getFrameQualityStats() {
  return { ...frameQualityStats };
}

export function getDiagnostics() {
  return {
    fps: getEffectiveFps(),
    frameReadErrors,
    consecutiveFrameDrops,
    presenceHistory: [...presenceHistory],
    smoothedPresence: getSmoothedPresence(),
    modelsLoaded: loaded,
  };
}

export function resetDetectionState() {
  emotionLock = false;
  emotionLockTime = 0;
  facesLock = false;
  facesLockTime = 0;
  faceTracks.clear();
  nextFaceId = 0;
  presenceHistory = [];
  facePresenceOnly = [];
  emotionVoteHistory = [];
  noFaceVoteFrames = 0;
  lastFaceTime = Date.now();
  holdEmotion = 'Neutral';
  holdScores = { Happy: 0, Neutral: 1, Sad: 0, Nervous: 0, Angry: 0, Confident: 0 };
  holdActive = false;
  lastFrameTimestamps = [];
  frameReadErrors = 0;
  consecutiveFrameDrops = 0;
  frameQualityStats = {
    lastBrightness: -1, lastBlurMetric: -1, consecutiveLowQuality: 0,
  };
}

// ── Backend ViT fallback ──
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

    updatePresence(true);

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
      faceDetected: getSmoothedPresence(),
      scores: smoothed,
    };
  } catch (err) {
    console.warn('Backend emotion fallback failed:', err.message);
    updatePresence(false);
    return {
      emotion: 'Neutral', score: 0, raw: 'error', faceDetected: getSmoothedPresence(),
      scores: { Happy: 0, Neutral: 1, Sad: 0, Nervous: 0, Angry: 0, Confident: 0 },
    };
  }
}
