import os
import logging
import torch
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
from huggingface_hub import HfFolder, hf_hub_download
from pathlib import Path
import time
from tqdm import tqdm
from PIL import Image
import io

logger = logging.getLogger(__name__)

def optimize_image(image: Image.Image, format: str = 'WEBP', quality: int = 85) -> bytes:
    """Optimize image for web delivery"""
    buffer = io.BytesIO()
    
    # Convert to RGB if necessary
    if image.mode in ('RGBA', 'P'):
        image = image.convert('RGB')
    
    # Save as WebP for better compression
    image.save(buffer, format=format, quality=quality, optimize=True)
    return buffer.getvalue()

def download_with_retry(model_id: str, cache_dir: str, token: str, max_retries: int = 3):
    """Download model with retry logic"""
    for attempt in range(max_retries):
        try:
            pipeline = StableDiffusionPipeline.from_pretrained(
                "CompVis/stable-diffusion-v1-4",
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                cache_dir=cache_dir,
                use_auth_token=token,
                local_files_only=False,
                safety_checker=None,
                requires_safety_checker=False
            )
            return pipeline
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            logger.warning(f"Download attempt {attempt + 1} failed: {str(e)}. Retrying...")
            time.sleep(5 * (attempt + 1))

class ProgressCallback:
    def __init__(self, total_steps: int, websocket=None, task_id: str = None):
        self.total_steps = total_steps
        self.current_step = 0
        self.websocket = websocket
        self.task_id = task_id

    async def __call__(self, step: int, *args):
        self.current_step = step
        progress = int((step / self.total_steps) * 100)
        
        if self.websocket and self.task_id:
            try:
                await self.websocket.send_json({
                    "type": "progress",
                    "task_id": self.task_id,
                    "progress": progress
                })
            except Exception as e:
                logger.error(f"Failed to send progress update: {str(e)}")

async def create_pipeline(model_id: str, cache_dir: str, token: str, device: str = "cuda:0"):
    """Creates and returns a Stable Diffusion pipeline."""
    try:
        # Create cache directory
        cache_path = Path(cache_dir)
        cache_path.mkdir(parents=True, exist_ok=True)
        
        # Set up HuggingFace token
        if not token:
            raise ValueError("HUGGINGFACE_TOKEN environment variable is required")
        HfFolder.save_token(token)

        logger.info(f"Loading model: {model_id}")
        
        # Download model with retry logic
        pipeline = download_with_retry(model_id, cache_dir, token)

        # Move to device
        pipeline = pipeline.to(device)

        # Enable memory optimizations
        pipeline.enable_attention_slicing(slice_size="auto")
        
        if torch.cuda.is_available():
            pipeline.enable_model_cpu_offload()
            pipeline.enable_vae_slicing()
            
            # Use DPM++ 2M Karras scheduler for better quality
            pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
                pipeline.scheduler.config,
                use_karras_sigmas=True
            )

        # Test the pipeline with minimal settings
        logger.info("Testing pipeline with a sample generation...")
        test_prompt = "A simple test image"
        _ = pipeline(
            test_prompt,
            num_inference_steps=1,
            width=64,
            height=64
        ).images[0]

        logger.info("Pipeline created and tested successfully")
        return pipeline
    
    except Exception as e:
        logger.error(f"Error creating Stable Diffusion pipeline: {str(e)}")
        raise