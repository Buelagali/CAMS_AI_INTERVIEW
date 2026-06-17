/**
 * Transcription Confidence Service
 * 
 * Estimates confidence in transcription quality based on:
 * - Whisper model confidence score
 * - Speech duration and length
 * - Voice activity ratio (speech vs silence)
 * - Signal-to-Noise Ratio
 * - Wav2Vec2 speech quality features
 * - Speech clarity indicators (articulation, fluency)
 * - Absence of uncertain words (filler words, hesitations)
 */

function estimateFromTranscription(text, whisperConfidence, duration) {
  if (!text || text.trim().length === 0) {
    return { overall: 0, factors: {}, wordCount: 0 };
  }

  const words = text.trim().split(/\s+/);
  const wordCount = words.length;

  const uncertainWords = [
    'um', 'uh', 'ah', 'er', 'hmm', 'like', 'basically', 'actually',
    'sort of', 'kind of', 'you know', 'i mean', 'i guess', 'maybe',
    'perhaps', 'probably', 'i think', 'not sure', 'i dont know',
  ];
  let uncertainCount = 0;
  for (const word of words) {
    if (uncertainWords.includes(word.toLowerCase())) uncertainCount++;
  }

  const uncertainRatio = wordCount > 0 ? uncertainCount / wordCount : 0;

  const lengthScore = Math.min(1, wordCount / 30);
  const clarityScore = Math.max(0, 1 - uncertainRatio * 5);
  const durationScore = Math.min(1, duration / 30);

  const factors = {
    whisperConfidence: whisperConfidence || 0.5,
    wordCount: Math.min(1, wordCount / 50),
    uncertainRatio: 1 - uncertainRatio,
    lengthScore,
    clarityScore,
    durationScore,
  };

  const weights = { whisperConfidence: 0.35, wordCount: 0.15, uncertainRatio: 0.20, lengthScore: 0.10, clarityScore: 0.10, durationScore: 0.10 };
  let overall = 0;
  for (const [key, weight] of Object.entries(weights)) {
    overall += (factors[key] || 0) * weight;
  }

  return { overall: Math.round(Math.min(1, Math.max(0, overall)) * 100), factors, wordCount };
}

function estimateFromAudio({ snr, speechRatio, speechQuality, articulation, fluency } = {}) {
  const snrScore = Math.min(1, Math.max(0, (snr || 0) / 40));
  const speechRatioScore = speechRatio || 0.5;
  const qualityScore = speechQuality || 0.5;
  const articulationScore = articulation || 0.5;
  const fluencyScore = fluency || 0.5;

  const factors = {
    snr: snrScore,
    speechRatio: speechRatioScore,
    speechQuality: qualityScore,
    articulation: articulationScore,
    fluency: fluencyScore,
  };

  const weights = { snr: 0.30, speechRatio: 0.15, speechQuality: 0.20, articulation: 0.20, fluency: 0.15 };
  let overall = 0;
  for (const [key, weight] of Object.entries(weights)) {
    overall += (factors[key] || 0) * weight;
  }

  return { overall: Math.round(Math.min(1, Math.max(0, overall)) * 100), factors };
}

function estimateOverallConfidence(audioConfidence, transcriptionConfidence) {
  const combined = audioConfidence * 0.35 + transcriptionConfidence * 0.65;
  return Math.round(Math.min(100, Math.max(0, combined)));
}

module.exports = { estimateFromTranscription, estimateFromAudio, estimateOverallConfidence };
