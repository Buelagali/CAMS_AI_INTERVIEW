const skillKnowledgeGraph = {
  'Software Developer': {
    core: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Git'],
    advanced: ['System Design', 'Docker', 'Kubernetes', 'CI/CD'],
    projects: ['Web Application', 'API', 'Database', 'Frontend', 'Backend'],
  },
  'AI/ML Engineer': {
    core: ['Python', 'Machine Learning', 'Deep Learning', 'NLP', 'Statistics'],
    advanced: ['TensorFlow', 'PyTorch', 'MLOps', 'Computer Vision'],
    projects: ['Model Deployment', 'Data Pipeline', 'ML API', 'Research'],
  },
  'Data Analyst': {
    core: ['SQL', 'Python', 'Excel', 'Statistics', 'Data Visualization'],
    advanced: ['Tableau', 'Power BI', 'ETL', 'R'],
    projects: ['Dashboard', 'Data Pipeline', 'Report', 'Analysis'],
  },
  'Cloud Engineer': {
    core: ['AWS', 'Docker', 'Linux', 'CI/CD', 'Networking'],
    advanced: ['Kubernetes', 'Terraform', 'Jenkins', 'Microservices'],
    projects: ['Migration', 'Infrastructure', 'Deployment', 'Monitoring'],
  },
  'Cyber Security Analyst': {
    core: ['Network Security', 'Linux', 'Python', 'Cryptography', 'Firewall'],
    advanced: ['Penetration Testing', 'SIEM', 'Incident Response', 'Forensics'],
    projects: ['Security Audit', 'Risk Assessment', 'Incident Report', 'Compliance'],
  },
};

exports.getSkillGraphScore = (candidateSkills, role) => {
  const graph = skillKnowledgeGraph[role];
  if (!graph) return 50;

  const allRequiredSkills = [...graph.core, ...graph.advanced];
  if (allRequiredSkills.length === 0) return 50;

  const matchedSkills = allRequiredSkills.filter((required) =>
    candidateSkills.some((cs) => cs.toLowerCase().includes(required.toLowerCase()))
  );

  const coreMatched = graph.core.filter((s) =>
    candidateSkills.some((cs) => cs.toLowerCase().includes(s.toLowerCase()))
  );
  const advancedMatched = graph.advanced.filter((s) =>
    candidateSkills.some((cs) => cs.toLowerCase().includes(s.toLowerCase()))
  );

  const coreWeight = 0.6;
  const advancedWeight = 0.4;

  const coreScore = graph.core.length > 0 ? coreMatched.length / graph.core.length : 0;
  const advancedScore = graph.advanced.length > 0 ? advancedMatched.length / graph.advanced.length : 0;

  const finalScore = (coreScore * coreWeight + advancedScore * advancedWeight) * 100;

  return Math.round(Math.min(100, Math.max(0, finalScore)));
};
