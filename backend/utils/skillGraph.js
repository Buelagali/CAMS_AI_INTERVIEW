const { getSimilarity } = require('../services/bertService');

const skillKnowledgeGraph = {
  'Software Developer': {
    core: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Git', 'REST APIs', 'SQL'],
    advanced: ['System Design', 'Docker', 'Kubernetes', 'CI/CD', 'Microservices', 'GraphQL'],
    projects: ['Web Application', 'API', 'Database', 'Frontend', 'Backend'],
  },
  'AI/ML Engineer': {
    core: ['Python', 'Machine Learning', 'Deep Learning', 'NLP', 'Statistics', 'SQL'],
    advanced: ['TensorFlow', 'PyTorch', 'MLOps', 'Computer Vision', 'Transformers', 'LLMs'],
    projects: ['Model Deployment', 'Data Pipeline', 'ML API', 'Research'],
  },
  'Data Analyst': {
    core: ['SQL', 'Python', 'Excel', 'Statistics', 'Data Visualization', 'Critical Thinking'],
    advanced: ['Tableau', 'Power BI', 'ETL', 'R', 'Data Modeling', 'A/B Testing'],
    projects: ['Dashboard', 'Data Pipeline', 'Report', 'Analysis'],
  },
  'Cloud Engineer': {
    core: ['AWS', 'Azure', 'Docker', 'Linux', 'CI/CD', 'Networking', 'Security'],
    advanced: ['Kubernetes', 'Terraform', 'Jenkins', 'Microservices', 'Serverless', 'Monitoring'],
    projects: ['Migration', 'Infrastructure', 'Deployment', 'Monitoring'],
  },
  'Cyber Security Analyst': {
    core: ['Network Security', 'Linux', 'Cryptography', 'Firewall', 'Risk Assessment', 'SIEM'],
    advanced: ['Penetration Testing', 'Incident Response', 'Forensics', 'Cloud Security', 'Compliance'],
    projects: ['Security Audit', 'Risk Assessment', 'Incident Report', 'Compliance'],
  },
};

const skillRelationships = {
  prerequisite: {
    'Docker': ['Linux'],
    'Kubernetes': ['Docker'],
    'TensorFlow': ['Python', 'Machine Learning'],
    'PyTorch': ['Python', 'Deep Learning'],
    'React': ['JavaScript', 'HTML', 'CSS'],
    'System Design': ['REST APIs', 'Microservices'],
    'MLOps': ['Docker', 'Python', 'Machine Learning'],
    'Terraform': ['Linux', 'Cloud basics'],
    'Tableau': ['SQL', 'Data Visualization'],
    'SIEM': ['Network Security', 'Linux'],
  },
  complementary: [
    ['TypeScript', 'React'],
    ['Docker', 'CI/CD'],
    ['TensorFlow', 'PyTorch'],
    ['AWS', 'Terraform'],
    ['SQL', 'Python'],
  ],
};

exports.getSkillGraphScore = (candidateSkills, role) => {
  const graph = skillKnowledgeGraph[role];
  if (!graph) return 50;

  const allRequiredSkills = [...graph.core, ...graph.advanced];
  if (allRequiredSkills.length === 0) return 50;

  const matchedSkills = allRequiredSkills.filter((required) =>
    candidateSkills.some((cs) => cs.toLowerCase().includes(required.toLowerCase()))
  );
  const missingSkills = allRequiredSkills.filter(
    (required) => !candidateSkills.some((cs) => cs.toLowerCase().includes(required.toLowerCase()))
  );

  const coreMatched = graph.core.filter((s) =>
    candidateSkills.some((cs) => cs.toLowerCase().includes(s.toLowerCase()))
  );
  const advancedMatched = graph.advanced.filter((s) =>
    candidateSkills.some((cs) => cs.toLowerCase().includes(s.toLowerCase()))
  );

  const coreWeight = 0.5;
  const advancedWeight = 0.3;
  const prerequisiteWeight = 0.2;

  const coreScore = graph.core.length > 0 ? coreMatched.length / graph.core.length : 0;
  const advancedScore = graph.advanced.length > 0 ? advancedMatched.length / graph.advanced.length : 0;

  let prereqScore = 0;
  let prereqCount = 0;
  for (const [skill, prereqs] of Object.entries(skillRelationships.prerequisite)) {
    if (candidateSkills.some((cs) => cs.toLowerCase().includes(skill.toLowerCase()))) {
      const prereqMet = prereqs.filter((p) =>
        candidateSkills.some((cs) => cs.toLowerCase().includes(p.toLowerCase()))
      ).length;
      prereqScore += prereqMet / prereqs.length;
      prereqCount++;
    }
  }
  prereqScore = prereqCount > 0 ? prereqScore / prereqCount : 0.5;

  const finalScore = (coreScore * coreWeight + advancedScore * advancedWeight + prereqScore * prerequisiteWeight) * 100;

  return {
    score: Math.round(Math.min(100, Math.max(0, finalScore))),
    matchedSkills,
    missingSkills,
    coreScore: coreScore * 100,
    advancedScore: advancedScore * 100,
    prereqScore: prereqScore * 100,
    skillGap: missingSkills.slice(0, 5),
  };
};

exports.getSkillRecommendations = (candidateSkills, role) => {
  const graph = skillKnowledgeGraph[role];
  if (!graph) return { nextSkills: [], learningPath: [] };

  const allAdvanced = graph.advanced;
  const matchedAdvanced = allAdvanced.filter((s) =>
    candidateSkills.some((cs) => cs.toLowerCase().includes(s.toLowerCase()))
  );
  const nextSkills = allAdvanced.filter((s) =>
    !candidateSkills.some((cs) => cs.toLowerCase().includes(s.toLowerCase()))
  );

  const learningPath = nextSkills.slice(0, 3).map((skill) => {
    const prereqs = skillRelationships.prerequisite[skill] || [];
    const missingPrereqs = prereqs.filter((p) =>
      !candidateSkills.some((cs) => cs.toLowerCase().includes(p.toLowerCase()))
    );
    return {
      skill,
      prerequisites: missingPrereqs,
      estimatedEffort: missingPrereqs.length > 0 ? 'advanced' : 'intermediate',
    };
  });

  return { nextSkills: nextSkills.slice(0, 5), learningPath };
};

exports.computeSkillSimilarity = async (candidateSkills, role) => {
  const graph = skillKnowledgeGraph[role];
  if (!graph) return 0.5;

  const allRequired = [...graph.core, ...graph.advanced];
  const keywordMatch = allRequired.filter((required) =>
    candidateSkills.some((cs) => cs.toLowerCase().includes(required.toLowerCase()))
  ).length / allRequired.length;

  let semanticScore = 0;
  try {
    if (candidateSkills.length > 0 && allRequired.length > 0) {
      const candidateText = candidateSkills.join(', ');
      const requiredText = allRequired.join(', ');
      semanticScore = await getSimilarity(candidateText, requiredText);
      if (typeof semanticScore === 'number' && !isNaN(semanticScore)) {
        semanticScore = Math.max(0, Math.min(1, semanticScore));
      } else {
        semanticScore = 0;
      }
    }
  } catch {
    semanticScore = 0;
  }

  return keywordMatch * 0.5 + semanticScore * 0.5;
};
