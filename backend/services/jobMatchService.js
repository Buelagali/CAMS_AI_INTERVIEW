const roleRequirements = {
  'Software Developer': {
    skills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'Python', 'Git', 'REST', 'SQL', 'Docker', 'AWS'],
    minExperience: 1,
  },
  'AI/ML Engineer': {
    skills: ['Python', 'Machine Learning', 'Deep Learning', 'NLP', 'TensorFlow', 'PyTorch', 'scikit-learn', 'SQL', 'Statistics', 'Docker'],
    minExperience: 2,
  },
  'Data Analyst': {
    skills: ['SQL', 'Python', 'Excel', 'Tableau', 'Power BI', 'Statistics', 'R', 'Data Visualization', 'ETL', 'MongoDB'],
    minExperience: 1,
  },
  'Cloud Engineer': {
    skills: ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'Linux', 'CI/CD', 'Python'],
    minExperience: 2,
  },
  'Cyber Security Analyst': {
    skills: ['Network Security', 'Cryptography', 'Penetration Testing', 'SIEM', 'Linux', 'Python', 'Firewall', 'Incident Response', 'Risk Assessment', 'Compliance'],
    minExperience: 2,
  },
};

exports.matchResumeToJob = async (resumeData, role) => {
  const requirements = roleRequirements[role];
  if (!requirements) {
    return { matchScore: 0, matchedSkills: [], missingSkills: [], matchDetails: 'Role not found' };
  }

  const candidateSkills = resumeData.skills || [];
  const candidateExperience = resumeData.experience || 0;

  const matchedSkills = requirements.skills.filter((skill) =>
    candidateSkills.some((cs) => cs.toLowerCase().includes(skill.toLowerCase()))
  );
  const missingSkills = requirements.skills.filter(
    (skill) => !candidateSkills.some((cs) => cs.toLowerCase().includes(skill.toLowerCase()))
  );

  const skillScore = matchedSkills.length / requirements.skills.length;
  const experienceScore = Math.min(1, candidateExperience / requirements.minExperience);
  const projectScore = Math.min(1, (resumeData.projects?.length || 0) / 3);
  const educationScore = (resumeData.education?.length || 0) > 0 ? 1 : 0.3;

  const matchScore = Math.round(
    (skillScore * 0.45 + experienceScore * 0.25 + projectScore * 0.2 + educationScore * 0.1) * 100
  );

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
};
