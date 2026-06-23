"""
Fine-tune wav2vec2-base-superb-ic for interview speech emotion classification.
Labels: confident, nervous, anxious, neutral
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import os
import torch
import logging
import numpy as np
import soundfile as sf
from datasets import Dataset, Audio
from transformers import (
    AutoFeatureExtractor, AutoModelForAudioClassification,
    TrainingArguments, Trainer
)
from utils import load_config, get_model_config, ensure_dirs, logger

def generate_synthetic_emotion_audio(
    emotion: str, sample_rate: int = 16000, duration: float = 3.0
) -> np.ndarray:
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    base_freq = {'confident': 150, 'nervous': 250, 'anxious': 200, 'neutral': 180}
    freq = base_freq.get(emotion, 180)
    audio = np.sin(2 * np.pi * freq * t) * 0.3
    audio += np.sin(2 * np.pi * freq * 1.5 * t) * 0.1

    if emotion == 'confident':
        audio *= (1.0 + 0.2 * np.sin(2 * np.pi * 0.5 * t))
        audio += np.random.randn(len(audio)) * 0.01
    elif emotion == 'nervous':
        audio *= (1.0 + 0.4 * np.sin(2 * np.pi * 3 * t))
        audio += np.random.randn(len(audio)) * 0.05
    elif emotion == 'anxious':
        audio *= (1.0 + 0.3 * np.sin(2 * np.pi * 5 * t))
        audio += np.random.randn(len(audio)) * 0.04
    else:
        audio += np.random.randn(len(audio)) * 0.015

    peak = np.max(np.abs(audio))
    if peak > 0:
        audio = audio / peak * 0.9
    return audio.astype(np.float32)

def create_synthetic_dataset(num_samples: int, emotions: list, sample_rate: int, data_dir: str):
    logger.info(f"Generating {num_samples} synthetic emotion audio samples...")
    audio_dir = os.path.join(data_dir, "wav2vec2", "audio")
    os.makedirs(audio_dir, exist_ok=True)

    data = []
    for i in range(num_samples):
        emotion = emotions[i % len(emotions)]
        audio = generate_synthetic_emotion_audio(emotion, sample_rate)
        path = os.path.join(audio_dir, f"emotion_{i}.wav")
        sf.write(path, audio, sample_rate)
        data.append({"audio": path, "label": emotion})
    return data

def main():
    config = load_config()
    model_cfg = get_model_config(config, 'wav2vec2')
    ensure_dirs(config)

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    logger.info(f"Using device: {device}")

    id2label = model_cfg['id2label']
    label2id = model_cfg['label2id']
    emotions = list(label2id.keys())

    feature_extractor = AutoFeatureExtractor.from_pretrained(
        "facebook/wav2vec2-base"
    )
    model = AutoModelForAudioClassification.from_pretrained(
        model_cfg['hf_model_id'],
        num_labels=model_cfg['num_labels'],
        label2id=label2id,
        id2label=id2label,
        ignore_mismatched_sizes=True
    )
    logger.info(f"Loaded base model: {model_cfg['hf_model_id']}")

    raw_data = create_synthetic_dataset(
        model_cfg['dataset']['num_samples'],
        emotions,
        model_cfg['dataset'].get('sample_rate', 16000),
        config['defaults']['data_dir']
    )
    dataset = Dataset.from_list(raw_data)
    dataset = dataset.cast_column("audio", Audio(sampling_rate=16000))

    def prepare_dataset(batch):
        audio = batch["audio"]
        inputs = feature_extractor(
            audio["array"], sampling_rate=audio["sampling_rate"],
            return_tensors="pt", padding=True
        )
        batch["input_values"] = inputs.input_values[0]
        batch["labels"] = label2id[batch["label"]]
        return batch

    dataset = dataset.map(prepare_dataset, remove_columns=["audio", "label"])
    split = int(len(dataset) * 0.9)
    train_dataset = dataset.select(range(split))
    eval_dataset = dataset.select(range(split, len(dataset)))

    args = TrainingArguments(
        output_dir=f"{model_cfg['output_dir']}/{model_cfg['name']}",
        num_train_epochs=model_cfg['num_epochs'],
        per_device_train_batch_size=model_cfg['batch_size'],
        per_device_eval_batch_size=model_cfg['batch_size'],
        learning_rate=model_cfg['learning_rate'],
        warmup_steps=model_cfg.get('warmup_steps', 50),
        fp16=(device == 'cuda'),
        evaluation_strategy="steps",
        save_steps=model_cfg.get('save_steps', 200),
        eval_steps=model_cfg.get('eval_steps', 200),
        logging_steps=model_cfg.get('logging_steps', 10),
        save_total_limit=2,
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        tokenizer=feature_extractor,
    )

    logger.info("Starting training...")
    trainer.train()
    trainer.save_model()
    feature_extractor.save_pretrained(args.output_dir)
    logger.info(f"Model saved to {args.output_dir}")

if __name__ == '__main__':
    main()
