export function parseResumeText(text) {
  const skills = extractSkills(text);
  const projects = extractProjects(text);
  const education = extractEducation(text);
  const certifications = extractCertifications(text);
  const experience = extractExperience(text);

  return {
    rawText: text.substring(0, 5000),
    name: extractName(text),
    email: extractEmail(text),
    skills,
    projects,
    education,
    certifications,
    experience,
  };
}

export function extractName(text) {
  const lines = text.split('\n').filter((l) => l.trim());
  return lines[0] || 'Unknown';
}

export function extractEmail(text) {
  const match = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  return match ? match[0] : '';
}

export function extractSkills(text) {
  const skillKeywords = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'React', 'Angular', 'Vue',
    'Node.js', 'Express', 'Django', 'Flask', 'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Git', 'REST', 'GraphQL',
    'Machine Learning', 'Deep Learning', 'NLP', 'TensorFlow', 'PyTorch', 'scikit-learn',
    'HTML', 'CSS', 'Tailwind', 'Bootstrap', 'Redux', 'Next.js', 'TypeScript',
    'CI/CD', 'Jenkins', 'Terraform', 'Linux', 'Agile', 'Scrum',
  ];
  return skillKeywords.filter((skill) =>
    text.toLowerCase().includes(skill.toLowerCase())
  );
}

export function extractProjects(text) {
  const projects = [];
  const lines = text.split('\n');
  let currentProject = null;
  for (const line of lines) {
    if (/project/i.test(line) && line.length < 100) {
      if (currentProject) projects.push(currentProject);
      currentProject = { name: line.trim(), description: '' };
    } else if (currentProject) {
      currentProject.description += line.trim() + ' ';
    }
  }
  if (currentProject) projects.push(currentProject);
  return projects.slice(0, 5);
}

export function extractEducation(text) {
  const education = [];
  const eduKeywords = ['Bachelor', 'Master', 'PhD', 'B.Tech', 'M.Tech', 'B.Sc', 'M.Sc', 'BCA', 'MCA', 'BE', 'ME'];
  const lines = text.split('\n');
  for (const line of lines) {
    if (eduKeywords.some((kw) => line.includes(kw))) {
      education.push(line.trim());
    }
  }
  return education;
}

export function extractCertifications(text) {
  const certs = [];
  const certKeywords = ['certified', 'certification', 'certificate', 'AWS Certified', 'Google', 'Microsoft'];
  const lines = text.split('\n');
  for (const line of lines) {
    if (certKeywords.some((kw) => line.toLowerCase().includes(kw.toLowerCase()))) {
      certs.push(line.trim());
    }
  }
  return certs;
}

export function extractExperience(text) {
  const expMatch = text.match(/(\d+)\+?\s*years?/i);
  return expMatch ? parseInt(expMatch[1]) : 0;
}
