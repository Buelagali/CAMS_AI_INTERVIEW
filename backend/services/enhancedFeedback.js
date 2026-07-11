const logger = require('../utils/logger');
const explainableAI = require('./explainableAIService');
const semanticMatcher = require('./semanticMatcher');
const vectorStore = require('../utils/vectorStore');

const LEARNING_RESOURCES = {
  javascript: ['MDN Web Docs', 'JavaScript.info', 'Eloquent JavaScript'],
  python: ['Python.org Docs', 'Real Python', 'Python Crash Course'],
  react: ['React Docs', 'Kent C. Dodds Blog', 'Epic React'],
  node: ['Node.js Docs', 'The Art of Node', 'Node.js Design Patterns'],
  docker: ['Docker Docs', 'Docker Deep Dive', 'Play with Docker'],
  kubernetes: ['K8s Docs', 'Kubernetes in Action', 'CKAD Prep'],
  sql: ['SQL Tutorial', 'Use the Index Luke', 'SQL Performance Explained'],
  aws: ['AWS Docs', 'A Cloud Guru', 'AWS Well-Architected'],
  systemDesign: ['System Design Interview', 'DDIA', 'High Scalability'],
  ml: ['Fast.ai', 'Hands-On ML', 'Deep Learning Specialization'],
  default: ['Official Documentation', 'MDN Web Docs', 'Stack Overflow'],
};

function getResourcesForSkill(skill) {
  const key = skill.toLowerCase().replace(/[\s-]/g, '');
  for (const [k, resources] of Object.entries(LEARNING_RESOURCES)) {
    if (key.includes(k)) return resources;
  }
  return LEARNING_RESOURCES.default;
}

function generateStrengths(scores, answerHistory) {
  const strengths = [];
  const dims = [
    { key: 'technical', label: 'Technical knowledge' },
    { key: 'communication', label: 'Communication' },
    { key: 'confidence', label: 'Confidence' },
    { key: 'behavior', label: 'Professional behavior' },
    { key: 'emotion', label: 'Emotional control' },
  ];
  for (const dim of dims) {
    if ((scores[dim.key] || 0) >= 70) {
      strengths.push({
        area: dim.label,
        score: scores[dim.key],
        detail: `Strong performance in ${dim.label.toLowerCase()} with score of ${Math.round(scores[dim.key])}%`,
      });
    }
  }
  if (answerHistory && answerHistory.length >= 5) {
    strengths.push({
      area: 'Consistency',
      score: 85,
      detail: `Provided ${answerHistory.length} well-structured answers throughout the interview`,
    });
  }
  return strengths;
}

function generateWeaknesses(scores, answerHistory) {
  const weaknesses = [];
  const dims = [
    { key: 'technical', label: 'Technical depth' },
    { key: 'communication', label: 'Communication clarity' },
    { key: 'confidence', label: 'Confidence' },
    { key: 'behavior', label: 'Professional behavior' },
    { key: 'emotion', label: 'Emotional management' },
  ];
  for (const dim of dims) {
    if ((scores[dim.key] || 100) < 60) {
      weaknesses.push({
        area: dim.label,
        score: scores[dim.key],
        detail: `Room for improvement in ${dim.label.toLowerCase()} (${Math.round(scores[dim.key])}%)`,
        suggestion: getSuggestionForDimension(dim.key, scores[dim.key]),
      });
    }
  }
  return weaknesses;
}

function getSuggestionForDimension(dim, score) {
  const suggestions = {
    technical: 'Practice with real-world projects and study system design patterns',
    communication: 'Practice structuring answers using STAR method (Situation, Task, Action, Result)',
    confidence: 'Record yourself answering questions and review for improvement',
    behavior: 'Maintain consistent eye contact and positive body language',
    emotion: 'Practice mindfulness techniques to maintain composure under pressure',
  };
  return suggestions[dim] || 'Focus on continuous improvement through practice';
}

function generateImprovementPlan(weaknesses, role) {
  const plans = weaknesses.map((w) => ({
    area: w.area,
    score: w.score,
    plan: [
      `Dedicate 30 minutes daily to improving ${w.area.toLowerCase()}`,
      w.suggestion,
      `Seek feedback from mentors on ${w.area.toLowerCase()}`,
    ],
    resources: getResourcesForSkill(w.area),
  }));
  return plans;
}

function generateExpectedAnswer(question, role, difficulty) {
  const templates = {
    technical: `A strong answer should demonstrate understanding of core concepts, provide specific examples, and show practical experience. For ${role}, focus on real-world applications and best practices.`,
    behavioral: `Use the STAR method: describe the Situation, Task, Action, and Result. Quantify achievements where possible and highlight collaboration.`,
    hr: `Align your answer with the company's values and the role requirements. Show enthusiasm and cultural fit while being honest about your experience.`,
  };
  return templates[question?.type] || templates.technical;
}

function generateInterviewTips(scores, role) {
  const tips = [];
  const weakest = Object.entries(scores)
    .filter(([k]) => ['technical', 'communication', 'confidence', 'behavior', 'emotion'].includes(k))
    .sort((a, b) => a[1] - b[1])[0];

  if (weakest) {
    tips.push(`Focus on improving your ${weakest[0]} skills - this had the lowest score (${Math.round(weakest[1])}%)`);
  }
  tips.push(`For ${role} roles, emphasize practical experience and problem-solving approaches`);
  tips.push('Prepare 2-3 specific examples of past projects or challenges');
  tips.push('Research the company and role thoroughly before the interview');
  tips.push('Practice answering within 2-3 minutes per question');

  return tips;
}

function computeLearningResources(scores, answerHistory, role) {
  const resources = [];
  const weakAreas = Object.entries(scores)
    .filter(([k, v]) => v < 65 && ['technical', 'communication', 'confidence', 'behavior', 'emotion'].includes(k))
    .map(([k]) => k);

  for (const area of weakAreas) {
    const skillResources = getResourcesForSkill(area);
    resources.push({
      area,
      resources: skillResources.map((r) => ({ title: r, type: 'documentation', relevance: 'high' })),
    });
  }

  const roleResources = getResourcesForSkill(role);
  resources.push({
    area: role,
    resources: roleResources.map((r) => ({ title: r, type: 'documentation', relevance: 'medium' })),
  });

  return resources;
}

const enhancedFeedback = {
  async generateEnhancedFeedback(scores, answerHistory, metadata = {}) {
    const { name = 'Candidate', role = 'Software Developer', question, difficulty } = metadata;

    const strengths = generateStrengths(scores, answerHistory);
    const weaknesses = generateWeaknesses(scores, answerHistory);
    const improvementPlan = generateImprovementPlan(weaknesses, role);
    const learningResources = computeLearningResources(scores, answerHistory, role);
    const expectedAnswer = generateExpectedAnswer(question, role, difficulty);
    const interviewTips = generateInterviewTips(scores, role);

    let semanticAnalysis = null;
    try {
      if (metadata.jdText) {
        const answers = (answerHistory || []).map((a) => ({ text: a.answer || '' }));
        semanticAnalysis = await semanticMatcher.computeOverallMatch(
          { skills: metadata.skills || [], projects: metadata.projects || [], resumeText: metadata.resumeText },
          metadata.jdText,
          answers
        );
      }
    } catch (e) {
      logger.warn('system', 'Semantic analysis not available for feedback', { error: e.message });
    }

    const report = explainableAI.generateFullReport(scores, metadata);

    return {
      candidate: { name, role },
      scores,
      explainableReport: report,
      strengths,
      weaknesses,
      improvementPlan,
      learningResources,
      expectedAnswer,
      interviewTips,
      semanticAnalysis,
      generatedAt: new Date().toISOString(),
    };
  },

  getLearningResources(skill) {
    return getResourcesForSkill(skill);
  },
};

module.exports = enhancedFeedback;
