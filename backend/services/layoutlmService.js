const { pipeline } = require('@xenova/transformers');

let documentPipeline = null;

async function getDocumentPipeline() {
  if (!documentPipeline) {
    try {
      documentPipeline = await pipeline('document-question-answering', 'Xenova/layoutlm-document-qa');
    } catch (err) {
      console.warn('LayoutLM document QA not available:', err.message);
      documentPipeline = null;
    }
  }
  return documentPipeline;
}

exports.extractResumeFields = async (text) => {
  if (!text || text.length < 20) {
    return { skills: [], education: [], experience: 0, projects: [], certifications: [], name: '', email: '' };
  }

  const lines = text.split('\n').filter((l) => l.trim());

  const name = extractName(text);
  const email = extractEmail(text);
  const phone = extractPhone(text);
  const skills = extractSkills(text);
  const education = extractEducation(text, lines);
  const experience = extractExperience(text);
  const projects = extractProjects(text, lines);
  const certifications = extractCertifications(text, lines);

  return {
    rawText: text.substring(0, 5000),
    name,
    email,
    phone,
    skills,
    education,
    experience,
    projects,
    certifications,
  };
};

async function analyzeWithLayoutLM(imageBuffer) {
  try {
    const pipe = await getDocumentPipeline();
    if (!pipe) return null;

    const questions = [
      'What is the candidate name?',
      'What skills does this person have?',
      'What is the education background?',
      'How many years of experience?',
    ];

    const results = {};
    for (const question of questions) {
      const answer = await pipe(imageBuffer, question);
      if (answer && answer.length > 0) {
        results[question] = answer[0].answer;
      }
    }
    return results;
  } catch {
    return null;
  }
}

function extractName(text) {
  const lines = text.split('\n').filter((l) => l.trim());
  return lines[0] || 'Unknown';
}

function extractEmail(text) {
  const match = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  return match ? match[0] : '';
}

function extractPhone(text) {
  const match = text.match(/[\+]?[\d\s\-\(\)]{7,20}/);
  return match ? match[0].trim() : '';
}

function extractSkills(text) {
  const skillKeywords = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'React', 'Angular', 'Vue',
    'Node.js', 'Express', 'Django', 'Flask', 'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Git', 'REST', 'GraphQL',
    'Machine Learning', 'Deep Learning', 'NLP', 'TensorFlow', 'PyTorch', 'scikit-learn',
    'HTML', 'CSS', 'Tailwind', 'Bootstrap', 'Redux', 'Next.js',
    'CI/CD', 'Jenkins', 'Terraform', 'Linux', 'Agile', 'Scrum',
    'Microservices', 'System Design', 'Data Analysis', 'Data Visualization',
    'Statistics', 'ETL', 'Tableau', 'Power BI', 'R', 'Excel',
    'Network Security', 'Cryptography', 'Penetration Testing', 'SIEM',
    'Incident Response', 'Firewall', 'Compliance', 'Risk Assessment',
    'Cloud Security', 'Forensics', 'MLOps', 'Computer Vision', 'LLMs',
  ];
  return skillKeywords.filter((skill) => text.toLowerCase().includes(skill.toLowerCase()));
}

function extractEducation(text, lines) {
  const education = [];
  const eduPatterns = [
    /(bachelor|master|phd|doctorate|b\.?tech|m\.?tech|b\.?sc|m\.?sc|bca|mca|b\.?e|m\.?e)[^,.]*/gi,
    /(university|college|institute)[^,.]*/gi,
  ];

  for (const line of lines) {
    for (const pattern of eduPatterns) {
      const match = line.match(pattern);
      if (match) {
        const clean = match[0].trim();
        if (!education.some((e) => e.includes(clean.substring(0, 15)))) {
          education.push(clean);
        }
      }
    }
  }

  return [...new Set(education)].slice(0, 5);
}

function extractExperience(text) {
  const patterns = [
    /(\d+)\+?\s*years?(?:\s*of)?\s*(?:experience|exp)/i,
    /experience\s*(?:of|:)?\s*(\d+)\+?\s*years?/i,
    /(\d+)\+?\s*yr(?:\s*\.)?s?(?:\s*of)?\s*(?:experience|exp)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseInt(match[1]);
  }

  return 0;
}

function extractProjects(text, lines) {
  const projects = [];
  let currentProject = null;

  for (const line of lines) {
    if (/project/i.test(line) && line.length < 100) {
      if (currentProject) projects.push(currentProject);
      currentProject = { name: line.trim(), description: '' };
    } else if (currentProject && line.trim()) {
      currentProject.description += line.trim() + ' ';
    }
  }

  if (currentProject) projects.push(currentProject);
  return projects.slice(0, 5);
}

function extractCertifications(text, lines) {
  const certs = [];
  const certKeywords = [
    'certified', 'certification', 'certificate',
    'AWS Certified', 'Google Cloud Certified', 'Microsoft Certified',
    'CISSP', 'CISM', 'CEH', 'CompTIA', 'PMP', 'ITIL', 'TOGAF',
  ];

  for (const line of lines) {
    const matched = certKeywords.some((kw) =>
      line.toLowerCase().includes(kw.toLowerCase())
    );
    if (matched && !certs.some((c) => c.includes(line.substring(0, 20)))) {
      certs.push(line.trim());
    }
  }

  return certs.slice(0, 5);
}
