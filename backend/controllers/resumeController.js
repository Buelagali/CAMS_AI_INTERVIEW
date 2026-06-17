const { parseResume } = require('../services/resumeParserService');
const { extractResumeFields } = require('../services/layoutlmService');
const { matchResumeToJob } = require('../services/jobMatchService');

exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const basicParsed = await parseResume(req.file.path, req.file.buffer);

    let text = '';
    if (req.file.buffer) {
      text = req.file.buffer.toString('utf-8');
    }

    let layoutLmFields = null;
    try {
      layoutLmFields = await extractResumeFields(text || basicParsed.rawText || '');
    } catch (err) {
      console.warn('LayoutLM extraction skipped:', err.message);
    }

    const mergedData = {
      rawText: (text || basicParsed.rawText || '').substring(0, 5000),
      name: layoutLmFields?.name || basicParsed.name || 'Unknown',
      email: layoutLmFields?.email || basicParsed.email || '',
      phone: layoutLmFields?.phone || basicParsed.phone || '',
      skills: layoutLmFields?.skills?.length > 0 ? layoutLmFields.skills : basicParsed.skills || [],
      education: layoutLmFields?.education?.length > 0 ? layoutLmFields.education : basicParsed.education || [],
      experience: layoutLmFields?.experience || basicParsed.experience || 0,
      projects: layoutLmFields?.projects?.length > 0 ? layoutLmFields.projects : basicParsed.projects || [],
      certifications: layoutLmFields?.certifications?.length > 0 ? layoutLmFields.certifications : basicParsed.certifications || [],
    };

    res.json({ resumeData: mergedData, layoutLmUsed: layoutLmFields !== null });
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
