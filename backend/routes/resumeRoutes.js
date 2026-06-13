const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadResume, matchResume } = require('../controllers/resumeController');
const { analyzeEmotion } = require('../controllers/emotionController');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.single('resume'), uploadResume);
router.post('/match', matchResume);
router.post('/emotion', analyzeEmotion);

module.exports = router;
