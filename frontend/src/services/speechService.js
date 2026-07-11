let preferredVoice = null;
let voiceFallbackAttempted = false;

function findVoice() {
  const voices = window.speechSynthesis.getVoices();

  const indian = voices.filter(v => v.lang === 'en-IN');
  if (indian.length > 0) {
    const neural = indian.find(v =>
      /rishi|veena|neerja|heera|aditi|niharika|priya|gaurav|dev|wavenet/i.test(v.name)
    );
    return neural || indian[0];
  }

  const english = voices.filter(v => v.lang.startsWith('en'));
  const indiaNamed = english.find(v => /india|indian/i.test(v.lang) || /india|indian/i.test(v.name));
  if (indiaNamed) return indiaNamed;

  const natural = english.find(v =>
    /samantha|daniel|kate|google\s*uk|google\s*au|google\s*in|microsoft\s*heera|microsoft\s*neerja|rich|ava|matilda|alex|fiona|karen|moira|tessa|veena|rishi|damayanti|lekha|salli|joanna|kendra|kimberly|ivo|mizuki|hugo|chantal|celine|lea|mathieu|remi|vicki|sarah|aditi|raveena|ananya/i.test(v.name)
  );
  if (natural) return natural;

  return english[0] || null;
}

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+(?=[A-Z"'([\d])/).filter(s => s.trim().length > 0);
}

let voiceInterval = null;

function ensureVoiceLoaded(callback) {
  if (window.speechSynthesis.getVoices().length > 0) {
    callback();
    return;
  }
  if (voiceInterval) clearInterval(voiceInterval);
  voiceInterval = setInterval(() => {
    if (window.speechSynthesis.getVoices().length > 0) {
      clearInterval(voiceInterval);
      voiceInterval = null;
      callback();
    }
  }, 100);
  setTimeout(() => {
    if (voiceInterval) {
      clearInterval(voiceInterval);
      voiceInterval = null;
      callback();
    }
  }, 2000);
}

const TECH_PRONUNCIATIONS = {
  'REST API': 'REST API',
  'Node.js': 'Node JS',
  'Node js': 'Node JS',
  'Express.js': 'Express JS',
  'TypeScript': 'TypeScript',
  'PyTorch': 'PyTorch',
  'TensorFlow': 'TensorFlow',
  'GitHub': 'GitHub',
  'Kubernetes': 'Kubernetes',
  'Docker': 'Docker',
  'MongoDB': 'Mongo DB',
  'SQL': 'S-Q-L',
  'API': 'A-P-I',
  'AWS': 'A-W-S',
  'GCP': 'G-C-P',
  'CI/CD': 'C-I slash C-D',
  'JSON': 'JAY-son',
  'AJAX': 'A-jax',
  'JWT': 'J-W-T',
  'OAuth': 'O-Auth',
  'npm': 'npm',
  'yarn': 'yarn',
  'WebSocket': 'Web Socket',
  'WebRTC': 'Web R-T-C',
  'SSR': 'S-S-R',
  'SPA': 'S-P-A',
};

export function speakText(text, onEnd) {
  if (!window.speechSynthesis) {
    if (onEnd) onEnd();
    return;
  }

  window.speechSynthesis.cancel();

  let cleanText = text
    .replace(/\s+/g, ' ')
    .trim();

  for (const [term, replacement] of Object.entries(TECH_PRONUNCIATIONS)) {
    const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    cleanText = cleanText.replace(regex, replacement);
  }

  const sentences = splitSentences(cleanText);
  if (sentences.length === 0) {
    if (onEnd) onEnd();
    return;
  }

  let index = 0;

  function speakNext() {
    if (index >= sentences.length) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sentences[index].trim());
    utterance.rate = 0.88;
    utterance.pitch = 1.0;
    utterance.volume = 1;
    utterance.lang = 'en-IN';

    preferredVoice = preferredVoice || findVoice();
    if (preferredVoice) {
      try {
        utterance.voice = preferredVoice;
      } catch {
        const voices = window.speechSynthesis.getVoices();
        const fallback = voices.find(v => v.name === preferredVoice.name);
        if (fallback) utterance.voice = fallback;
      }
    }

    utterance.onend = () => {
      index++;
      if (index < sentences.length) {
        setTimeout(speakNext, 150);
      } else {
        if (onEnd) onEnd();
      }
    };

    utterance.onerror = () => {
      index++;
      if (index < sentences.length) {
        setTimeout(speakNext, 150);
      } else {
        if (onEnd) onEnd();
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  ensureVoiceLoaded(() => {
    preferredVoice = findVoice();
    setTimeout(speakNext, 150);
  });
}

export function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeaking() {
  return window.speechSynthesis && window.speechSynthesis.speaking;
}

export function getPreferredVoiceName() {
  return preferredVoice?.name || 'System default';
}

if (window.speechSynthesis) {
  try {
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      preferredVoice = findVoice();
    });
  } catch {

  }
}
