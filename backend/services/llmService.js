const { pipeline } = require('@xenova/transformers');
const { getEmbedding, getSimilarity } = require('./bertService');

let textGenPipeline = null;

async function getTextGenerator() {
  if (!textGenPipeline) {
    try {
      textGenPipeline = await pipeline('text-generation', 'Xenova/phi-3-mini-4k-instruct');
    } catch (err) {
      console.warn('Text generation model not available, using semantic fallback:', err.message);
      textGenPipeline = null;
    }
  }
  return textGenPipeline;
}

function generateStrengths(scores, answers) {
  const strengths = [];
  if (scores.technical >= 70) strengths.push('Demonstrates strong technical aptitude, with well-structured and accurate technical responses');
  if (scores.communication >= 70) strengths.push('Exhibits excellent communication skills with clear articulation of complex concepts');
  if (scores.confidence >= 70) strengths.push('Shows high confidence in delivery, maintaining composure across all question types');
  if (scores.semantic >= 70) strengths.push('Provides highly relevant answers that directly address each question with precision');
  if (scores.emotion >= 70) strengths.push('Maintains positive emotional demeanor throughout the interview, indicating strong emotional intelligence');
  if (scores.behavior >= 70) strengths.push('Demonstrates strong engagement and professional behavior consistently');
  if (answers.length >= 7) strengths.push('Completes all questions thoroughly with comprehensive responses');
  if (strengths.length === 0) strengths.push('Shows potential for growth and development in key areas');
  return strengths;
}

function generateWeaknesses(scores, answers) {
  const weaknesses = [];
  if (scores.technical < 55) weaknesses.push('Technical knowledge requires strengthening in core concepts and practical application');
  if (scores.communication < 55) weaknesses.push('Communication would benefit from more structured and organized delivery');
  if (scores.confidence < 55) weaknesses.push('Confidence level affects response quality; would benefit from more interview practice');
  if (scores.semantic < 55) weaknesses.push('Answers sometimes deviate from the question focus; needs to improve relevance');
  if (scores.emotion < 55) weaknesses.push('Shows visible signs of nervousness that may impact perceived competence');
  if (scores.behavior < 55) weaknesses.push('Engagement level fluctuates; maintaining consistent attention would improve performance');
  if (answers.length < 5) weaknesses.push('Responses tend to be brief; providing more detailed answers would strengthen the evaluation');
  if (weaknesses.length === 0) weaknesses.push('Minor refinements in specific areas could elevate an already solid performance');
  return weaknesses;
}

function getRecommendedSkills(role, scores, resumeSkills) {
  const skillMap = {
    'Software Developer': ['TypeScript', 'System Design', 'Docker', 'Kubernetes', 'CI/CD', 'Testing', 'GraphQL'],
    'AI/ML Engineer': ['MLOps', 'TensorFlow', 'PyTorch', 'Docker', 'Kubernetes', 'Computer Vision', 'NLP'],
    'Data Analyst': ['SQL', 'Python', 'Tableau', 'Power BI', 'Statistics', 'ETL', 'Data Modeling'],
    'Cloud Engineer': ['AWS/Azure/GCP', 'Kubernetes', 'Terraform', 'Jenkins', 'Docker', 'Microservices'],
    'Cyber Security Analyst': ['Penetration Testing', 'SIEM', 'Cryptography', 'Network Security', 'Incident Response', 'Cloud Security'],
  };

  const allSkills = skillMap[role] || ['Communication', 'Problem Solving', 'Teamwork', 'Technical Skills', 'Leadership'];

  const missingSkills = resumeSkills && resumeSkills.length > 0
    ? allSkills.filter((s) => !resumeSkills.some((rs) => rs.toLowerCase().includes(s.toLowerCase())))
    : allSkills;

  return missingSkills.sort(() => Math.random() - 0.5).slice(0, 3);
}

function generateImprovementPlan(scores, weaknesses) {
  const plan = [];
  if (scores.technical < 70) plan.push('Strengthen core technical concepts through structured learning and hands-on projects');
  if (scores.communication < 70) plan.push('Practice the STAR method (Situation, Task, Action, Result) for structured responses');
  if (scores.confidence < 70) plan.push('Participate in mock interviews to build confidence and reduce interview anxiety');
  if (scores.semantic < 70) plan.push('Practice active listening and note-taking to ensure answers directly address questions');
  if (scores.behavior < 70) plan.push('Maintain consistent eye contact and positive body language throughout interactions');
  if (weaknesses.length <= 1) plan.push('Continue building on existing strengths through advanced coursework');
  if (plan.length === 0) plan.push('Focus on continuous learning and staying updated with industry trends');
  return plan;
}

function generateSummary(name, scores, answers, role) {
  const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Math.max(Object.values(scores).length, 1);
  const answered = answers.length;
  const roleLabel = role || 'the target';

  if (avgScore >= 80) {
    return [
      `${name} delivered an outstanding interview performance, scoring ${Math.round(avgScore)}% overall. Demonstrated exceptional capability across ${answered} questions with particular depth in technical areas. Exhibits the qualities of a top-tier ${roleLabel} candidate.`,
      `${name} impressed with a stellar interview (${Math.round(avgScore)}%), combining technical depth with polished communication. Responses were comprehensive, well-structured, and demonstrated genuine expertise. Strongly recommended for advancement.`,
      `An exceptional performance from ${name} (${Math.round(avgScore)}%). The candidate showed mastery of required competencies and would be a valuable addition to any team. Ready for the next stage.`,
    ];
  } else if (avgScore >= 65) {
    return [
      `${name} performed well with an overall score of ${Math.round(avgScore)}%. Answered ${answered} questions with solid technical understanding. Targeted improvement in identified areas would strengthen an already promising profile.`,
      `${name} delivered a competent interview (${Math.round(avgScore)}%), showing good foundational knowledge and communication skills. With focused development in weaker areas, shows strong potential as a ${roleLabel}.`,
      `A solid performance from ${name} scoring ${Math.round(avgScore)}%. Demonstrated readiness for the role while having clear areas for growth. Recommended with a focus on the improvement plan outlined in this report.`,
    ];
  } else if (avgScore >= 50) {
    return [
      `${name} delivered an average performance scoring ${Math.round(avgScore)}%. While some answers showed promise, there is moderate room for improvement in technical depth and response quality. Consider a structured upskilling plan before re-interview.`,
      `${name} scored ${Math.round(avgScore)}% across ${answered} questions. Basic competency was demonstrated, but deeper understanding of key concepts needs development. A focused preparation plan is recommended.`,
      `Moderate performance from ${name} (${Math.round(avgScore)}%). Responses were mixed in quality. Targeted preparation in weak areas would significantly improve future interview outcomes.`,
    ];
  }
  return [
    `${name} scored ${Math.round(avgScore)}%, indicating significant gaps in preparation and knowledge relative to the ${roleLabel} role. Structured learning, mentorship, and mock interview practice are strongly recommended.`,
    `The interview performance by ${name} (${Math.round(avgScore)}%) suggests substantial preparation is needed. Focus on building core competencies and practicing structured interview responses before reapplying.`,
  ];
}

exports.generateFeedback = async ({ name, role, answers, scores, resumeData, unifiedFeatures }) => {
  const strengths = generateStrengths(scores, answers);
  const weaknesses = generateWeaknesses(scores, answers);
  const recommendedSkills = getRecommendedSkills(role, scores, resumeData?.skills || []);
  const improvementPlan = generateImprovementPlan(scores, weaknesses);

  const summaryTemplates = generateSummary(name, scores, answers, role);
  const summary = summaryTemplates[Math.floor(Math.random() * summaryTemplates.length)];

  const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
  const recommendation = avgScore >= 80 ? 'Strong Hire' : avgScore >= 65 ? 'Hire' : avgScore >= 50 ? 'Consider' : 'No Hire';

  let llmEnhanced = null;
  try {
    const generator = await getTextGenerator();
    if (generator) {
      const prompt = `<|user|>Generate a 2-sentence interview feedback summary for ${name}, a ${role} candidate. They scored ${Math.round(avgScore)}% overall. Their strengths include: ${strengths.slice(0, 2).join(', ')}. Areas to improve: ${weaknesses.slice(0, 2).join(', ')}. Recommendation: ${recommendation}.<|end|><|assistant|>`;
      const result = await generator(prompt, { max_new_tokens: 80, temperature: 0.7 });
      llmEnhanced = result[0]?.generated_text?.split('<|assistant|>')[1]?.trim() || null;
    }
  } catch (err) {
    console.warn('LLM generation skipped:', err.message);
  }

  return {
    strengths,
    weaknesses,
    recommendedSkills,
    improvementPlan,
    summary,
    recommendation,
    llmEnhanced,
    generatedAt: new Date().toISOString(),
    modalityWeights: unifiedFeatures?.attentionWeights || null,
  };
};

exports.semanticReasoning = async (text1, text2) => {
  try {
    const sim = await getSimilarity(text1, text2);
    const emb1 = await getEmbedding(text1);
    const emb2 = await getEmbedding(text2);

    const avgMagnitude = (mag(emb1) + mag(emb2)) / 2;
    return {
      similarity: sim,
      semanticDensity: avgMagnitude,
      isRelated: sim > 0.45,
      confidence: Math.min(1, sim * 0.8 + avgMagnitude * 0.2),
    };
  } catch {
    return { similarity: 0.5, semanticDensity: 0.5, isRelated: true, confidence: 0.5 };
  }
};

function mag(vec) {
  if (!vec || vec.length === 0) return 0.5;
  return Math.min(1, Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) / Math.sqrt(vec.length));
}
