let webSpeechRecognition = null;
let isWebSpeechListening = false;
let accumulatedTranscript = '';
let onTranscriptCallback = null;
let onStatusCallback = null;
let recognitionRestartTimeout = null;
let onImprovedTranscriptCallback = null;

let activeSessionId = null;
let streamingInterval = null;
let lastStreamingTranscript = '';
let streamingAccumulatedText = '';

const MAX_RECONNECT_ATTEMPTS = 3;
let reconnectAttempts = 0;

const MAX_CHUNK_RETRIES = 3;
const CHUNK_RETRY_DELAY_MS = [500, 1500, 3000];
let chunkSendQueue = Promise.resolve();
let lastChunkIndexSent = 0;
let totalChunkSendFailures = 0;

const LANGUAGE_CONFIGS = [
  { lang: 'en-IN', label: 'Indian English' },
  { lang: 'en-US', label: 'US English' },
  { lang: 'te-IN', label: 'Telugu' },
];

export function setActiveSession(sessionId) {
  activeSessionId = sessionId;
}

export function initWebSpeech(preferredLang = 'en-IN') {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('Web Speech API not available in this browser');
    return false;
  }

  webSpeechRecognition = new SpeechRecognition();
  webSpeechRecognition.continuous = true;
  webSpeechRecognition.interimResults = true;
  webSpeechRecognition.lang = preferredLang;
  webSpeechRecognition.maxAlternatives = 5;

  webSpeechRecognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        const best = event.results[i][0].transcript;
        accumulatedTranscript += best + ' ';
      }
    }

    let displayText = accumulatedTranscript;
    const lastResult = event.results[event.results.length - 1];
    const isInterim = lastResult && !lastResult.isFinal;
    if (isInterim) {
      displayText += lastResult[0].transcript;
    }

    if (onTranscriptCallback) {
      onTranscriptCallback(displayText.trim(), isInterim);
    }
  };

  webSpeechRecognition.onerror = (event) => {
    console.warn('Web Speech API error:', event.error);

    if (event.error === 'no-speech' || event.error === 'aborted') {
      return;
    }

    if (event.error === 'network') {
      reconnectAttempts++;
      if (recognitionRestartTimeout) clearTimeout(recognitionRestartTimeout);
      const delay = Math.min(3000, 500 * reconnectAttempts);
      recognitionRestartTimeout = setTimeout(() => {
        if (isWebSpeechListening) startWebSpeech();
      }, delay);
      if (reconnectAttempts > 3 && onStatusCallback) {
        onStatusCallback({ type: 'warning', source: 'backend', message: 'Using backend Whisper (browser speech unavailable)' });
      }
      return;
    }

    if (event.error === 'not-allowed') {
      setWebSpeechListening(false);
      if (onStatusCallback) onStatusCallback({ type: 'error', error: 'Microphone access denied' });
      return;
    }

    if (event.error === 'language-not-supported') {
      const currentIdx = LANGUAGE_CONFIGS.findIndex((c) => c.lang === webSpeechRecognition.lang);
      if (currentIdx < LANGUAGE_CONFIGS.length - 1) {
        webSpeechRecognition.lang = LANGUAGE_CONFIGS[currentIdx + 1].lang;
        if (isWebSpeechListening) {
          try {
            webSpeechRecognition.stop();
            webSpeechRecognition.start();
          } catch (e) {}
        }
        if (onStatusCallback) onStatusCallback({ type: 'info', message: `Falling back to ${LANGUAGE_CONFIGS[currentIdx + 1].label}` });
        return;
      }
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

export function startWebSpeech(lang) {
  if (!webSpeechRecognition) {
    const initialized = initWebSpeech(lang);
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
  streamingAccumulatedText = '';
  lastStreamingTranscript = '';
  chunkSendQueue = Promise.resolve();
  lastChunkIndexSent = 0;
}

export function getAccumulatedTranscript() {
  const best = streamingAccumulatedText || accumulatedTranscript;
  return best.trim();
}

export function onTranscript(callback) {
  onTranscriptCallback = callback;
}

export function onStatus(callback) {
  onStatusCallback = callback;
}

export function onImprovedTranscript(callback) {
  onImprovedTranscriptCallback = callback;
}

export function removeListeners() {
  onTranscriptCallback = null;
  onStatusCallback = null;
  onImprovedTranscriptCallback = null;
  stopStreamingTranscription();
}

async function sendChunkWithRetry(audioBlob, sessionId, chunkIndex) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'chunk.wav');
  formData.append('sessionId', sessionId);
  formData.append('chunkIndex', String(chunkIndex));

  let lastError = null;

  for (let attempt = 0; attempt < MAX_CHUNK_RETRIES; attempt++) {
    try {
      const response = await fetch(`/api/interview/session/${sessionId}/transcribe-chunk`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}`);
        if (attempt < MAX_CHUNK_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, CHUNK_RETRY_DELAY_MS[attempt]));
        }
        continue;
      }

      const data = await response.json();

      if (data.text && data.text !== lastStreamingTranscript) {
        lastStreamingTranscript = data.text;
        streamingAccumulatedText = data.text;

        if (onImprovedTranscriptCallback) {
          onImprovedTranscriptCallback(data.text, false, data.confidence);
        }
      }

      return data;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_CHUNK_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, CHUNK_RETRY_DELAY_MS[attempt]));
      }
    }
  }

  if (onStatusCallback) {
    onStatusCallback({ type: 'warning', error: `Chunk ${chunkIndex} dropped after ${MAX_CHUNK_RETRIES} retries` });
  }

  totalChunkSendFailures++;
  return null;
}

export async function sendStreamingChunk(audioBlob, sessionId) {
  if (!audioBlob || !sessionId) return null;

  const chunkIndex = ++lastChunkIndexSent;

  const result = await new Promise((resolve, reject) => {
    chunkSendQueue = chunkSendQueue.then(() => {
      return sendChunkWithRetry(audioBlob, sessionId, chunkIndex).then(resolve, reject);
    });
  });

  return result;
}

export function getChunkSendStats() {
  return {
    totalFailures: totalChunkSendFailures,
    lastIndexSent: lastChunkIndexSent,
    queueLength: 0,
  };
}

export function startStreamingTranscription(onChunkResult, sessionId, options = {}) {
  stopStreamingTranscription();
  streamingAccumulatedText = '';
  activeSessionId = sessionId || activeSessionId;

  const intervalMs = options.fastPoll ? 2000 : 4000;

  streamingInterval = setInterval(async () => {
    if (!activeSessionId) return;

    try {
      const response = await fetch(`/api/interview/session/${activeSessionId}/transcribe-chunk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalize: false }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text && data.text !== lastStreamingTranscript) {
          lastStreamingTranscript = data.text;
          streamingAccumulatedText = data.text;

          if (onImprovedTranscriptCallback) {
            onImprovedTranscriptCallback(data.text, false, data.confidence);
          }

          if (onChunkResult) onChunkResult(data);

          if (onStatusCallback) {
            onStatusCallback({
              type: 'streaming',
              source: 'backend',
              confidence: data.confidence?.overall || 50,
              wordCount: data.wordCount || 0,
            });
          }
        }
      }
    } catch (err) {
      // poll silently
    }
  }, intervalMs);

  return streamingInterval;
}

export function stopStreamingTranscription() {
  if (streamingInterval) {
    clearInterval(streamingInterval);
    streamingInterval = null;
  }

  if (activeSessionId) {
    fetch(`/api/interview/session/${activeSessionId}/transcribe-chunk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalize: true }),
    }).catch(() => {});
  }
}

export async function transcribeWithBackend(audioBlob, options = {}) {
  const {
    noiseReductionStrength = 0.5,
    language = 'en',
    timeout = 60000,
    sessionId = activeSessionId,
  } = options;

  if (!audioBlob) {
    return { text: '', confidence: 0, error: 'No audio data' };
  }

  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav');
  formData.append('noiseReductionStrength', String(noiseReductionStrength));
  formData.append('language', language);
  if (sessionId) formData.append('sessionId', sessionId);

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

    if (data.text && data.text.trim()) {
      streamingAccumulatedText = data.text;
    }

    if (onStatusCallback) {
      onStatusCallback({
        type: 'transcribed',
        source: 'backend',
        confidence: data.confidence?.overall || 50,
        wordCount: data.wordCount || 0,
        duration: data.duration,
        processingTime: data.processingTime,
      });
    }

    return {
      text: data.text || '',
      confidence: data.confidence?.overall || 50,
      segments: data.segments || [],
      duration: data.duration,
      wordCount: data.wordCount,
      processingTime: data.processingTime,
      model: data.model,
      raw: data,
    };
  } catch (err) {
    clearTimeout(timeoutId);

    const fallbackText = streamingAccumulatedText || accumulatedTranscript || '';
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

export async function processFinalTranscript(audioResult, options = {}) {
  stopWebSpeech();
  stopStreamingTranscription();

  if (!audioResult || !audioResult.blob) {
    const fallback = streamingAccumulatedText || getAccumulatedTranscript();
    return { text: fallback, confidence: 40, fallback: true, error: 'No audio data' };
  }

  if (audioResult.silence) {
    const fallback = streamingAccumulatedText || getAccumulatedTranscript();
    if (fallback) {
      return { text: fallback, confidence: 45, fallback: true, error: 'Silence detected, using streaming transcript' };
    }
    return { text: '', confidence: 0, fallback: true, error: 'No speech detected' };
  }

  const backendResult = await transcribeWithBackend(audioResult.blob, options);

  if (backendResult.text && !backendResult.fallback) {
    accumulatedTranscript = backendResult.text;
    streamingAccumulatedText = backendResult.text;
    return backendResult;
  }

  const fallbackText = streamingAccumulatedText || accumulatedTranscript || '';
  if (!backendResult.text && fallbackText) {
    return {
      text: fallbackText,
      confidence: 45,
      fallback: true,
      error: backendResult.error,
    };
  }

  return backendResult;
}
