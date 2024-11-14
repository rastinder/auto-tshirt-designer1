import torch

def verify_model(model_path):
    # Load model using torch
    state_dict = torch.load(model_path)
    
    # Print keys of the loaded state_dict to verify contents
    for key in state_dict.keys():
        print(f"Key: {key}, Shape: {state_dict[key].shape}")

if __name__ == "__main__":
    model_path = "models/stable_diffusion_133a221b8aa7292a167afc5127cb63fb5005638b.pt"
    verify_model(model_path)
