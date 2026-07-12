const { extractResumeFields } = require('../services/layoutlmService');
const { matchResumeToJob } = require('../services/jobMatchService');

exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let text = '';
    if (req.file.buffer) {
      text = req.file.buffer.toString('utf-8');
    }

    const resumeData = await extractResumeFields(text || '', { buffer: req.file.buffer });

    res.json({ resumeData, layoutLmUsed: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.matchResume = async (req, res) => {
  const { resumeData, role } = req.body;
  if (!resumeData || !role) {
    return res.status(400).json({ error: 'resumeData and role are required' });
  }
  const matchResult = await matchResumeToJob(resumeData, role);
  res.json(matchResult);
};
