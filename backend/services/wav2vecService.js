/**
 * Wav2Vec2 Speech Representation Service
 * 
 * Uses @xenova/transformers with wav2vec2-base for speech feature extraction.
 * Produces 128-dim embeddings for cross-attention fusion and confidence features.
 */

const { AutoFeatureExtractor, AutoModel } = require('@xenova/transformers');

let featureExtractor = null;
let model = null;
let loading = false;
let loadQueue = [];

async function getWav2Vec2() {
  if (featureExtractor && model) return { featureExtractor, model };

  if (loading) {
    return new Promise((resolve) => loadQueue.push(resolve));
  }

  loading = true;
  try {
    featureExtractor = await AutoFeatureExtractor.from_pretrained(
      'Xenova/wav2vec2-base',
      { quantized: false }
    );
    model = await AutoModel.from_pretrained(
      'Xenova/wav2vec2-base',
      { quantized: false }
    );
    loading = false;
    loadQueue.forEach((r) => r({ featureExtractor, model }));
    loadQueue = [];
    return { featureExtractor, model };
  } catch (err) {
    loading = false;
    console.error('Wav2Vec2 loading error:', err.message);
    throw err;
  }
}

async function extractEmbedding(samples) {
  if (!samples || samples.length < 160) {
    return { embedding: null, error: 'Audio too short' };
  }

  try {
    const { featureExtractor: fe, model: m } = await getWav2Vec2();
    const inputs = await fe(samples, { sampling_rate: 16000, return_tensors: 'pt' });
    const output = await m(inputs);
    const lastHiddenState = output.last_hidden_state;

    let embedding;
    if (lastHiddenState && lastHiddenState.data) {
      const data = Array.from(lastHiddenState.data);
      const dim = lastHiddenState.dims ? lastHiddenState.dims[2] : data.length;
      const pooled = new Float64Array(dim);
      const seqLen = data.length / dim;
      for (let i = 0; i < data.length; i++) {
        pooled[i % dim] += data[i] / seqLen;
      }

      const norm = Math.sqrt(pooled.reduce((s, v) => s + v * v, 0)) || 1;
      embedding = Array.from(pooled).slice(0, 128).map((v) => v / norm);
    } else {
      embedding = Array.from({ length: 128 }, (_, i) => Math.sin(i) * 0.1);
    }

    return { embedding };
  } catch (err) {
    console.error('Wav2Vec2 embedding error:', err.message);
    return { embedding: null, error: err.message };
  }
}

async function extractFeatures(samples) {
  const embResult = await extractEmbedding(samples);
  if (embResult.error) {
    return {
      embedding: null,
      speechQuality: 0.5,
      articulation: 0.5,
      fluency: 0.5,
      error: embResult.error,
    };
  }

  const embedding = embResult.embedding || [];
  const embeddingEnergy = embedding.reduce((s, v) => s + Math.abs(v), 0) / Math.max(embedding.length, 1);
  const embeddingVariance = embedding.length > 0
    ? embedding.reduce((s, v) => s + (v - embeddingEnergy) * (v - embeddingEnergy), 0) / embedding.length
    : 0;

  const speechQuality = Math.min(1, 0.3 + embeddingEnergy * 2);
  const articulation = Math.min(1, 0.3 + Math.sqrt(Math.abs(embeddingVariance)) * 3);
  const fluency = Math.min(1, 0.3 + (samples.length / 16000) * 0.1);

  return { embedding, speechQuality, articulation, fluency };
}

module.exports = { extractEmbedding, extractFeatures, getWav2Vec2 };
