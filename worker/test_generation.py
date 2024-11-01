import os
import torch
import logging
from pathlib import Path
from datetime import datetime
from diffusers import StableDiffusionPipeline
from PIL import Image
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_available_gpus():
    """Get list of available CUDA GPUs"""
    gpu_count = torch.cuda.device_count()
    gpus = []
    for i in range(gpu_count):
        gpu_name = torch.cuda.get_device_name(i)
        gpu_memory = torch.cuda.get_device_properties(i).total_memory / (1024**3)  # Convert to GB
        gpus.append({
            'index': i,
            'name': gpu_name,
            'memory': f"{gpu_memory:.1f} GB"
        })
    return gpus

def download_model_with_retry(model_id: str, cache_dir: str, token: str, max_retries: int = 3):
    """Download model with retry logic"""
    last_exception = None
    
    for attempt in range(max_retries):
        try:
            return StableDiffusionPipeline.from_pretrained(
                "CompVis/stable-diffusion-v1-4",  # Use a known working model
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                cache_dir=cache_dir,
                use_auth_token=token,
                local_files_only=False,
                safety_checker=None,
                requires_safety_checker=False
            )
        except Exception as e:
            last_exception = e
            logger.warning(f"Download attempt {attempt + 1} failed: {str(e)}")
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 5  # Exponential backoff
                logger.info(f"Waiting {wait_time} seconds before retrying...")
                time.sleep(wait_time)
            
    raise last_exception

def test_image_generation(prompt: str = "A cosmic galaxy pattern on a t-shirt, digital art style", gpu_id: int = 0):
    """Test image generation on specified GPU"""
    try:
        # Create output directory
        output_dir = Path("test_outputs")
        output_dir.mkdir(exist_ok=True)

        # Set device
        device = f"cuda:{gpu_id}" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {device}")

        # Load model
        cache_dir = "model_cache"
        token = os.getenv("HUGGINGFACE_TOKEN")
        
        if not token:
            raise ValueError("HUGGINGFACE_TOKEN environment variable is required")

        logger.info("Loading model...")
        pipeline = download_model_with_retry("CompVis/stable-diffusion-v1-4", cache_dir, token)
        pipeline = pipeline.to(device)

        # Enable memory optimizations
        pipeline.enable_attention_slicing()
        if torch.cuda.is_available():
            pipeline.enable_model_cpu_offload()
            pipeline.enable_vae_slicing()
        
        # Generate image
        logger.info(f"Generating image with prompt: {prompt}")
        image = pipeline(
            prompt,
            num_inference_steps=30,
            guidance_scale=7.5
        ).images[0]

        # Save image
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = output_dir / f"test_generation_{timestamp}_gpu{gpu_id}.png"
        image.save(output_path)
        logger.info(f"Image saved to: {output_path}")

        return str(output_path)

    except Exception as e:
        logger.error(f"Error generating image: {str(e)}")
        raise

def main():
    logger.info("Starting GPU test and image generation...")

    # Check available GPUs
    gpus = get_available_gpus()
    logger.info(f"Found {len(gpus)} GPU(s):")
    for gpu in gpus:
        logger.info(f"GPU {gpu['index']}: {gpu['name']} ({gpu['memory']})")

    if not gpus:
        logger.error("No CUDA GPUs found!")
        return

    # Test image generation on first GPU
    try:
        output_path = test_image_generation(gpu_id=0)
        logger.info(f"Test successful! Image saved to: {output_path}")
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")

if __name__ == "__main__":
    main()