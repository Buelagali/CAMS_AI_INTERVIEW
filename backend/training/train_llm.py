"""
Fine-tune Phi-3-mini-4k-instruct on interview feedback generation and adaptive question generation.
Uses QLoRA for memory-efficient training.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import os
import torch
import logging
from datasets import Dataset
from transformers import (
    AutoTokenizer, AutoModelForCausalLM,
    TrainingArguments, Trainer, BitsAndBytesConfig
)
from peft import LoraConfig, get_peft_model, TaskType
from utils import load_config, get_model_config, ensure_dirs, logger

def create_synthetic_dataset(num_samples: int):
    logger.info(f"Generating {num_samples} synthetic interview feedback samples...")
    samples = []

    scenarios = [
        {
            "context": "The candidate answered architectural questions well but struggled with coding.",
            "feedback": "Strong system design knowledge with clear articulation of trade-offs. Needs practice with hands-on coding under time pressure.",
        },
        {
            "context": "The candidate demonstrated excellent problem-solving approach but took too long.",
            "feedback": "Methodical problem-solver who clearly communicates their thought process. Should work on speed and prioritizing completion over perfection.",
        },
        {
            "context": "The candidate had strong technical skills but poor communication.",
            "feedback": "Solid technical foundation with deep domain expertise. Would benefit from practicing concise explanations of complex concepts.",
        },
        {
            "context": "The candidate showed great leadership and team collaboration examples.",
            "feedback": "Strong collaborator with proven leadership experience in cross-functional teams. Technical skills are adequate for the role.",
        },
        {
            "context": "The candidate had relevant experience but lacked depth in core concepts.",
            "feedback": "Practical experience aligns well with the role requirements. Should strengthen fundamental computer science concepts through structured study.",
        },
        {
            "context": "The candidate performed well in behavioral questions but weak technically.",
            "feedback": "Excellent cultural fit and strong soft skills. Technical gaps in the required stack would require significant ramp-up time.",
        },
        {
            "context": "The candidate demonstrated expertise in scalability and distributed systems.",
            "feedback": "Deep understanding of distributed system design, consistency models, and scaling strategies. Strong hire for senior engineering roles.",
        },
        {
            "context": "The candidate had strong opinions but was open to discussion.",
            "feedback": "Shows conviction in technical decisions while remaining receptive to alternative approaches. Good balance for technical leadership.",
        },
    ]

    for i in range(num_samples):
        s = scenarios[i % len(scenarios)]
        prompt = f"<|user|>\nGenerate interview feedback based on the following observation:\n{s['context']}\n<|assistant|>\n{s['feedback']}"
        samples.append({"prompt": prompt})
    return samples

def main():
    config = load_config()
    model_cfg = get_model_config(config, 'phi3')
    ensure_dirs(config)

    if not model_cfg.get('enabled', True):
        logger.warning("Phi-3 training is disabled by default (gated model requiring HF login).")
        logger.warning("Set enabled: true in config and run: huggingface-cli login")
        return

    if not torch.cuda.is_available():
        logger.error("Phi-3 training requires CUDA (GPU) due to model size.")
        return

    device = 'cuda'
    logger.info(f"Using device: {device}")

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    tokenizer = AutoTokenizer.from_pretrained(
        model_cfg['hf_model_id'],
        trust_remote_code=True,
        padding_side="right",
    )
    tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        model_cfg['hf_model_id'],
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
        torch_dtype=torch.float16,
    )
    logger.info(f"Loaded base model: {model_cfg['hf_model_id']}")

    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=model_cfg.get('lora_r', 16),
        lora_alpha=model_cfg.get('lora_alpha', 32),
        lora_dropout=model_cfg.get('lora_dropout', 0.05),
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        bias="none",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    raw_data = create_synthetic_dataset(model_cfg['dataset']['num_samples'])
    dataset = Dataset.from_list(raw_data)

    def tokenize_function(examples):
        outputs = tokenizer(
            examples['prompt'],
            truncation=True,
            padding='max_length',
            max_length=model_cfg['max_length'],
            return_tensors='pt',
        )
        outputs['labels'] = outputs['input_ids'].clone()
        return outputs

    dataset = dataset.map(tokenize_function, batched=True, remove_columns=['prompt'])
    split = int(len(dataset) * 0.9)
    train_dataset = dataset.select(range(split))
    eval_dataset = dataset.select(range(split, len(dataset)))

    args = TrainingArguments(
        output_dir=f"{model_cfg['output_dir']}/{model_cfg['name']}",
        num_train_epochs=model_cfg['num_epochs'],
        per_device_train_batch_size=model_cfg['batch_size'],
        per_device_eval_batch_size=model_cfg['batch_size'],
        gradient_accumulation_steps=4,
        learning_rate=model_cfg['learning_rate'],
        warmup_steps=model_cfg.get('warmup_steps', 10),
        fp16=True,
        logging_steps=model_cfg.get('logging_steps', 5),
        evaluation_strategy="steps",
        eval_steps=model_cfg.get('eval_steps', 50),
        save_steps=model_cfg.get('save_steps', 100),
        save_total_limit=1,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        gradient_checkpointing=True,
        optim="paged_adamw_8bit",
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        tokenizer=tokenizer,
    )

    logger.info("Starting training...")
    trainer.train()
    trainer.save_model()
    tokenizer.save_pretrained(args.output_dir)
    logger.info(f"Model saved to {args.output_dir}")

if __name__ == '__main__':
    main()
