// ── Face Detection & Emotion Analysis Configuration ──
// All thresholds and parameters are centralized here for easy tuning.
// Tune these values without modifying any core detection logic.

export const FACE_CONFIDENCE_THRESHOLD = 0.5;
// Minimum confidence for a face detection to be accepted.
// 0.5 eliminates most false positives while still catching real faces
// in normal lighting. Lower (0.3) = more detections but more noise.

export const EMOTION_CONFIDENCE_THRESHOLD = 0.3;
// Minimum score for the dominant emotion to be trusted.
// If no emotion category exceeds this, the result defaults to 'Neutral'
// instead of showing an unreliable prediction.

export const INPUT_SIZE_FACE = 224;
// TinyFaceDetector input resolution for face-only detection (detectFaces).
// 224 = good balance of accuracy vs speed. Larger = slower but better.

export const INPUT_SIZE_EMOTION = 224;
// TinyFaceDetector input resolution for emotion detection (detectEmotion).
// 224 gives the best crop quality for expression extraction.

export const PRESENCE_HISTORY_LEN = 8;
// Number of recent frames to track for temporal presence smoothing.
// 8 frames at 1 fps = 8 second window, preventing brief misses from
// triggering "No Face Detected."

export const PRESENCE_MAJORITY_RATIO = 0.625;
// Fraction (5/8) of recent frames that must show a face for
// faceDetected to return true. 5/8 = 62.5% tolerates 3 misses in 8.

export const MULTI_FACE_HISTORY_LEN = 3;
export const MULTI_FACE_MAJORITY = 2;
// Multi-face detection requires 2 out of 3 recent frames to have >1 face.
// At 1 fps the stability check passes after ~2 seconds, keeping multi-face
// warnings responsive to actual violations.

export const MULTI_FACE_COOLDOWN_MS = 2500;

export const EMA_ALPHA = 0.5;
// Exponential Moving Average factor for emotion scores.
// 0.5 = half-life ~1s at 1 fps. Tracks 50% of each new frame,
// so expressions appear within 1-2 frames while still filtering
// frame-to-frame noise.

export const LOW_LIGHT_THRESHOLD = 40;
export const BLUR_THRESHOLD = 0.7;
export const FRAME_QUALITY_PENALTY = 0.85;
// When frame quality is poor, confidence scores are multiplied by this.

export const LOCK_TIMEOUT_MS = 5000;
// If a detection call holds the processing lock for longer than this,
// the lock is considered stale and forcibly released.

export const IOU_THRESHOLD = 0.3;
export const MAX_TRACK_AGE = 8;
// IoU matching and per-face track expiry for multi-face tracking.

export const NO_FACE_TIMEOUT_MS = 4000;
// How long (ms) a face must be continuously absent before issuing
// a warning. 4000ms = 4 seconds at 1 fps.

export const MAX_WARNINGS = 3;
// Total warnings before interview termination.

export const MISSED_FRAME_LIMIT = 30;
// Hard fallback: if no face is detected for this many consecutive
// frames (regardless of time elapsed), issue a warning immediately.

export const SMOOTHING_WINDOW = 12;
// Effective window for EMA smoothing (frames) — the alpha is computed
// internally as 2 / (SMOOTHING_WINDOW + 1). Not directly used by the
// majority-vote mechanism, which has its own VOTE_WINDOW_SIZE.

export const VOTE_WINDOW_SIZE = 3;
// Number of recent frames used in majority-vote emotion smoothing.
// At 1 fps, 3 frames = 3 seconds; label flips after just 2 matching
// votes (~2 s) while still filtering single-frame noise.
