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

# For ARM64, ensure we're using ports.ubuntu.com
if [ "$ARCH" = "arm64" ]; then
    echo "ARM64 architecture detected, ensuring correct repository configuration..."
    # Backup original sources.list
    sudo cp /etc/apt/sources.list /etc/apt/sources.list.backup
    # Create new sources.list for ARM64
    cat << EOF | sudo tee /etc/apt/sources.list
deb [arch=arm64] http://ports.ubuntu.com/ubuntu-ports focal main restricted universe multiverse
deb [arch=arm64] http://ports.ubuntu.com/ubuntu-ports focal-updates main restricted universe multiverse
deb [arch=arm64] http://ports.ubuntu.com/ubuntu-ports focal-security main restricted universe multiverse
deb [arch=arm64] http://ports.ubuntu.com/ubuntu-ports focal-backports main restricted universe multiverse
EOF
fi

max_retries=3
retry_count=0
while [ $retry_count -lt $max_retries ]; do
    echo "Attempt $((retry_count + 1)) of $max_retries to update package lists..."
    if sudo apt-get clean && sudo apt-get update -y 2>&1 | tee /tmp/apt-update.log; then
        break
    else
        retry_count=$((retry_count + 1))
        echo "Update failed. Checking error log:"
        cat /tmp/apt-update.log
        if [ $retry_count -eq $max_retries ]; then
            echo "All retries failed. Running additional diagnostics..."
            echo "1. Testing repository access:"
            if [ "$ARCH" = "arm64" ]; then
                curl -v http://ports.ubuntu.com/ubuntu-ports/ 2>&1
            else
                curl -v http://archive.ubuntu.com/ubuntu/ 2>&1
            fi
            echo "2. Current apt configuration:"
            apt-config dump
            handle_error "Failed to update package lists after $max_retries attempts" "apt_update"
        fi
        echo "Waiting before retry $retry_count..."
        sleep 5
    fi
done

# Install required packages for Python installation
echo "Installing Python prerequisites..."
sudo apt-get install -y software-properties-common || handle_error "Failed to install software-properties-common"

# Add deadsnakes PPA for Python 3.11
echo "Adding Python 3.11 repository..."
sudo add-apt-repository -y ppa:deadsnakes/ppa || handle_error "Failed to add Python repository"

# Install Python 3.11 and development packages
echo "Installing Python 3.11 and dependencies..."
sudo apt-get install -y python3.11 python3.11-venv python3.11-dev || handle_error "Failed to install Python"

# Install required system libraries for background removal
echo "Installing system dependencies for background removal..."
sudo apt-get install -y libgl1-mesa-glx libglib2.0-0 || handle_error "Failed to install system libraries"

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
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo "Deployment complete!"
echo "Frontend is running at: http://localhost:3000"
echo "Backend API is running at: http://localhost:8000"

# Display service status
echo -e "\nService Status:"
pm2 status
