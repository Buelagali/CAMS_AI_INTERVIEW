const { describe, it, before } = require('node:test');
const assert = require('node:assert');

let adaptiveEngine;

before(async () => {
  adaptiveEngine = await require('../services/adaptiveEngine');
});

function makeState(overrides = {}) {
  return {
    role: 'Software Developer',
    resumeSkills: ['JavaScript', 'React', 'Node.js'],
    skillGaps: ['Docker', 'AWS'],
    answerHistory: [],
    currentDifficulty: 1,
    currentQuestionIndex: 0,
    scores: { technical: 0, communication: 0, confidence: 0, semantic: 0 },
    emotionHistory: [],
    ...overrides,
  };
}

function typedAnswers(counts, score, skill) {
  const answers = [];
  const types = Object.entries(counts);
  let idx = 0;
  for (const [type, n] of types) {
    for (let i = 0; i < n; i++) {
      answers.push({
        questionId: `q${idx}`,
        score,
        type,
        skill: skill || null,
        text: 'sample answer text for evaluation purposes here',
      });
      idx++;
    }
  }
  return answers;
}

describe('adaptiveEngine', () => {
  describe('createInitialState', () => {
    it('should create valid initial state', () => {
      const state = adaptiveEngine.createInitialState({
        role: 'Software Developer',
        resumeSkills: ['React', 'Node'],
        skillGaps: ['Docker'],
      });
      assert.ok(state, 'state should exist');
      assert.equal(state.role, 'Software Developer');
      assert.equal(state.currentDifficulty, 1);
      assert.equal(state.currentQuestionIndex, 0);
      assert.deepEqual(state.answerHistory, []);
      assert.ok(Array.isArray(state.resumeSkills));
      assert.ok(Array.isArray(state.skillGaps));
    });

    it('should handle missing fields', () => {
      const state = adaptiveEngine.createInitialState({});
      assert.ok(state, 'should not throw on empty input');
      assert.equal(state.currentDifficulty, 1);
      assert.equal(state.currentQuestionIndex, 0);
    });
  });

  describe('evaluateEvidence', () => {
    it('should not terminate with fewer than 5 answers', () => {
      const evidence = adaptiveEngine.evaluateEvidence(makeState());
      assert.equal(evidence.sufficient, false);
      assert.equal(evidence.reason, 'Gathering initial evidence');
    });

    it('should terminate weak candidates with enough variety', () => {
      const answers = typedAnswers({ technical: 2, behavioral: 2, hr: 2 }, 25);
      const state = makeState({
        answerHistory: answers,
        currentQuestionIndex: 6,
        scores: { technical: 25, semantic: 25, confidence: 30, communication: 25 },
      });
      const evidence = adaptiveEngine.evaluateEvidence(state);
      assert.ok(evidence.sufficient, 'weak candidate with variety at 6 should be sufficient');
      assert.ok(evidence.reason, 'should have termination reason');
    });

    it('should not terminate average candidate too early', () => {
      const answers = typedAnswers({ technical: 2, behavioral: 2, hr: 1 }, 55);
      const state = makeState({
        answerHistory: answers,
        currentQuestionIndex: 5,
        scores: { technical: 55, semantic: 55, confidence: 60, communication: 55 },
      });
      const evidence = adaptiveEngine.evaluateEvidence(state);
      assert.equal(evidence.sufficient, false, 'average at 5 should not be sufficient');
    });

    it('should terminate average candidate when enough answers', () => {
      const answers = typedAnswers({ technical: 5, behavioral: 5, hr: 5 }, 55, 'JavaScript');
      const state = makeState({
        answerHistory: answers,
        currentQuestionIndex: 15,
        resumeSkills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'Git'],
        scores: { technical: 55, semantic: 55, confidence: 60, communication: 55 },
      });
      const evidence = adaptiveEngine.evaluateEvidence(state);
      assert.ok(evidence.sufficient, 'average at 15 with variety and skill coverage should be sufficient');
    });

    it('should terminate strong candidates when coverage is good', () => {
      const answers = typedAnswers({ technical: 5, behavioral: 5, hr: 5 }, 78, 'JavaScript');
      const state = makeState({
        answerHistory: answers,
        currentQuestionIndex: 15,
        resumeSkills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'Git'],
        scores: { technical: 78, semantic: 75, confidence: 80, communication: 78 },
      });
      const evidence = adaptiveEngine.evaluateEvidence(state);
      assert.ok(evidence.sufficient, 'strong at 15 with variety should be sufficient');
    });

    it('should detect "I don\'t know" patterns', () => {
      const idkTexts = ["I don't know", "I'm not sure about this", 'pass',
        "I don't understand", 'Not really sure', "Can't answer this",
        "I don't know"];
      const answers = idkTexts.map((text, i) => ({
        questionId: `q${i}`,
        score: 15,
        type: i < 3 ? 'technical' : i < 5 ? 'behavioral' : 'hr',
        text,
      }));
      const state = makeState({
        answerHistory: answers,
        currentQuestionIndex: 7,
        scores: { technical: 15, semantic: 14, confidence: 20, communication: 15 },
      });
      const evidence = adaptiveEngine.evaluateEvidence(state);
      assert.ok(evidence.sufficient, 'IDK pattern should trigger termination');
      assert.ok(evidence.candidateType === 'weak', 'should be classified as weak');
    });

    it('should not terminate very strong candidates early', () => {
      const answers = typedAnswers({ technical: 2, behavioral: 2, hr: 2 }, 90, 'JavaScript');
      const state = makeState({
        answerHistory: answers,
        currentQuestionIndex: 6,
        scores: { technical: 90, semantic: 92, confidence: 88, communication: 90 },
      });
      const evidence = adaptiveEngine.evaluateEvidence(state);
      assert.equal(evidence.sufficient, false, 'very strong at 6 should continue');
    });

    it('should produce deterministic results', () => {
      const state = makeState();
      const e1 = adaptiveEngine.evaluateEvidence(state);
      const e2 = adaptiveEngine.evaluateEvidence(state);
      assert.deepStrictEqual(e1, e2, 'same state should produce same evidence');
    });

    it('should return coverage field', () => {
      const evidence = adaptiveEngine.evaluateEvidence(makeState());
      assert.ok(evidence.coverage, 'should have coverage');
      assert.ok(typeof evidence.coverage === 'object', 'coverage should be object');
    });

    it('should return sufficient boolean', () => {
      const evidence = adaptiveEngine.evaluateEvidence(makeState());
      assert.equal(typeof evidence.sufficient, 'boolean');
    });

    it('should include candidateType when sufficient', () => {
      const answers = typedAnswers({ technical: 2, behavioral: 2, hr: 2 }, 25);
      const state = makeState({
        answerHistory: answers,
        currentQuestionIndex: 6,
        scores: { technical: 25, semantic: 25, confidence: 30, communication: 25 },
      });
      const evidence = adaptiveEngine.evaluateEvidence(state);
      assert.ok(evidence.sufficient);
      assert.equal(typeof evidence.candidateType, 'string');
    });
  });

  describe('generateQuestion', () => {
    it('should generate a question object', async () => {
      const state = makeState();
      const q = await adaptiveEngine.generateQuestion(state);
      assert.ok(q, 'question should exist');
      assert.ok(q.id, 'should have id');
      assert.ok(q.type, 'should have type');
      assert.ok(q.text, 'should have text');
      assert.ok(['hr', 'technical', 'resume', 'behavioral', 'adaptive'].includes(q.type),
        'valid question type');
    });

    it('should generate different questions sequentially', async () => {
      const state = makeState();
      const q1 = await adaptiveEngine.generateQuestion(state);
      state.answerHistory.push({ questionId: q1.id, score: 70, type: q1.type, text: q1.text });
      state.currentQuestionIndex = 1;
      const q2 = await adaptiveEngine.generateQuestion(state);
      assert.notEqual(q1.text, q2.text, 'consecutive questions should differ');
    });
  });
});
