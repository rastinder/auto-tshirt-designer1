#!/bin/bash

# Deploy script for AI T-Shirt Generator Website and Server
echo "Deploying AI T-Shirt Generator Website and Server..."

# Function to handle errors
handle_error() {
    echo "Error: $1"
    exit 1
}

# Update package lists
echo "Updating system packages..."
 apt-get update || handle_error "Failed to update package lists"

# Install required packages for Python installation
echo "Installing Python prerequisites..."
 apt-get install -y software-properties-common || handle_error "Failed to install software-properties-common"

# Add deadsnakes PPA for Python 3.11
echo "Adding Python 3.11 repository..."
 add-apt-repository -y ppa:deadsnakes/ppa || handle_error "Failed to add Python repository"
 apt-get update

# Install Python 3.11 and development packages
echo "Installing Python 3.11 and dependencies..."
 apt-get install -y python3.11 python3.11-venv python3.11-dev || handle_error "Failed to install Python"

# Install required system libraries for background removal
echo "Installing system dependencies for background removal..."
 apt-get install -y libgl1-mesa-glx libglib2.0-0 || handle_error "Failed to install system libraries"

# Install Node.js 18.x if not installed or upgrade if older version
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null || [[ ! "$(node -v)" =~ ^v18\. ]]; then
    echo "Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs build-essential || handle_error "Failed to install Node.js"
fi

# Install PM2 globally if not installed
echo "Installing PM2..."
 npm install -g pm2 || handle_error "Failed to install PM2"

# Set up project structure
echo "Setting up project structure..."
PROJECT_ROOT=$(pwd)

# Create necessary directories
mkdir -p server/outputs server/logs dist

# Create and activate virtual environment with Python 3.11
echo "Creating Python virtual environment..."
python3.11 -m venv venv || handle_error "Failed to create virtual environment"
source venv/bin/activate || handle_error "Failed to activate virtual environment"

# Add project root to PYTHONPATH
export PYTHONPATH="${PROJECT_ROOT}:${PROJECT_ROOT}/server"

# Upgrade pip to latest version
echo "Upgrading pip..."
python -m pip install --upgrade pip || handle_error "Failed to upgrade pip"

# Install server requirements
echo "Installing server requirements..."
pip install -r requirements.txt || handle_error "Failed to install main requirements"
pip install -r server/requirements.txt || handle_error "Failed to install server requirements"

# Install Node.js dependencies and build frontend
echo "Installing Node.js dependencies..."
npm install || handle_error "Failed to install npm packages"

# Build frontend
echo "Building frontend..."
npm run build || handle_error "Failed to build frontend"

# Stop any existing PM2 processes
echo "Configuring PM2..."
pm2 delete all 2>/dev/null || true

# Start the FastAPI server
echo "Starting FastAPI server..."
pm2 start "python -m uvicorn server.main:app --host 0.0.0.0 --port 8000" --name "ai-tshirt-server" || handle_error "Failed to start server"

# Serve the frontend using PM2
echo "Starting frontend server..."
pm2 serve dist 3000 --name "ai-tshirt-frontend" --spa || handle_error "Failed to start frontend"

# Save PM2 process list
pm2 save || handle_error "Failed to save PM2 process list"

# Setup PM2 to start on boot
 env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo "Deployment complete!"
echo "Frontend is running at: http://localhost:3000"
echo "Backend API is running at: http://localhost:8000"

# Display service status
echo -e "\nService Status:"
pm2 status
