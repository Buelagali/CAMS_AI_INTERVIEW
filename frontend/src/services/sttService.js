/**
 * Speech-to-Text Service
 * 
 * Dual-path architecture:
 * 
 * Path 1 - Backend Pipeline (Primary):
 *   AudioCapture (PCM) → WAV encoding → POST /api/interview/transcribe
 *   → Noise Reduction → Wav2Vec2 → Whisper → Confidence Estimation
 *   → Returns { text, confidence, segments }
 * 
 * Path 2 - Web Speech API (Fallback/Real-time):
 *   Web Speech API for low-latency interim display
 *   Used when backend unavailable or for real-time streaming
 * 
 * On submit:
 *   1. Send recorded WAV to backend for improved transcription
 *   2. If backend succeeds → use improved text + confidence
 *   3. If backend fails → use Web Speech API accumulated text
 *   4. Always keep transcript visible (never clear without replacement)
 */

let webSpeechRecognition = null;
let isWebSpeechListening = false;
let accumulatedTranscript = '';
let onTranscriptCallback = null;
let onStatusCallback = null;
let recognitionRestartTimeout = null;

const MAX_RECONNECT_ATTEMPTS = 3;
let reconnectAttempts = 0;

export function initWebSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('Web Speech API not available in this browser');
    return false;
  }

  webSpeechRecognition = new SpeechRecognition();
  webSpeechRecognition.continuous = true;
  webSpeechRecognition.interimResults = true;
  webSpeechRecognition.lang = 'en-US';
  webSpeechRecognition.maxAlternatives = 3;

  webSpeechRecognition.onresult = (event) => {
    let fullTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        fullTranscript += event.results[i][0].transcript + ' ';
      }
    }

    if (fullTranscript) {
      const currentBest = event.results[event.results.length - 1];
      if (currentBest && currentBest.isFinal) {
        accumulatedTranscript += currentBest[0].transcript + ' ';
      }
    }

    let displayText = accumulatedTranscript;
    const lastResult = event.results[event.results.length - 1];
    if (lastResult && !lastResult.isFinal) {
      displayText += lastResult[0].transcript;
    }

    if (onTranscriptCallback) {
      onTranscriptCallback(displayText.trim(), false);
    }
  };

  webSpeechRecognition.onerror = (event) => {
    console.warn('Web Speech API error:', event.error);

    if (event.error === 'no-speech' || event.error === 'aborted') {
      return;
    }

    if (event.error === 'network') {
      reconnectAttempts++;
      if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
        if (recognitionRestartTimeout) clearTimeout(recognitionRestartTimeout);
        recognitionRestartTimeout = setTimeout(() => {
          if (isWebSpeechListening) startWebSpeech();
        }, 1000 * reconnectAttempts);
      } else {
        setWebSpeechListening(false);
        if (onStatusCallback) onStatusCallback({ type: 'error', error: 'Recognition failed after retries' });
      }
      return;
    }

    if (event.error === 'not-allowed') {
      setWebSpeechListening(false);
      if (onStatusCallback) onStatusCallback({ type: 'error', error: 'Microphone access denied' });
      return;
    }

    setWebSpeechListening(false);
    if (onStatusCallback) onStatusCallback({ type: 'error', error: event.error });
  };

  webSpeechRecognition.onend = () => {
    if (isWebSpeechListening) {
      try {
        webSpeechRecognition.start();
      } catch (e) {
        console.warn('Web Speech restart failed:', e.message);
      }
    }
  };

  return true;
}

export function startWebSpeech() {
  if (!webSpeechRecognition) {
    const initialized = initWebSpeech();
    if (!initialized) return false;
  }

  try {
    webSpeechRecognition.start();
    isWebSpeechListening = true;
    reconnectAttempts = 0;
    if (onStatusCallback) onStatusCallback({ type: 'listening', source: 'webspeech' });
    return true;
  } catch (err) {
    console.warn('Failed to start Web Speech:', err.message);
    return false;
  }
}

export function stopWebSpeech() {
  if (recognitionRestartTimeout) {
    clearTimeout(recognitionRestartTimeout);
    recognitionRestartTimeout = null;
  }

  setWebSpeechListening(false);

  if (webSpeechRecognition) {
    try {
      webSpeechRecognition.stop();
    } catch (e) {
      // ignore
    }
  }
}

function setWebSpeechListening(val) {
  isWebSpeechListening = val;
}

export function resetTranscript() {
  accumulatedTranscript = '';
}

export function getAccumulatedTranscript() {
  return accumulatedTranscript.trim();
}

export function onTranscript(callback) {
  onTranscriptCallback = callback;
}

export function onStatus(callback) {
  onStatusCallback = callback;
}

export function removeListeners() {
  onTranscriptCallback = null;
  onStatusCallback = null;
}

/**
 * Send recorded audio to backend for improved transcription.
 * Returns the improved transcript with confidence scores.
 */
export async function transcribeWithBackend(audioBlob, options = {}) {
  const {
    noiseReductionStrength = 0.5,
    language = 'en',
    timeout = 30000,
  } = options;

  if (!audioBlob) {
    return { text: '', confidence: 0, error: 'No audio data' };
  }

  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav');
  formData.append('noiseReductionStrength', String(noiseReductionStrength));
  formData.append('language', language);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch('/api/interview/transcribe', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      console.warn('Backend transcription returned error:', data.error);
      if (onStatusCallback) onStatusCallback({ type: 'warning', error: data.error });
      return { text: accumulatedTranscript || '', confidence: 50, error: data.error };
    }

    if (onStatusCallback) {
      onStatusCallback({
        type: 'transcribed',
        source: 'backend',
        confidence: data.confidence?.overall || 50,
        wordCount: data.wordCount || 0,
        duration: data.duration,
      });
    }

    return {
      text: data.text || '',
      confidence: data.confidence?.overall || 50,
      segments: data.segments || [],
      duration: data.duration,
      wordCount: data.wordCount,
      raw: data,
    };
  } catch (err) {
    clearTimeout(timeoutId);

    const fallbackText = accumulatedTranscript || '';
    console.warn('Backend transcription failed, using Web Speech fallback:', err.message);

    if (onStatusCallback) {
      onStatusCallback({
        type: 'fallback',
        error: err.message,
        source: 'webspeech',
        textLength: fallbackText.length,
      });
    }

    return {
      text: fallbackText,
      confidence: 45,
      error: err.message,
      fallback: true,
    };
  }
}

/**
 * Full STT pipeline: stop Web Speech → stop audio capture → send to backend → return result
 */
export async function processFinalTranscript(audioResult, options = {}) {
  stopWebSpeech();

  if (!audioResult || !audioResult.blob) {
    return { text: getAccumulatedTranscript(), confidence: 40, fallback: true };
  }

  const backendResult = await transcribeWithBackend(audioResult.blob, options);

  if (backendResult.text && !backendResult.fallback) {
    accumulatedTranscript = backendResult.text;
    return backendResult;
  }

  if (!backendResult.text && accumulatedTranscript) {
    return {
      text: accumulatedTranscript,
      confidence: 45,
      fallback: true,
      error: backendResult.error,
    };
  }

  return backendResult;
}
