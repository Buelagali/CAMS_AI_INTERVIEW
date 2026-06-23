# CAMS ML Model Training

Fine-tuning infrastructure for all 6 ML models used in the CAMS interview system.

## Setup

```bash
pip install -r requirements.txt
```

## Usage

Train all models:
```bash
python train.py
```

Train specific models:
```bash
python train.py --models embeddings vit
python train.py --models whisper wav2vec2
python train.py --models layoutlm
python train.py --models phi3   # requires GPU + HF login
```

Generate synthetic data only (no training):
```bash
python train.py --data-only
```

Dry run (show what would happen):
```bash
python train.py --dry-run
```

## Models

| Model | Script | Task | Labels |
|-------|--------|------|--------|
| all-MiniLM-L6-v2 | `train_embeddings.py` | Feature extraction / similarity | N/A (contrastive pairs) |
| whisper-tiny | `train_asr.py` | Speech-to-text | N/A (transcription) |
| wav2vec2-base-superb-ic | `train_intent.py` | Audio emotion classification | confident, nervous, anxious, neutral |
| vit-base-patch16-224 | `train_vision.py` | Frame behavior classification | attentive, distracted, engaged, nodding, speaking, listening, thinking, frustrated, confused, interested |
| layoutlm-base-uncased | `train_docqa.py` | Resume QA | N/A (free-text answers) |
| Phi-3-mini-4k-instruct | `train_llm.py` | Feedback generation | N/A (free-text generation) |

## Output

Trained models are saved to `models/<model_name>/` with config, weights, and tokenizer/processor files.

Phi-3 requires a Hugging Face account with access to the gated model:
```bash
huggingface-cli login
```

## Architecture

```
training/
  train.py              # Orchestrator
  train_embeddings.py   # all-MiniLM-L6-v2
  train_asr.py          # whisper-tiny
  train_intent.py       # wav2vec2-base-superb-ic
  train_vision.py       # vit-base-patch16-224
  train_docqa.py        # layoutlm-base-uncased
  train_llm.py          # Phi-3-mini
  utils.py              # Shared utilities
  configs/config.yaml   # Central configuration
  data/                 # Generated synthetic data
  models/               # Trained model output
  logs/                 # Training logs
```
