#!/bin/bash

# Deploy script for AI T-Shirt Generator Website and Server
echo "Deploying AI T-Shirt Generator Website and Server..."

# Function to handle errors
handle_error() {
    echo "Error: $1"
    if [ "$2" = "apt_update" ]; then
        echo "Diagnosing apt-get update issue..."
        echo "1. Checking if apt is locked..."
        if lsof /var/lib/apt/lists/lock >/dev/null 2>&1 || lsof /var/lib/dpkg/lock* >/dev/null 2>&1; then
            echo "APT is locked. Trying to fix..."
            sudo rm -f /var/lib/apt/lists/lock
            sudo rm -f /var/lib/dpkg/lock*
            sudo dpkg --configure -a
        fi
        echo "2. Testing internet connectivity..."
        if ! ping -c 1 8.8.8.8 >/dev/null 2>&1; then
            echo "Network connectivity issue detected!"
        fi
        echo "3. Checking DNS resolution..."
        if ! nslookup archive.ubuntu.com >/dev/null 2>&1; then
            echo "DNS resolution issue detected!"
        fi
        echo "4. Trying to fix package lists..."
        sudo rm -rf /var/lib/apt/lists/*
        sudo mkdir -p /var/lib/apt/lists/partial
    fi
    exit 1
}

# Update package lists with retry mechanism
echo "Updating system packages..."

# Check architecture and adjust repository if needed
ARCH=$(dpkg --print-architecture)
echo "Detected architecture: $ARCH"

max_retries=3
retry_count=0
while [ $retry_count -lt $max_retries ]; do
    echo "Attempt $((retry_count + 1)) of $max_retries to update package lists..."
    if sudo apt-get clean && sudo apt-get update -y 2>&1 | tee /tmp/apt-update.log; then
        break
    else
        retry_count=$((retry_count + 1))
        if [ $retry_count -eq $max_retries ]; then
            handle_error "Failed to update package lists after $max_retries attempts" "apt_update"
        fi
        echo "Waiting before retry $retry_count..."
        sleep 5
    fi
done

# Install Python and required system packages
echo "Installing Python and system dependencies..."
sudo apt-get install -y python3-pip python3-venv python3-dev \
    libgl1-mesa-glx libglib2.0-0 build-essential || handle_error "Failed to install system packages"

# Verify Python installation
python3 --version || handle_error "Python installation failed"
pip3 --version || handle_error "Pip installation failed"

# Install Node.js 18.x if not installed or upgrade if older version
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null || [[ ! "$(node -v)" =~ ^v18\. ]]; then
    echo "Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs build-essential || handle_error "Failed to install Node.js"
fi

# Install PM2 globally if not installed
echo "Installing PM2..."
sudo npm install -g pm2 || handle_error "Failed to install PM2"

# Set up project structure
echo "Setting up project structure..."
PROJECT_ROOT=$(pwd)

# Create necessary directories
mkdir -p server/outputs server/logs dist

# Create and activate virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv || handle_error "Failed to create virtual environment"
source venv/bin/activate || handle_error "Failed to activate virtual environment"

# Add project root to PYTHONPATH
export PYTHONPATH="${PROJECT_ROOT}:${PROJECT_ROOT}/server"

# Upgrade pip to latest version
echo "Upgrading pip..."
python -m pip install --upgrade pip || handle_error "Failed to upgrade pip"

# Install server requirements with better error handling
echo "Installing server requirements..."
# First install basic requirements
pip install wheel setuptools || handle_error "Failed to install basic requirements"

# Install requirements with retries and verbose output
echo "Installing main requirements..."
pip install -v -r requirements.txt || handle_error "Failed to install main requirements"

# Additional server requirements if they exist
if [ -f "server/requirements.txt" ]; then
    echo "Installing additional server requirements..."
    pip install -v -r server/requirements.txt || handle_error "Failed to install server requirements"
fi

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
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo "Deployment complete!"
echo "Frontend is running at: http://localhost:3000"
echo "Backend API is running at: http://localhost:8000"

# Display service status
echo -e "\nService Status:"
pm2 status
