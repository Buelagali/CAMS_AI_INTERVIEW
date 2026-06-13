const { parseResume } = require('../services/resumeParserService');
const { matchResumeToJob } = require('../services/jobMatchService');

exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const resumeData = await parseResume(req.file.path, req.file.buffer);
    res.json({ resumeData });
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
