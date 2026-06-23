"""
Fine-tune layoutlm-base-uncased for resume document question answering.
Trains on synthetic resume QA pairs for extracting name, skills, education, experience.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import os
import json
import torch
import logging
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from datasets import Dataset
from transformers import (
    LayoutLMProcessor, LayoutLMForQuestionAnswering,
    TrainingArguments, Trainer
)
from utils import load_config, get_model_config, ensure_dirs, logger

def generate_synthetic_resume_image(dpi: int = 200) -> Image.Image:
    width, height = 1650, 2550
    img = Image.new('RGB', (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    candidates = {
        "name": ["Alice Johnson", "Bob Smith", "Carol Williams", "David Brown", "Eva Martinez"],
        "skills": [
            "JavaScript, React, Node.js, Python, SQL",
            "Python, TensorFlow, PyTorch, Docker, Kubernetes",
            "Java, Spring Boot, AWS, Microservices, MongoDB",
            "Go, Docker, Kubernetes, Terraform, CI/CD",
            "Python, SQL, Tableau, Machine Learning, Statistics",
        ],
        "education": [
            "B.S. Computer Science, MIT, 2018",
            "M.S. Data Science, Stanford, 2020",
            "B.S. Software Engineering, UC Berkeley, 2019",
            "M.S. Information Systems, Carnegie Mellon, 2021",
            "B.S. Computer Engineering, Georgia Tech, 2017",
        ],
        "experience": [
            "5 years at Google as Senior Software Engineer",
            "8 years at Amazon as ML Engineer",
            "3 years at Microsoft as Full Stack Developer",
            "6 years at Netflix as DevOps Engineer",
            "4 years at Meta as Data Analyst",
        ]
    }
    fields = {
        "name": random.choice(candidates["name"]),
        "skills": random.choice(candidates["skills"]),
        "education": random.choice(candidates["education"]),
        "experience": random.choice(candidates["experience"]),
    }

    y = 200
    for field, value in fields.items():
        label = field.capitalize() + ": "
        draw.text((100, y), label + value, fill=(0, 0, 0))
        y += 400

    return img, fields

def create_synthetic_dataset(num_samples: int, data_dir: str):
    logger.info(f"Generating {num_samples} synthetic resume images...")
    image_dir = os.path.join(data_dir, "layoutlm", "images")
    os.makedirs(image_dir, exist_ok=True)

    questions = {
        "name": ["What is the candidate name?", "Who is applying?"],
        "skills": ["What skills does this person have?", "What are the technical skills?"],
        "education": ["What is the education background?", "What degree do they have?"],
        "experience": ["How many years of experience?", "What is their work experience?"],
    }

    data = []
    for i in range(num_samples):
        img, fields = generate_synthetic_resume_image()
        path = os.path.join(image_dir, f"resume_{i}.png")
        img.save(path)

        for field_key in ["name", "skills", "education", "experience"]:
            q = random.choice(questions[field_key])
            data.append({
                "image_path": path,
                "question": q,
                "answer": fields[field_key],
                "field": field_key,
            })
    return data

def main():
    config = load_config()
    model_cfg = get_model_config(config, 'layoutlm')
    ensure_dirs(config)

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    logger.info(f"Using device: {device}")

    processor = LayoutLMProcessor.from_pretrained(
        "microsoft/layoutlm-base-uncased",
        apply_ocr=True
    )
    model = LayoutLMForQuestionAnswering.from_pretrained(
        model_cfg['hf_model_id'],
        ignore_mismatched_sizes=True
    )
    logger.info(f"Loaded base model: {model_cfg['hf_model_id']}")

    raw_data = create_synthetic_dataset(
        model_cfg['dataset']['num_samples'] // 4,
        config['defaults']['data_dir']
    )
    dataset = Dataset.from_list(raw_data)

    def preprocess(batch):
        images = [Image.open(p).convert('RGB') for p in batch['image_path']]
        questions = batch['question']
        answers = batch['answer']

        inputs = processor(
            images, questions,
            return_tensors='pt',
            padding='max_length',
            truncation=True,
            max_length=model_cfg['max_length']
        )
        batch['input_ids'] = inputs['input_ids']
        batch['attention_mask'] = inputs['attention_mask']
        batch['token_type_ids'] = inputs.get('token_type_ids')
        batch['bbox'] = inputs.get('bbox')

        target = processor(
            text=answers, return_tensors='pt',
            padding='max_length', truncation=True,
            max_length=model_cfg['max_length']
        )
        batch['labels'] = target['input_ids']
        return batch

    dataset = dataset.map(
        preprocess, batched=True,
        remove_columns=['image_path', 'question', 'answer', 'field']
    )
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
        metric_for_best_model="eval_loss",
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
