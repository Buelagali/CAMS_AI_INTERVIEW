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

const SKILL_ALIASES = {
  'javascript': ['js', 'ecmascript', 'es6', 'es2015', 'es2020'],
  'typescript': ['ts', 'typed javascript'],
  'python': ['python3', 'python 3'],
  'react': ['reactjs', 'react.js', 'react js'],
  'angular': ['angularjs', 'angular 2', 'angular 4'],
  'node.js': ['nodejs', 'node', 'node js'],
  'express': ['expressjs', 'express.js'],
  'docker': ['dockerize', 'containerization', 'container'],
  'kubernetes': ['k8s', 'kube'],
  'aws': ['amazon web services', 'ec2', 's3', 'lambda', 'cloudformation'],
  'azure': ['microsoft azure'],
  'gcp': ['google cloud', 'google cloud platform'],
  'sql': ['mysql', 'postgresql', 'postgres', 'oracle', 'sqlite', 'mariadb'],
  'nosql': ['mongodb', 'couchdb', 'cassandra', 'dynamodb', 'redis'],
  'machine learning': ['ml', 'predictive modeling', 'supervised learning', 'unsupervised learning'],
  'deep learning': ['dl', 'neural network', 'neural networks', 'cnn', 'rnn', 'lstm'],
  'nlp': ['natural language processing', 'text mining', 'language model'],
  'tensorflow': ['tf', 'tf2', 'tensor flow'],
  'pytorch': ['torch', 'py torch'],
  'scikit-learn': ['sklearn', 'scikit learn'],
  'terraform': ['infrastructure as code', 'iac'],
  'ci/cd': ['cicd', 'continuous integration', 'continuous deployment'],
  'rest': ['rest api', 'restful', 'restapis'],
  'graphql': ['gql', 'graph ql'],
};

export function extractSkills(text) {
  const skillKeywords = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'React', 'Angular', 'Vue',
    'Node.js', 'Express', 'Django', 'Flask', 'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Git', 'REST', 'GraphQL',
    'Machine Learning', 'Deep Learning', 'NLP', 'TensorFlow', 'PyTorch', 'scikit-learn',
    'HTML', 'CSS', 'Tailwind', 'Bootstrap', 'Redux', 'Next.js', 'TypeScript',
    'CI/CD', 'Jenkins', 'Terraform', 'Linux', 'Agile', 'Scrum',
  ];

  const lowerText = text.toLowerCase();
  const found = new Set();

  for (const skill of skillKeywords) {
    const lowerSkill = skill.toLowerCase();
    if (lowerText.includes(lowerSkill)) {
      found.add(skill);
      continue;
    }
    const aliases = SKILL_ALIASES[lowerSkill];
    if (aliases) {
      for (const alias of aliases) {
        if (lowerText.includes(alias)) {
          found.add(skill);
          break;
        }
      }
    }
  }

  return [...found];
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
