#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting GPU Worker Setup...${NC}"

# Check if NVIDIA driver is installed
echo -e "\n${YELLOW}Checking NVIDIA Driver...${NC}"
if ! command -v nvidia-smi &> /dev/null; then
    echo -e "${RED}NVIDIA driver not found! Please install NVIDIA drivers first.${NC}"
    exit 1
fi

# Check CUDA availability
echo -e "\n${YELLOW}Checking CUDA...${NC}"
nvidia-smi
CUDA_VERSION=$(nvidia-smi | grep "CUDA Version" | awk '{print $9}')
echo -e "Detected CUDA Version: ${GREEN}$CUDA_VERSION${NC}"

# Create virtual environment
echo -e "\n${YELLOW}Creating Python virtual environment...${NC}"
python3 -m venv worker_env
source worker_env/bin/activate

# Upgrade pip
echo -e "\n${YELLOW}Upgrading pip...${NC}"
pip install --upgrade pip

# Install PyTorch with CUDA support
echo -e "\n${YELLOW}Installing PyTorch with CUDA support...${NC}"
pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# Install other dependencies
echo -e "\n${YELLOW}Installing other dependencies...${NC}"
pip install diffusers==0.25.0 \
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

# Create necessary directories
echo -e "\n${YELLOW}Creating directories...${NC}"
mkdir -p model_cache outputs logs

# Run GPU diagnostics
echo -e "\n${YELLOW}Running GPU diagnostics...${NC}"
python worker/check_gpu.py

echo -e "\n${GREEN}Setup complete!${NC}"
echo -e "Next steps:"
echo -e "1. Edit ${YELLOW}worker/.env${NC} file with your server URL"
echo -e "2. Run the worker: ${YELLOW}python worker/main.py${NC}"