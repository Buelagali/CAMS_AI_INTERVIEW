import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { exactSkillMatch } from '../utils/questionEngine';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function UploadResume() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [matchResult, setMatchResult] = useState(null);

  const candidate = JSON.parse(sessionStorage.getItem('candidate') || '{}');

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f || f.type !== 'application/pdf') return;
    setFile(f);
    parsePDF(f);
  };

  const parsePDF = async (file) => {
    setProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      const parsed = parseMockResume(fullText);
      const matchData = matchResumeLocally(parsed, candidate.role);
      setResumeData(parsed);
      setMatchResult(matchData);
      sessionStorage.setItem('resumeData', JSON.stringify(parsed));
      sessionStorage.setItem('resumeMatch', JSON.stringify(matchData));
    } catch (err) {
      console.error('PDF parse error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleProceed = () => {
    navigate('/interview');
  };

  return (
    <div className="page fade-in" style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Resume Analysis</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Let us match your background to the <strong>{candidate.role}</strong> role
        </p>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 32 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Upload Resume (PDF)</h3>
        <div
          style={{
            border: processing ? '2px solid var(--accent-1)' : '2px dashed var(--glass-border)',
            borderRadius: 'var(--radius-sm)',
            padding: 48,
            textAlign: 'center',
            cursor: processing ? 'default' : 'pointer',
          }}
          onClick={() => { if (!processing) fileInputRef.current?.click(); }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div style={{ fontSize: 40, marginBottom: 12 }}>
            {processing ? '⏳' : '📄'}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {processing ? 'Extracting text from PDF...' : (file ? file.name : 'Click to upload your PDF resume')}
          </p>
        </div>
      </div>

      {matchResult && (
        <div className="card slide-up" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Resume Analysis</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ position: 'relative', width: 100, height: 100 }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--glass-border)" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="45"
                  fill="none"
                  stroke="var(--accent-1)"
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 45 * matchResult.matchScore / 100} ${2 * Math.PI * 45 * (1 - matchResult.matchScore / 100)}`}
                  strokeDashoffset={2 * Math.PI * 45 * 0.25}
                  strokeLinecap="round"
                  transform="rotate(-90, 50, 50)"
                />
                <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill="var(--text-primary)" fontSize="20" fontWeight="700">
                  {matchResult.matchScore}%
                </text>
              </svg>
            </div>
            <div>
              <h3 style={{ color: 'var(--accent-2)', marginBottom: 4 }}>
                Resume Match Score
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                {matchResult.matchedSkills?.length} skills matched
              </p>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>MATCHED SKILLS</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {matchResult.matchedSkills?.length > 0 ? matchResult.matchedSkills.map((s) => (
                <span key={s} style={{ padding: '4px 12px', background: 'rgba(0, 212, 170, 0.15)', borderRadius: 20, fontSize: 13, color: 'var(--accent-2)' }}>
                  {s}
                </span>
              )) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No skills matched</span>}
            </div>
          </div>

          {matchResult.missingSkills?.length > 0 && (
            <div>
              <h4 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>RECOMMENDED SKILLS</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {matchResult.missingSkills.map((s) => (
                  <span key={s} style={{ padding: '4px 12px', background: 'rgba(255, 107, 157, 0.15)', borderRadius: 20, fontSize: 13, color: 'var(--accent-3)' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {matchResult && (
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleProceed}>
          Proceed to Interview
        </button>
      )}
    </div>
  );
}

function matchResumeLocally(resumeData, role) {
  const roleSkills = {
    'Software Developer': ['JavaScript', 'React', 'Node.js', 'TypeScript', 'Python', 'Git', 'REST', 'SQL', 'Docker', 'AWS'],
    'AI/ML Engineer': ['Python', 'Machine Learning', 'Deep Learning', 'NLP', 'TensorFlow', 'PyTorch', 'scikit-learn', 'SQL', 'Statistics', 'Docker'],
    'Data Analyst': ['SQL', 'Python', 'Excel', 'Tableau', 'Power BI', 'Statistics', 'R', 'Data Visualization', 'ETL', 'MongoDB'],
    'Cloud Engineer': ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'Linux', 'CI/CD', 'Python'],
    'Cyber Security Analyst': ['Network Security', 'Cryptography', 'Penetration Testing', 'SIEM', 'Linux', 'Python', 'Firewall', 'Incident Response', 'Risk Assessment', 'Compliance'],
  };
  const required = roleSkills[role] || roleSkills['Software Developer'];
  const candidateSkills = resumeData.skills || [];
  const matchedSkills = required.filter((s) => candidateSkills.some((cs) => exactSkillMatch(cs, s)));
  const missingSkills = required.filter((s) => !candidateSkills.some((cs) => exactSkillMatch(cs, s)));
  const skillScore = matchedSkills.length / required.length;
  const experienceScore = Math.min(1, (resumeData.experience || 0) / 2);
  const projectScore = Math.min(1, (resumeData.projects?.length || 0) / 3);
  const educationScore = (resumeData.education?.length || 0) > 0 ? 1 : 0.3;
  const matchScore = Math.round((skillScore * 0.45 + experienceScore * 0.25 + projectScore * 0.2 + educationScore * 0.1) * 100);
  return {
    matchScore,
    matchedSkills,
    missingSkills,
    matchDetails: {
      skillScore: Math.round(skillScore * 100),
      experienceScore: Math.round(experienceScore * 100),
      projectScore: Math.round(projectScore * 100),
      educationScore: Math.round(educationScore * 100),
    },
  };
}

function parseMockResume(text) {
  const skillKeywords = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'React', 'Angular', 'Vue',
    'Node.js', 'Express', 'Django', 'Flask', 'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Git', 'REST', 'GraphQL',
    'Machine Learning', 'Deep Learning', 'NLP', 'TensorFlow', 'PyTorch', 'scikit-learn',
    'HTML', 'CSS', 'Tailwind', 'Bootstrap', 'Redux', 'Next.js',
    'CI/CD', 'Jenkins', 'Terraform', 'Linux', 'Agile', 'Scrum',
  ];
  const skills = skillKeywords.filter((s) => text.toLowerCase().includes(s.toLowerCase()));
  const expMatch = text.match(/(\d+)\+?\s*years?/i);
  const experience = expMatch ? parseInt(expMatch[1]) : 0;
  const education = [];
  const eduKeywords = ['Bachelor', 'Master', 'PhD', 'B.Tech', 'M.Tech', 'B.Sc', 'M.Sc', 'BCA', 'MCA', 'BE', 'ME'];
  text.split('\n').forEach((line) => {
    if (eduKeywords.some((kw) => line.includes(kw))) education.push(line.trim());
  });
  return { rawText: text.substring(0, 3000), skills, experience, education, projects: [], certifications: [] };
}


