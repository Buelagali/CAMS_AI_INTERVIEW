#!/usr/bin/env python3
"""
CAMS Model Training Orchestrator
Runs fine-tuning for all or selected models used in the CAMS system.
"""
import sys
import os
import argparse
import logging
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from utils import load_config, logger

def main():
    parser = argparse.ArgumentParser(description="CAMS Model Training Orchestrator")
    parser.add_argument(
        '--models', nargs='+',
        choices=['embeddings', 'whisper', 'wav2vec2', 'vit', 'layoutlm', 'phi3', 'all'],
        default=['all'],
        help='Models to train (default: all)'
    )
    parser.add_argument(
        '--config', type=str, default=None,
        help='Path to config file (default: configs/config.yaml)'
    )
    parser.add_argument(
        '--data-only', action='store_true',
        help='Only generate synthetic datasets, do not train'
    )
    parser.add_argument(
        '--skip-data', action='store_true',
        help='Skip dataset generation, train on existing data'
    )
    parser.add_argument(
        '--dry-run', action='store_true',
        help='Print what would be done without executing'
    )
    args = parser.parse_args()

    config = load_config(args.config)
    models_to_train = list(config['models'].keys())
    if 'all' not in args.models:
        models_to_train = [m for m in args.models if m in config['models']]

    if args.dry_run:
        logger.info("=== DRY RUN ===")
        logger.info(f"Models to train: {models_to_train}")
        for model_key in models_to_train:
            model_cfg = config['models'][model_key]
            enabled = model_cfg.get('enabled', True)
            logger.info(f"  {model_key}: {model_cfg['hf_model_id']} (enabled={enabled})")
            if not enabled:
                logger.info(f"    Skipping {model_key} (disabled in config)")
        logger.info("=== END DRY RUN ===")
        return

    for model_key in models_to_train:
        model_cfg = config['models'][model_key]
        if not model_cfg.get('enabled', True):
            logger.info(f"Skipping {model_key} (disabled in config)")
            continue

        logger.info(f"{'='*60}")
        logger.info(f"Training {model_key}: {model_cfg['hf_model_id']}")
        logger.info(f"{'='*60}")

        script_map = {
            'embeddings': 'train_embeddings.py',
            'whisper': 'train_asr.py',
            'wav2vec2': 'train_intent.py',
            'vit': 'train_vision.py',
            'layoutlm': 'train_docqa.py',
            'phi3': 'train_llm.py',
        }

        script = script_map.get(model_key)
        if not script:
            logger.error(f"No training script for {model_key}")
            continue

        script_path = Path(__file__).parent / script
        cmd = f"python {script_path}"
        if args.skip_data:
            cmd += " --skip-data"

        logger.info(f"Running: {cmd}")
        exit_code = os.system(cmd)
        if exit_code != 0:
            logger.error(f"Training failed for {model_key} (exit code {exit_code})")
            sys.exit(1)
        logger.info(f"Finished training {model_key}")

    logger.info("All training complete!")

if __name__ == '__main__':
    main()
