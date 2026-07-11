const { describe, it, before } = require('node:test');
const assert = require('node:assert');

let fuseFeatures;

before(async () => {
  fuseFeatures = (await require('../utils/crossAttentionFusion')).fuseFeatures;
});

describe('crossAttentionFusion', () => {
  it('should return valid structure with all fields', () => {
    const result = fuseFeatures({
      answers: [{ semanticScore: 80, confidenceScore: 70 }],
      emotions: ['Happy', 'Neutral'],
      confidence: [75, 80],
      behavior: [{ engagementScore: 70 }],
      visionFeatures: [{ confidence: 0.8 }],
      audioFeatures: [{ confidence: 0.7 }],
    });
    assert.ok(result, 'result should exist');
    assert.ok(Array.isArray(result.attentionWeights));
    assert.ok(Array.isArray(result.modalityNames));
    assert.equal(result.modalityNames.length, 7);
    assert.ok(typeof result.technicalBoost === 'number');
    assert.ok(typeof result.behaviorScore === 'number');
    assert.ok(typeof result.emotionScore === 'number');
    assert.ok(typeof result.engagementScore === 'number');
    assert.ok(typeof result.audioScore === 'number');
    assert.ok(typeof result.signalStrength === 'number');
    assert.ok(Array.isArray(result.qualityScores));
  });

  it('should handle empty modalities gracefully', () => {
    const result = fuseFeatures({});
    assert.ok(result, 'empty input should not throw');
    assert.ok(typeof result.behaviorScore === 'number');
    assert.ok(typeof result.emotionScore === 'number');
    assert.ok(typeof result.engagementScore === 'number');
    assert.ok(typeof result.audioScore === 'number');
    assert.ok(result.technicalBoost >= 0);
    assert.ok(result.behaviorScore >= 0);
  });

  it('should handle partial input', () => {
    const result = fuseFeatures({
      answers: [{ semanticScore: 90 }],
    });
    assert.ok(result.technicalBoost > 0);
    assert.ok(result.behaviorScore >= 0);
    assert.ok(result.emotionScore >= 0);
  });

  it('should be deterministic', () => {
    const input = {
      answers: [{ semanticScore: 80, confidenceScore: 70 }],
      emotions: ['Happy'],
      confidence: [75],
      behavior: [{ engagementScore: 65 }],
      visionFeatures: [{ confidence: 0.8 }],
      audioFeatures: [{ confidence: 0.7 }],
      resume: { skills: ['React', 'Node'] },
    };
    const r1 = fuseFeatures(input);
    const r2 = fuseFeatures(input);
    assert.deepStrictEqual(r1, r2);
  });

  it('should return 7 modality names', () => {
    const result = fuseFeatures({
      answers: [{ semanticScore: 80, confidenceScore: 70 }],
    });
    assert.equal(result.modalityNames.length, 7);
    assert.deepEqual(result.modalityNames, ['resume', 'answers', 'emotions', 'confidence', 'behavior', 'vision', 'audio']);
  });

  it('should not contain NaN values', () => {
    const inputs = [
      {},
      { answers: [{ semanticScore: 0 }] },
      { answers: [{ semanticScore: 100 }], emotions: ['Angry'] },
      { answers: Array.from({ length: 10 }, () => ({ semanticScore: 50 })) },
    ];
    for (const input of inputs) {
      const result = fuseFeatures(input);
      for (const [key, val] of Object.entries(result)) {
        if (typeof val === 'number') {
          assert.ok(!isNaN(val), `${key} should not be NaN for input ${JSON.stringify(input).slice(0, 50)}`);
          assert.ok(isFinite(val), `${key} should be finite`);
        }
      }
    }
  });
});
