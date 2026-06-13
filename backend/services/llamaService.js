function generateStrengths(answers, scores) {
  const strengths = [];
  if (scores.technical >= 70) strengths.push('Strong technical knowledge');
  if (scores.communication >= 70) strengths.push('Excellent communication skills');
  if (scores.confidence >= 70) strengths.push('High confidence in responses');
  if (scores.semantic >= 70) strengths.push('Provides relevant and on-topic answers');
  if (scores.emotion >= 70) strengths.push('Positive emotional demeanor');
  if (answers.length >= 7) strengths.push('Answered all questions thoroughly');
  if (strengths.length === 0) strengths.push('Shows potential for growth');
  return strengths;
}

function generateWeaknesses(answers, scores) {
  const weaknesses = [];
  if (scores.technical < 50) weaknesses.push('Needs improvement in technical knowledge');
  if (scores.communication < 50) weaknesses.push('Communication skills need development');
  if (scores.confidence < 50) weaknesses.push('Lacks confidence in responses');
  if (scores.semantic < 50) weaknesses.push('Answers lack relevance to questions');
  if (scores.emotion < 50) weaknesses.push('Shows signs of nervousness or stress');
  if (answers.length < 5) weaknesses.push('Incomplete answers - needs to elaborate more');
  if (weaknesses.length === 0) weaknesses.push('Minor areas for refinement identified');
  return weaknesses;
}

function getRecommendedSkills(role) {
  const skillMap = {
    'Software Developer': ['TypeScript', 'System Design', 'Docker', 'CI/CD', 'Testing'],
    'AI/ML Engineer': ['MLOps', 'TensorFlow', 'PyTorch', 'Docker', 'Kubernetes'],
    'Data Analyst': ['SQL', 'Python', 'Tableau', 'Power BI', 'Statistics'],
    'Cloud Engineer': ['AWS/Azure/GCP', 'Kubernetes', 'Terraform', 'Jenkins', 'Docker'],
    'Cyber Security Analyst': ['Penetration Testing', 'SIEM', 'Cryptography', 'Network Security', 'Incident Response'],
  };
  return skillMap[role] || ['Communication', 'Problem Solving', 'Teamwork', 'Technical Skills'];
}

function generateImprovementAreas(scores, weaknesses) {
  const areas = [];
  if (scores.technical < 70) areas.push('Focus on strengthening core technical concepts');
  if (scores.communication < 70) areas.push('Practice structuring answers clearly');
  if (scores.confidence < 70) areas.push('Work on confident delivery through mock interviews');
  if (scores.semantic < 70) areas.push('Ensure answers directly address the question asked');
  if (weaknesses.length > 1) areas.push('Review feedback regularly and track improvement');
  if (areas.length === 0) areas.push('Continue building on your existing strengths');
  return areas;
}

function generateSummary(answers, scores, name) {
  const totalAnswered = answers.length;
  const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Math.max(Object.values(scores).length, 1);
  if (avgScore >= 75) {
    return `${name} performed excellently in the interview. ` +
      `Demonstrated strong capabilities across ${totalAnswered} questions. ` +
      'Highly recommended for the next round.';
  } else if (avgScore >= 55) {
    return `${name} performed reasonably well. ` +
      `Answered ${totalAnswered} questions with moderate proficiency. ` +
      'Shows potential but needs improvement in certain areas.';
  }
  return `${name} needs significant improvement. ` +
    `Answered ${totalAnswered} questions but performance was below expectations. ` +
    'Recommended for upskilling before next interview.';
}

function generateHiringRecommendation(scores) {
  const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Math.max(Object.values(scores).length, 1);
  if (avgScore >= 80) return 'Strong Hire';
  if (avgScore >= 65) return 'Hire';
  if (avgScore >= 50) return 'Consider';
  return 'No Hire';
}

exports.generateAIFeedback = async ({ name, role, answers, scores, resumeData }) => {
  const strengths = generateStrengths(answers, scores);
  const weaknesses = generateWeaknesses(answers, scores);
  const recommendedSkills = getRecommendedSkills(role);
  const improvementAreas = generateImprovementAreas(scores, weaknesses);
  const summary = generateSummary(answers, scores, name);
  const recommendation = generateHiringRecommendation(scores);

  return {
    strengths,
    weaknesses,
    recommendedSkills,
    improvementAreas,
    summary,
    recommendation,
    generatedAt: new Date().toISOString(),
  };
};
