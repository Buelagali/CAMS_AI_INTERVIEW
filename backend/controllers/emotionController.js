const { detectEmotion } = require('../services/emotionService');

exports.analyzeEmotion = async (req, res) => {
  try {
    const { imageData } = req.body;
    if (!imageData) return res.status(400).json({ error: 'No image data provided' });
    const emotion = await detectEmotion(imageData);
    res.json({ emotion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
