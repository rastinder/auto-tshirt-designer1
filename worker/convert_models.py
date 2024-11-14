import os
import torch
from safetensors.torch import load_file

def convert_model(input_path, output_path):
    # Load model using safetensors
    state_dict = {}
    for root, _, files in os.walk(input_path):
        for file in files:
            if file.endswith('.safetensors'):
                full_path = os.path.join(root, file)
                component_state_dict = load_file(full_path)
                relative_path = os.path.relpath(full_path, input_path)
                state_dict[relative_path] = component_state_dict
    
    # Save model in .pt format
    torch.save(state_dict, f"{output_path}.pt")

if __name__ == "__main__":
    models = {
        "model_cache/snapshots/133a221b8aa7292a167afc5127cb63fb5005638b": "models/stable_diffusion_133a221b8aa7292a167afc5127cb63fb5005638b"
    }
    
    for input_path, output_path in models.items():
        convert_model(input_path, output_path)
        print(f"Converted {input_path} to {output_path}.pt")
