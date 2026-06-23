"""
Fine-tune vit-base-patch16-224 for interview frame behavior/emotion classification.
Labels: attentive, distracted, engaged, nodding, speaking, listening, thinking, frustrated, confused, interested
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import os
import torch
import logging
import numpy as np
from PIL import Image, ImageDraw
from datasets import Dataset
from transformers import (
    ViTImageProcessor, ViTForImageClassification,
    TrainingArguments, Trainer
)
from utils import load_config, get_model_config, ensure_dirs, logger

def generate_synthetic_image(label: str, size: int = 224) -> Image.Image:
    img = Image.new('RGB', (size, size), color=(240, 240, 240))
    draw = ImageDraw.Draw(img)

    face_colors = {
        'attentive': (200, 220, 200), 'distracted': (220, 200, 200),
        'engaged': (200, 220, 180), 'nodding': (200, 210, 220),
        'speaking': (220, 200, 210), 'listening': (200, 210, 200),
        'thinking': (210, 200, 220), 'frustrated': (220, 190, 190),
        'confused': (210, 200, 190), 'interested': (200, 220, 210),
    }
    color = face_colors.get(label, (200, 200, 200))
    draw.ellipse([size//4, size//4, 3*size//4, 3*size//4], fill=color, outline='black')

    features = {
        'attentive': (size//2, size//3, size//2, size//2),
        'distracted': (size//3, size//3, 2*size//3, size//2),
        'engaged': (size//2, size//3, size//2, size//2),
        'nodding': (size//2, size//3, size//2, size//2),
        'speaking': (size//3, size//3, 2*size//3, size//2),
        'listening': (size//2, size//3, size//2, size//2),
        'thinking': (size//3, size//3, 2*size//3, size//2),
        'frustrated': (size//3, size//3, 2*size//3, size//2),
        'confused': (size//3, size//3, 2*size//3, size//2),
        'interested': (size//2, size//3, size//2, size//2),
    }
    left_eye, top_eye, right_eye, bottom_eye = features.get(label, (size//3, size//3, 2*size//3, size//2))
    draw.ellipse([left_eye-15, top_eye-5, left_eye+5, top_eye+15], fill='white', outline='black')
    draw.ellipse([right_eye-5, top_eye-5, right_eye+15, top_eye+15], fill='white', outline='black')
    draw.ellipse([left_eye-5, top_eye+5, left_eye+5, top_eye+10], fill='black')
    draw.ellipse([right_eye-5, top_eye+5, right_eye+5, top_eye+10], fill='black')

    if label == 'smiling' or label in ('engaged', 'interested', 'confident'):
        draw.arc([size//3, 2*size//3, 2*size//3, 3*size//4], 0, 180, fill='black', width=2)
    elif label in ('frustrated', 'thinking'):
        draw.arc([size//3, 2*size//3, 2*size//3, 3*size//4], 180, 360, fill='black', width=2)
    else:
        draw.line([size//3, 5*size//8, 2*size//3, 5*size//8], fill='black', width=2)
    return img

def create_synthetic_dataset(num_samples: int, labels: list, data_dir: str):
    logger.info(f"Generating {num_samples} synthetic face images...")
    image_dir = os.path.join(data_dir, "vit", "images")
    os.makedirs(image_dir, exist_ok=True)

    data = []
    for i in range(num_samples):
        label = labels[i % len(labels)]
        img = generate_synthetic_image(label)
        path = os.path.join(image_dir, f"face_{i}.png")
        img.save(path)
        data.append({"image_path": path, "label": label})
    return data

def main():
    config = load_config()
    model_cfg = get_model_config(config, 'vit')
    ensure_dirs(config)

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    logger.info(f"Using device: {device}")

    id2label = {int(k): v for k, v in model_cfg['id2label'].items()}
    label2id = {v: int(k) for k, v in model_cfg['id2label'].items()}
    labels = list(label2id.keys())

    processor = ViTImageProcessor.from_pretrained(model_cfg['hf_model_id'])
    model = ViTForImageClassification.from_pretrained(
        model_cfg['hf_model_id'],
        num_labels=model_cfg['num_labels'],
        label2id=label2id,
        id2label=id2label,
        ignore_mismatched_sizes=True
    )
    logger.info(f"Loaded base model: {model_cfg['hf_model_id']}")

    raw_data = create_synthetic_dataset(
        model_cfg['dataset']['num_samples'],
        labels,
        config['defaults']['data_dir']
    )
    dataset = Dataset.from_list(raw_data)

    def preprocess(batch):
        images = [Image.open(p).convert('RGB') for p in batch['image_path']]
        inputs = processor(images, return_tensors='pt')
        batch['pixel_values'] = inputs['pixel_values']
        batch['labels'] = [label2id[l] for l in batch['label']]
        return batch

    dataset = dataset.map(preprocess, batched=True, remove_columns=['image_path', 'label'])
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
        tokenizer=processor,
    )

    logger.info("Starting training...")
    trainer.train()
    trainer.save_model()
    processor.save_pretrained(args.output_dir)
    logger.info(f"Model saved to {args.output_dir}")

if __name__ == '__main__':
    main()
