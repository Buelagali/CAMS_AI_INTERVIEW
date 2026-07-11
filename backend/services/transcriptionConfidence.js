const TECHNICAL_TERMS = new Set([
  'Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express',
  'MongoDB', 'MySQL', 'Docker', 'Kubernetes', 'REST', 'API', 'GitHub',
  'TensorFlow', 'PyTorch', 'Machine', 'Learning', 'Artificial', 'Intelligence',
  'LLM', 'OpenAI', 'Next.js', 'SQL', 'NoSQL', 'Redis', 'PostgreSQL',
  'GraphQL', 'AWS', 'Azure', 'GCP', 'CI', 'CD', 'DevOps', 'Microservices',
  'Serverless', 'Nginx', 'Linux', 'Git', 'HTML', 'CSS', 'Webpack',
  'Vite', 'Jest', 'Cypress', 'Transformer', 'Database', 'Algorithm',
  'Polymorphism', 'Inheritance', 'Encapsulation', 'Abstraction',
  'Recursion', 'Asynchronous', 'Middleware', 'Authentication',
  'Authorization',
]);

const TELUGU_WORDS = new Set([
  'naaku', 'naku', 'naa', 'maa', 'meru', 'miru', 'memu',
  'em', 'enti', 'enduku', 'ela', 'eppudu', 'ekkada',
  'kaadu', 'kadu', 'avunu', 'undhi', 'ledhu', 'ledu',
  'taggedi', 'taggindi', 'bagundi', 'bagondi',
  'cheppandi', 'chepparu', 'choodandi', 'vinandi',
  'pettandi', 'tesukondi', 'chesukondi', 'chuddam',
  'mari', 'kuda', 'tappa', 'kani', 'kabatti', 'appudu',
  'tarvata', 'mundu', 'venaka', 'pai', 'kinda',
]);

function estimateFromTranscription(text, whisperConfidence, duration, perWordScores = []) {
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

  const technicalCount = words.filter((w) => TECHNICAL_TERMS.has(w) || TECHNICAL_TERMS.has(w.charAt(0).toUpperCase() + w.slice(1))).length;
  const technicalRatio = wordCount > 0 ? technicalCount / wordCount : 0;
  const technicalBoost = Math.min(0.15, technicalRatio * 0.3);

  const teluguCount = words.filter((w) => TELUGU_WORDS.has(w.toLowerCase())).length;
  const codeSwitchRatio = wordCount > 0 ? teluguCount / wordCount : 0;

  const avgWordConf = perWordScores.length > 0
    ? perWordScores.reduce((a, b) => a + b, 0) / perWordScores.length
    : whisperConfidence;

  const lengthScore = Math.min(1, wordCount / 30);
  const clarityScore = Math.max(0, 1 - uncertainRatio * 5);
  const durationScore = Math.min(1, duration / 30);

  const factors = {
    whisperConfidence: whisperConfidence || 0.5,
    avgWordConfidence: avgWordConf,
    wordCount: Math.min(1, wordCount / 50),
    uncertainRatio: 1 - uncertainRatio,
    lengthScore,
    clarityScore,
    durationScore,
    technicalRatio: Math.min(1, technicalRatio * 2),
    codeSwitchRatio,
  };

  const weights = {
    whisperConfidence: 0.20,
    avgWordConfidence: 0.15,
    wordCount: 0.10,
    uncertainRatio: 0.15,
    lengthScore: 0.08,
    clarityScore: 0.08,
    durationScore: 0.07,
    technicalRatio: 0.12,
    codeSwitchRatio: 0.05,
  };

  let overall = 0;
  for (const [key, weight] of Object.entries(weights)) {
    overall += (factors[key] || 0) * weight;
  }

  overall += technicalBoost;
  if (codeSwitchRatio > 0.3) overall *= 0.9;
  if (wordCount > 0 && wordCount < 3) overall *= 0.8;

  return {
    overall: Math.round(Math.min(1, Math.max(0, overall)) * 100),
    factors,
    wordCount,
    technicalTermCount: technicalCount,
    codeSwitchDetected: teluguCount > 0,
  };
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
  const combined = audioConfidence * 0.30 + transcriptionConfidence * 0.70;
  return Math.round(Math.min(100, Math.max(0, combined)));
}

module.exports = { estimateFromTranscription, estimateFromAudio, estimateOverallConfidence };
