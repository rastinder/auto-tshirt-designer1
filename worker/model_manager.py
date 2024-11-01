import os
import logging
import json
import shutil
import hashlib
from pathlib import Path
from typing import Optional, Dict
from datetime import datetime
from huggingface_hub import snapshot_download, HfFolder
from tqdm import tqdm
import time

logger = logging.getLogger(__name__)

class ModelManager:
    def __init__(self, cache_dir: str):
        self.cache_dir = Path(cache_dir)
        self.models_dir = self.cache_dir / "models"
        self.downloads_dir = self.cache_dir / "downloads"
        
        # Create necessary directories
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.downloads_dir.mkdir(parents=True, exist_ok=True)
        
        self.model_info_path = self.cache_dir / "model_info.json"
        self.model_info: Dict[str, dict] = self._load_model_info()

    def _load_model_info(self) -> dict:
        if self.model_info_path.exists():
            try:
                return json.loads(self.model_info_path.read_text())
            except json.JSONDecodeError:
                logger.error("Invalid model info file")
        return {}

    def _save_model_info(self):
        self.model_info_path.write_text(json.dumps(self.model_info, indent=2))

    def _calculate_hash(self, file_path: Path) -> str:
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def _get_model_path(self, model_id: str) -> Path:
        safe_name = model_id.replace('/', '_')
        return self.models_dir / safe_name

    async def get_model(self, model_id: str, token: str, max_retries: int = 3) -> bool:
        """Download and cache model files with retry logic"""
        try:
            model_path = self._get_model_path(model_id)
            if model_path.exists():
                logger.info(f"Model {model_id} already in cache")
                return True

            for attempt in range(max_retries):
                try:
                    logger.info(f"Downloading model {model_id} (attempt {attempt + 1}/{max_retries})")
                    snapshot_path = snapshot_download(
                        repo_id=model_id,
                        cache_dir=str(self.downloads_dir),
                        token=token,
                        resume_download=True,
                        local_files_only=False,
                        max_workers=4,
                        timeout=120  # Increased timeout
                    )

                    # Move to final location
                    if model_path.exists():
                        shutil.rmtree(model_path)
                    shutil.move(snapshot_path, model_path)

                    # Save model info
                    model_hash = self._calculate_hash(model_path / "model_index.json")
                    self.model_info[model_id] = {
                        "path": str(model_path),
                        "hash": model_hash,
                        "timestamp": str(datetime.now())
                    }
                    self._save_model_info()

                    logger.info(f"Model {model_id} downloaded successfully")
                    return True

                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    logger.warning(f"Download attempt failed: {str(e)}")
                    wait_time = (attempt + 1) * 5  # Exponential backoff
                    logger.info(f"Waiting {wait_time} seconds before retrying...")
                    time.sleep(wait_time)

        except Exception as e:
            logger.error(f"Failed to download model: {str(e)}")
            if 'snapshot_path' in locals() and Path(snapshot_path).exists():
                shutil.rmtree(snapshot_path)
            return False