const bertService = require('./bertService');
const vectorStore = require('../utils/vectorStore');
const logger = require('../utils/logger');

const SIMILARITY_WEIGHTS = {
  resumeJd: 0.35,
  answersJd: 0.25,
  skillsJd: 0.2,
  projectsJd: 0.1,
  overall: 0.1,
};

const semanticMatcher = {
  async computeResumeJDSimilarity(resumeText, jdText) {
    if (!resumeText || !jdText) {
      return { score: 0, similarity: 0, details: { error: 'Missing text' } };
    }
    try {
      const similarity = await bertService.getSimilarity(resumeText, jdText);
      const score = Math.round(Math.max(0, Math.min(1, similarity)) * 100);

      const resumeEmbedding = await bertService.getEmbedding(resumeText);
      const jdEmbedding = await bertService.getEmbedding(jdText);
      if (resumeEmbedding.length > 0 && jdEmbedding.length > 0) {
        await vectorStore.insert('resumes', `resume_${Date.now()}`, resumeEmbedding, { text: resumeText.substring(0, 200) });
        await vectorStore.insert('jobDescriptions', `jd_${Date.now()}`, jdEmbedding, { text: jdText.substring(0, 200) });
      }

      return { score, similarity, details: { resumeLength: resumeText.length, jdLength: jdText.length } };
    } catch (e) {
      logger.error('system', 'Resume-JD similarity computation failed', { error: e.message });
      return { score: 0, similarity: 0, details: { error: e.message } };
    }
  },

  async computeAnswersJDSimilarity(answers, jdText) {
    if (!answers || answers.length === 0 || !jdText) {
      return { score: 0, similarity: 0, details: { error: 'Missing answers or JD' } };
    }
    try {
      const answerText = answers.map((a) => a.text || '').join(' ');
      const similarity = await bertService.getSimilarity(answerText, jdText);
      const score = Math.round(Math.max(0, Math.min(1, similarity)) * 100);
      return { score, similarity, details: { answerCount: answers.length, totalLength: answerText.length } };
    } catch (e) {
      logger.error('system', 'Answers-JD similarity failed', { error: e.message });
      return { score: 0, similarity: 0, details: { error: e.message } };
    }
  },

  async computeSkillsJDSimilarity(skills, jdText) {
    if (!skills || skills.length === 0 || !jdText) {
      return { score: 0, similarity: 0, details: { error: 'Missing skills or JD' } };
    }
    try {
      const skillsText = skills.join(', ');
      const similarity = await bertService.getSimilarity(skillsText, jdText);
      const score = Math.round(Math.max(0, Math.min(1, similarity)) * 100);

      const keywordMatch = skills.filter((s) => jdText.toLowerCase().includes(s.toLowerCase())).length / skills.length;
      const combined = score * 0.6 + keywordMatch * 0.4 * 100;

      return {
        score: Math.round(combined),
        semanticSimilarity: score,
        keywordMatch: Math.round(keywordMatch * 100),
        details: { skillsCount: skills.length, matchedKeywords: Math.round(keywordMatch * skills.length) },
      };
    } catch (e) {
      logger.error('system', 'Skills-JD similarity failed', { error: e.message });
      return { score: 0, similarity: 0, details: { error: e.message } };
    }
  },

  async computeProjectsJDSimilarity(projects, jdText) {
    if (!projects || projects.length === 0 || !jdText) {
      return { score: 0, similarity: 0, details: { error: 'Missing projects or JD' } };
    }
    try {
      const projectText = projects.map((p) => `${p.title || ''} ${p.description || ''}`).join(' ');
      const similarity = await bertService.getSimilarity(projectText, jdText);
      const score = Math.round(Math.max(0, Math.min(1, similarity)) * 100);
      return { score, similarity, details: { projectCount: projects.length, totalLength: projectText.length } };
    } catch (e) {
      logger.error('system', 'Projects-JD similarity failed', { error: e.message });
      return { score: 0, similarity: 0, details: { error: e.message } };
    }
  },

  async computeOverallMatch(resumeData, jdText, answers) {
    const results = {};
    let totalWeighted = 0;
    let totalWeight = 0;

    const tasks = [];
    if (resumeData?.resumeText) {
      tasks.push(
        this.computeResumeJDSimilarity(resumeData.resumeText, jdText)
          .then((r) => { results.resumeJd = r; })
      );
    }
    if (answers?.length > 0 && jdText) {
      tasks.push(
        this.computeAnswersJDSimilarity(answers, jdText)
          .then((r) => { results.answersJd = r; })
      );
    }
    if (resumeData?.skills?.length > 0 && jdText) {
      tasks.push(
        this.computeSkillsJDSimilarity(resumeData.skills, jdText)
          .then((r) => { results.skillsJd = r; })
      );
    }
    if (resumeData?.projects?.length > 0 && jdText) {
      tasks.push(
        this.computeProjectsJDSimilarity(resumeData.projects, jdText)
          .then((r) => { results.projectsJd = r; })
      );
    }

    await Promise.all(tasks);

    for (const [key, weight] of Object.entries(SIMILARITY_WEIGHTS)) {
      if (results[key]) {
        totalWeighted += (results[key].score || 0) * weight;
        totalWeight += weight;
      }
    }

    const overallScore = totalWeight > 0 ? Math.round(totalWeighted / totalWeight) : 0;

    return {
      overall: overallScore,
      components: results,
      weights: SIMILARITY_WEIGHTS,
      details: {
        computedFrom: Object.keys(results),
        effectiveWeight: totalWeight,
      },
    };
  },

  async semanticSearch(query, collection = 'knowledgeBase', topK = 5) {
    try {
      const queryEmbedding = await bertService.getEmbedding(query);
      if (!queryEmbedding || queryEmbedding.length === 0) {
        return { results: [], error: 'Failed to generate query embedding' };
      }
      const results = await vectorStore.search(collection, queryEmbedding, topK);
      return { results, query: query.substring(0, 100) };
    } catch (e) {
      logger.error('system', 'Semantic search failed', { error: e.message });
      return { results: [], error: e.message };
    }
  },
};

module.exports = semanticMatcher;
