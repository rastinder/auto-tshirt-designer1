import torch
from diffusers import StableDiffusionPipeline, EulerAncestralDiscreteScheduler
from PIL import Image
import base64
import io

def create_pipeline(model_path, cache_dir):
    """Create and return a Stable Diffusion pipeline."""
    pipeline = StableDiffusionPipeline.from_pretrained(
        model_path,
        torch_dtype=torch.float16,
        cache_dir=cache_dir
    ).to("cuda")
    
    return pipeline

def optimize_image(image):
    """Optimize and encode the image to base64."""
    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=85)
    image_bytes = buffer.getvalue()
    return image_bytes

class ProgressCallback:
    def __init__(self, total_steps, websocket, task_id):
        self.total_steps = total_steps
        self.websocket = websocket
        self.task_id = task_id
        self.current_step = 0

    async def __call__(self, step, timestep, latents):
        self.current_step += 1
        if self.current_step % 5 == 0:
            progress = (self.current_step / self.total_steps) * 100
            message = {
                "type": "progress_update",
                "task_id": self.task_id,
                "status": f"{progress:.2f}%"
            }
            await self.websocket.send(json.dumps(message))

# Update the model_path to use the new model
model_path = "city96/stable-diffusion-3.5-large-gguf"

# Update the cache_dir to use the new cache directory
cache_dir = "worker\\model_cache"

# Create a new pipeline with the updated model and cache directory
pipeline = create_pipeline(model_path, cache_dir)
