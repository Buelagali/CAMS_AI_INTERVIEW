"""
Fine-tune whisper-tiny on synthetic interview audio for domain-specific ASR.
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
    WhisperProcessor, WhisperForConditionalGeneration,
    Seq2SeqTrainingArguments, Seq2SeqTrainer
)
from utils import load_config, get_model_config, ensure_dirs, logger

def generate_synthetic_audio(text: str, sample_rate: int = 16000) -> np.ndarray:
    duration = max(1.0, len(text) * 0.05)
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    audio = np.sin(2 * np.pi * 220 * t) * 0.1
    audio += np.sin(2 * np.pi * 440 * t) * 0.05
    for i, char in enumerate(text.lower()):
        if char in 'aeiou':
            freq = 300 + (hash(char) % 200)
            start = int(i * 0.05 * sample_rate)
            end = int((i * 0.05 + 0.03) * sample_rate)
            if end < len(audio):
                audio[start:end] += np.sin(2 * np.pi * freq * t[start:end]) * 0.15
    noise = np.random.randn(len(audio)) * 0.02
    audio = audio + noise
    peak = np.max(np.abs(audio))
    if peak > 0:
        audio = audio / peak * 0.9
    return audio.astype(np.float32)

def create_synthetic_dataset(num_samples: int, sample_rate: int, data_dir: str):
    logger.info(f"Generating {num_samples} synthetic speech samples...")
    transcipts = [
        "I have experience with Kubernetes and Docker.",
        "My approach to microservices involves API gateways.",
        "I use React hooks for state management.",
        "The system was deployed on AWS EC2 instances.",
        "I implemented CI/CD using GitHub Actions.",
        "The database query was optimized using indexing.",
        "I configured a load balancer for high availability.",
        "We used Terraform for infrastructure as code.",
        "The REST API follows OpenAPI specification.",
        "I debugged the issue using Chrome DevTools.",
        "Our team uses Agile methodology with two-week sprints.",
        "I implemented authentication using JWT tokens.",
        "The data pipeline processes millions of records daily.",
        "I have experience with both SQL and NoSQL databases.",
        "We containerized the application for consistency.",
        "The monitoring stack includes Prometheus and Grafana.",
        "I wrote unit tests with Jest and integration tests.",
        "The deployment uses blue-green strategy for zero downtime.",
        "I optimized the frontend bundle using code splitting.",
        "We use WebSocket for real-time communication.",
    ]
    audio_dir = os.path.join(data_dir, "whisper", "audio")
    os.makedirs(audio_dir, exist_ok=True)

    data = []
    for i in range(num_samples):
        text = transcipts[i % len(transcipts)]
        audio = generate_synthetic_audio(text, sample_rate)
        path = os.path.join(audio_dir, f"sample_{i}.wav")
        sf.write(path, audio, sample_rate)
        data.append({"audio": path, "text": text})
    return data

def main():
    config = load_config()
    model_cfg = get_model_config(config, 'whisper')
    ensure_dirs(config)

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    logger.info(f"Using device: {device}")

    processor = WhisperProcessor.from_pretrained(
        model_cfg['hf_model_id'], language=model_cfg['language'], task="transcribe"
    )
    model = WhisperForConditionalGeneration.from_pretrained(model_cfg['hf_model_id'])
    model.config.forced_decoder_ids = None
    model.config.suppress_tokens = []
    logger.info(f"Loaded base model: {model_cfg['hf_model_id']}")

    raw_data = create_synthetic_dataset(
        model_cfg['dataset']['num_samples'],
        model_cfg['dataset']['sample_rate'],
        config['defaults']['data_dir']
    )
    dataset = Dataset.from_list(raw_data)
    dataset = dataset.cast_column("audio", Audio(sampling_rate=model_cfg['dataset']['sample_rate']))

    def prepare_dataset(batch):
        audio = batch["audio"]
        inputs = processor(
            audio["array"], sampling_rate=audio["sampling_rate"],
            return_tensors="pt"
        )
        batch["input_features"] = inputs.input_features[0]
        labels = processor(
            text=batch["text"], return_tensors="pt"
        ).input_ids[0]
        batch["labels"] = labels
        return batch

    dataset = dataset.map(prepare_dataset, remove_columns=["audio", "text"])
    split = int(len(dataset) * 0.9)
    train_dataset = dataset.select(range(split))
    eval_dataset = dataset.select(range(split, len(dataset)))

    args = Seq2SeqTrainingArguments(
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
        predict_with_generate=True,
        generation_max_length=128,
        save_total_limit=2,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
    )

    trainer = Seq2SeqTrainer(
        model=model,
        args=args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        tokenizer=processor.feature_extractor,
        data_collator=None,
    )

    logger.info("Starting training...")
    trainer.train()
    trainer.save_model()
    processor.save_pretrained(args.output_dir)
    logger.info(f"Model saved to {args.output_dir}")

if __name__ == '__main__':
    main()
