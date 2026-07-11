const { describe, it, before } = require('node:test');
const assert = require('node:assert');

let calculateScore;

before(async () => {
  calculateScore = (await require('../services/scoringService')).calculateScore;
});

describe('scoringService', () => {
  const mockAnswer = (text, type = 'technical', score = 70, skill = null) => ({
    question: 'test question',
    answer: text,
    questionType: type,
    questionId: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    difficulty: 1,
    skill,
    semanticScore: score,
    confidenceScore: 65,
    emotionData: null,
    timestamp: new Date(),
  });

  it('should return valid score structure', () => {
    const result = calculateScore({
      answers: [mockAnswer('I have strong experience with React and Node.js')],
      resumeMatch: 80,
      skillGraph: 75,
    });

    assert.ok(result, 'result should exist');
    assert.ok(typeof result.overall === 'number', 'overall should be number');
    assert.ok(result.overall >= 0 && result.overall <= 100, 'overall should be 0-100');
    assert.ok(result.technical >= 0 && result.technical <= 100, 'technical 0-100');
    assert.ok(result.communication >= 0 && result.communication <= 100, 'communication 0-100');
    assert.ok(result.confidence >= 0 && result.confidence <= 100, 'confidence 0-100');
    assert.ok(result.behavior >= 0 && result.behavior <= 100, 'behavior 0-100');
    assert.ok(result.emotion >= 0 && result.emotion <= 100, 'emotion 0-100');
    assert.ok(result.semantic >= 0 && result.semantic <= 100, 'semantic 0-100');
    assert.ok(result.resumeMatch >= 0 && result.resumeMatch <= 100, 'resumeMatch 0-100');
    assert.ok(result.skillGraph >= 0 && result.skillGraph <= 100, 'skillGraph 0-100');
    assert.ok(Array.isArray(result.evidence.dimensionScores) || result.evidence, 'should have evidence');
    assert.ok(result.overall > 0, 'overall with evidence should be > 0');
  });

  it('should score higher for well-structured answers', () => {
    const weak = calculateScore({
      answers: [mockAnswer('yes')],
      resumeMatch: 0,
      skillGraph: 0,
    });
    const strong = calculateScore({
      answers: [mockAnswer('I have developed a full-stack application using React for the frontend and Node.js for the backend. The project involved implementing authentication, database design, and deployment to AWS.')],
      resumeMatch: 0,
      skillGraph: 0,
    });
    assert.ok(strong.communication > weak.communication, 'structured answer should get higher communication');
  });

  it('should not contain NaN or Infinity in any score', () => {
    const result = calculateScore({
      answers: [mockAnswer('test', 'technical', 50)],
      resumeMatch: 50,
      skillGraph: 50,
    });
    for (const [key, val] of Object.entries(result)) {
      if (typeof val === 'number') {
        assert.ok(!isNaN(val), `${key} should not be NaN`);
        assert.ok(isFinite(val), `${key} should not be Infinity`);
      }
    }
  });

  it('should produce deterministic results for same input', () => {
    const answers = [
      mockAnswer('First answer about technology'),
      mockAnswer('Second answer about programming', 'behavioral'),
    ];
    const input = { answers, resumeMatch: 70, skillGraph: 65 };
    const r1 = calculateScore(input);
    const r2 = calculateScore(input);
    assert.deepStrictEqual(r1, r2, 'results should be identical for same input');
  });

  it('should scale with multiple answers', () => {
    const one = calculateScore({
      answers: [mockAnswer('Single answer test', 'technical', 60)],
      resumeMatch: 50,
      skillGraph: 50,
    });
    const multiple = calculateScore({
      answers: [
        mockAnswer('First answer about coding', 'technical', 80),
        mockAnswer('Second behavioral answer', 'behavioral', 75),
        mockAnswer('Third technical answer', 'technical', 85),
      ],
      resumeMatch: 50,
      skillGraph: 50,
    });
    assert.ok(multiple.technical >= one.technical, 'more high-quality answers should not decrease technical score');
  });

  it('should handle empty answers gracefully', () => {
    const result = calculateScore({
      answers: [],
      resumeMatch: 0,
      skillGraph: 0,
    });
    assert.ok(result.overall >= 0, 'empty answers should yield valid overall');
    assert.ok(result.technical === 0, 'no technical answers should yield 0 technical');
    assert.ok(result.semantic === 0, 'no answers should yield 0 semantic');
  });

  it('should detect filler words and reduce communication score', () => {
    const rambling = calculateScore({
      answers: [mockAnswer('um like basically you know um actually like basically um you know')],
      resumeMatch: 30,
      skillGraph: 30,
    });
    const clear = calculateScore({
      answers: [mockAnswer('The system processes data through three stages: input validation, transformation, and output generation.')],
      resumeMatch: 30,
      skillGraph: 30,
    });
    assert.ok(clear.communication >= rambling.communication, 'clear answer should not have lower communication');
  });

  it('should return adaptiveMetrics with scoreProgression', () => {
    const result = calculateScore({
      answers: [mockAnswer('Test answer', 'technical', 70)],
      resumeMatch: 50,
      skillGraph: 50,
    });
    assert.ok(result.adaptiveMetrics, 'should have adaptiveMetrics');
    assert.ok(Array.isArray(result.adaptiveMetrics.scoreProgression), 'should have scoreProgression');
    assert.equal(result.adaptiveMetrics.scoreProgression.length, 1);
  });

  it('should respect unified features when provided', () => {
    const result = calculateScore({
      answers: [mockAnswer('Test answer', 'technical', 70)],
      resumeMatch: 50,
      skillGraph: 50,
      unified: {
        technicalBoost: 0.8,
        behaviorScore: 0.8,
        emotionScore: 0.85,
        engagementScore: 0.75,
        audioScore: 0.7,
        signalStrength: 0.8,
        qualityScores: [0.5, 0.3],
        attentionWeights: [0.25, 0.25, 0.25, 0.25],
        modalityNames: ['answers', 'audio', 'emotions', 'vision'],
      },
    });
    assert.ok(result.overall > 0, 'unified features should not break scoring');
  });
});
