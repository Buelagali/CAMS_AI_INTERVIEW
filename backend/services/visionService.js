const { pipeline, RawImage } = require('@xenova/transformers');

let imagePipeline = null;

async function getImagePipeline() {
  if (!imagePipeline) {
    imagePipeline = await pipeline('image-classification', 'Xenova/vit-base-patch16-224');
  }
  return imagePipeline;
}

const EMOTION_IMAGE_MAP = {
  'cheerful': 'Happy',
  'happy': 'Happy',
  'smiling': 'Happy',
  'neutral': 'Neutral',
  'serious': 'Neutral',
  'sad': 'Sad',
  'depressed': 'Sad',
  'fearful': 'Nervous',
  'terrified': 'Nervous',
  'angry': 'Angry',
  'hostile': 'Angry',
  'confident': 'Confident',
  'proud': 'Confident',
};

const BEHAVIOR_CLASSES = [
  'attentive', 'distracted', 'engaged', 'nodding', 'speaking',
  'listening', 'thinking', 'frustrated', 'confused', 'interested',
];

exports.analyzeFrame = async (imageBuffer) => {
  if (!imageBuffer || imageBuffer.length < 100) {
    return { emotion: 'Neutral', confidence: 0.5, behavior: 'unknown', scores: {} };
  }

  try {
    const pipe = await getImagePipeline();
    const image = await RawImage.from(imageBuffer).resize(224, 224);
    const output = await pipe(image);

    const top = output[0];
    const label = top.label.toLowerCase();
    const score = top.score;

    let mappedEmotion = 'Neutral';
    for (const [key, val] of Object.entries(EMOTION_IMAGE_MAP)) {
      if (label.includes(key)) {
        mappedEmotion = val;
        break;
      }
    }

    let detectedBehavior = 'unknown';
    for (const b of BEHAVIOR_CLASSES) {
      if (label.includes(b)) {
        detectedBehavior = b;
        break;
      }
    }

    const scores = {};
    output.slice(0, 6).forEach((item) => {
      const em = EMOTION_IMAGE_MAP[item.label] || item.label;
      scores[em] = (scores[em] || 0) + item.score;
    });
    const emotions = ['Happy', 'Neutral', 'Sad', 'Nervous', 'Angry', 'Confident'];
    emotions.forEach((e) => { if (!scores[e]) scores[e] = 0.05; });

    return {
      emotion: mappedEmotion,
      confidence: score,
      behavior: detectedBehavior,
      scores,
      vitLabel: label,
      topPredictions: output.slice(0, 5),
    };
  } catch (err) {
    console.error('ViT frame analysis error:', err.message);
    return { emotion: 'Neutral', confidence: 0.5, behavior: 'unknown', scores: {
      Happy: 0.1, Neutral: 0.5, Sad: 0.1, Nervous: 0.1, Angry: 0.1, Confident: 0.1,
    } };
  }
};

exports.analyzeEngagement = (frameResults) => {
  if (!frameResults || frameResults.length < 2) {
    return { engagementScore: 50, attentionSpan: 50, behaviorProfile: 'insufficient_data' };
  }

  const attentiveFrames = frameResults.filter((f) =>
    f.behavior === 'attentive' || f.behavior === 'engaged' || f.behavior === 'listening'
  ).length;

  const positiveEmotions = frameResults.filter((f) =>
    f.emotion === 'Happy' || f.emotion === 'Confident' || f.emotion === 'Neutral'
  ).length;

  const engagementScore = Math.round((attentiveFrames / frameResults.length) * 100);
  const attentionSpan = Math.round((positiveEmotions / frameResults.length) * 100);

  let behaviorProfile = 'inconsistent';
  if (engagementScore >= 70) behaviorProfile = 'highly_engaged';
  else if (engagementScore >= 50) behaviorProfile = 'moderately_engaged';
  else if (engagementScore >= 30) behaviorProfile = 'distracted';

  return { engagementScore, attentionSpan, behaviorProfile };
};
