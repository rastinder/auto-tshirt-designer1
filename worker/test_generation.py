import os
from stable_diffusion_cpp import StableDiffusion
import torch
from diffusers import StableDiffusion3Pipeline


pipe = StableDiffusion3Pipeline.from_pretrained(
    "city96/stable-diffusion-3.5-large-gguf",text_encoder_3=None,tokenizer_3=None, torch_dtype=torch.bfloat16
)
pipe = pipe.to("cuda")

image = pipe("cake on women face",num_inference_steps=25, guidance_scale=7.5).images[0]

# Save the output image
output_path = os.path.abspath(os.path.join(os.getcwd(), "worker", "outputs", "generated_image.png"))
os.makedirs(os.path.dirname(output_path), exist_ok=True)
image.save(output_path)

print(f"Image saved to {output_path}")
