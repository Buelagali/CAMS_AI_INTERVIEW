exports.analyzeAudioFeatures = async (audioData) => {
  if (!audioData) {
    return {
      pitch: 0.5,
      energy: 0.5,
      speechRate: 0.5,
      voiceStability: 0.5,
      confidence: 50,
    };
  }

  const hash = simpleHash(audioData.substring(0, 500));

  const pitch = 0.3 + (Math.abs(hash * 7) % 7000) / 10000;
  const energy = 0.3 + (Math.abs(hash * 11) % 7000) / 10000;
  const speechRate = 0.3 + (Math.abs(hash * 17) % 7000) / 10000;
  const voiceStability = 0.3 + (Math.abs(hash * 23) % 7000) / 10000;

  const confidence = Math.round(
    (pitch * 0.2 + energy * 0.3 + speechRate * 0.2 + voiceStability * 0.3) * 100
  );

  return { pitch, energy, speechRate, voiceStability, confidence };
};

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}
