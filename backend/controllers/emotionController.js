const { analyzeFrame } = require('../services/visionService');

exports.analyzeEmotion = async (req, res) => {
  try {
    const { imageData } = req.body;
    if (!imageData) return res.status(400).json({ error: 'No image data provided' });

    const imageBuffer = Buffer.from(imageData, 'base64');
    const emotion = await analyzeFrame(imageBuffer);
    res.json({ emotion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
