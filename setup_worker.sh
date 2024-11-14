#!/bin/bash
# Setup script for worker machines (runs on GPU-enabled computers)

# Create virtual environment
python3 -m venv worker_env
source worker_env/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install worker dependencies (includes ML frameworks)
pip install torch==2.0.0 \
            torchvision==0.15.0 \
            diffusers==0.25.0 \
            transformers==4.36.0 \
            accelerate==0.25.0 \
            safetensors==0.4.1 \
            huggingface-hub==0.20.1 \
            websockets==11.0.3 \
            python-dotenv==1.0.0 \
            numpy==1.24.0 \
            pillow==10.0.0 \
            tqdm==4.65.0 \
            psutil==5.9.0

# Create model cache and output directories
mkdir -p model_cache outputs logs

echo "Worker setup complete. Edit .env file with server URL then run: python3 worker/main.py"