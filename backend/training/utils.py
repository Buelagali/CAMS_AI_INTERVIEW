import os
import yaml
import logging
from pathlib import Path
from typing import Dict, Any

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def load_config(config_path: str = None) -> Dict[str, Any]:
    if config_path is None:
        config_path = Path(__file__).parent / "configs" / "config.yaml"
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    logger.info(f"Loaded config from {config_path}")
    return config

def get_model_config(config: Dict[str, Any], model_key: str) -> Dict[str, Any]:
    model_cfg = config['models'][model_key]
    defaults = config['defaults']
    merged = {**defaults, **model_cfg}
    return merged

def ensure_dirs(config: Dict[str, Any]) -> None:
    for key in ['output_dir', 'data_dir', 'logging_dir']:
        path = Path(config['defaults'][key])
        path.mkdir(parents=True, exist_ok=True)

def save_training_args(args: Dict[str, Any], output_path: str) -> None:
    path = Path(output_path) / "training_args.yaml"
    with open(path, 'w') as f:
        yaml.dump(args, f)
    logger.info(f"Saved training args to {path}")
