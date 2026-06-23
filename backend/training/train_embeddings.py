"""
Fine-tune all-MiniLM-L6-v2 on domain-specific question-answer pairs.
Uses contrastive learning to produce better embeddings for interview answer scoring.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import torch
import logging
from datasets import Dataset
from sentence_transformers import (
    SentenceTransformer, SentenceTransformerTrainer,
    SentenceTransformerTrainingArguments,
    losses, InputExample
)
from utils import load_config, get_model_config, ensure_dirs, logger

def generate_synthetic_pairs(num_samples=10000, similar_ratio=0.5):
    from utils import logger
    logger.info(f"Generating {num_samples} synthetic contrastive pairs...")

    questions = [
        "How do you handle imbalanced datasets?",
        "Explain REST API design principles.",
        "What is the CAP theorem?",
        "How would you scale a database?",
        "Describe your experience with Docker.",
        "How do you optimize SQL queries?",
        "What is the difference between var, let, const?",
        "How do you manage state in React?",
        "Explain the concept of microservices.",
        "How would you implement authentication?",
        "What is your approach to testing?",
        "Describe a CI/CD pipeline.",
        "How do you handle errors in Node.js?",
        "What is the Singleton pattern?",
        "How does garbage collection work?",
        "Explain the event loop in JavaScript.",
        "What is the difference between SQL and NoSQL?",
        "How do you secure a REST API?",
        "Describe your experience with cloud services.",
        "What is load balancing and how does it work?",
    ]
    good_answers = [
        "I use techniques like SMOTE, class weighting, and ensemble methods to address imbalance.",
        "REST APIs should be stateless, use proper HTTP methods, and have consistent endpoint naming.",
        "The CAP theorem states a distributed system can only guarantee two of Consistency, Availability, and Partition tolerance.",
        "I use indexing, connection pooling, read replicas, sharding, and caching strategies.",
        "I containerize applications using Dockerfiles, manage multi-container setups with Docker Compose, and optimize image sizes.",
        "I analyze query plans, add appropriate indexes, avoid N+1 queries, and use query optimization techniques.",
        "var is function-scoped, let is block-scoped and mutable, const is block-scoped and immutable.",
        "I use React hooks like useState and useReducer, and global state management with Context or Redux.",
        "Microservices are independently deployable services that communicate via APIs, each owning its own data store.",
        "I implement JWT tokens, OAuth2 flows, session management, and secure password hashing.",
    ]
    bad_answers = [
        "I just use whatever the default is.",
        "You just make URLs and return JSON.",
        "I don't know much about distributed systems.",
        "Just add more servers I guess.",
        "I've heard of Docker but haven't used it much.",
        "I just write queries and hope they work.",
        "I use them all the same way.",
        "I just put everything in props.",
        "It's like smaller services that talk to each other.",
        "I use passwords and basic auth.",
    ]

    label_to_answers = {0: good_answers, 1: bad_answers}
    pairs = []
    labels = []
    import random
    for _ in range(num_samples // 2):
        q = random.choice(questions)
        a1 = random.choice(good_answers)
        a2 = random.choice(good_answers)
        pairs.append((q, a1, a2))
        labels.append(1.0)

        q = random.choice(questions)
        a1 = random.choice(good_answers)
        a2 = random.choice(bad_answers)
        pairs.append((q, a1, a2))
        labels.append(0.0)

    random.shuffle(list(zip(pairs, labels)))
    return pairs[:num_samples], labels[:num_samples]

def main():
    config = load_config()
    model_cfg = get_model_config(config, 'embeddings')
    ensure_dirs(config)

    device = 'cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu'
    logger.info(f"Using device: {device}")

    model = SentenceTransformer(model_cfg['hf_model_id'], device=device)
    logger.info(f"Loaded base model: {model_cfg['hf_model_id']}")

    pairs, scores = generate_synthetic_pairs(
        num_samples=model_cfg['dataset']['num_samples'],
        similar_ratio=model_cfg['dataset']['similar_ratio']
    )
    split = int(len(pairs) * 0.9)
    train_examples = [
        InputExample(texts=[p[0], p[1], p[2]], label=float(s))
        for p, s in zip(pairs[:split], scores[:split])
    ]
    eval_examples = [
        InputExample(texts=[p[0], p[1], p[2]], label=float(s))
        for p, s in zip(pairs[split:], scores[split:])
    ]
    train_dataset = Dataset.from_list([e.__dict__ for e in train_examples])
    eval_dataset = Dataset.from_list([e.__dict__ for e in eval_examples])

    args = SentenceTransformerTrainingArguments(
        output_dir=f"{model_cfg['output_dir']}/{model_cfg['name']}",
        num_train_epochs=model_cfg['num_epochs'],
        per_device_train_batch_size=model_cfg['batch_size'],
        per_device_eval_batch_size=model_cfg['batch_size'],
        learning_rate=model_cfg['learning_rate'],
        warmup_steps=model_cfg.get('warmup_steps', 100),
        fp16=(device == 'cuda'),
        save_steps=model_cfg.get('save_steps', 500),
        eval_steps=model_cfg.get('eval_steps', 500),
        logging_steps=model_cfg.get('logging_steps', 10),
        run_name=f"cams-{model_cfg['name']}",
        save_total_limit=2,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
    )

    loss = losses.CosineSimilarityLoss(model)
    trainer = SentenceTransformerTrainer(
        model=model,
        args=args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        loss=loss,
    )

    logger.info("Starting training...")
    trainer.train()
    trainer.save_model()
    logger.info(f"Model saved to {args.output_dir}")

if __name__ == '__main__':
    main()
