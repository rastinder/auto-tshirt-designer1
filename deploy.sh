#!/bin/bash

# Deploy script for AI T-Shirt Generator Website and Server
echo "Deploying AI T-Shirt Generator Website and Server..."

# Update package lists
sudo apt-get update

# Install required packages for Python installation
sudo apt-get install -y software-properties-common

# Add deadsnakes PPA for Python 3.11
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt-get update

# Install Python 3.11 and development packages
sudo apt-get install -y python3.11 python3.11-venv python3.11-dev

# Install required system libraries for background removal
echo "Installing system dependencies for background removal..."
sudo apt-get install -y libgl1-mesa-glx libglib2.0-0

# Install Node.js 18.x if not installed or upgrade if older version
if ! command -v node &> /dev/null || [[ ! "$(node -v)" =~ ^v18\. ]]; then
    echo "Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs build-essential
fi

# Set up project structure
echo "Setting up project structure..."
PROJECT_ROOT=$(pwd)

# Create necessary directories
mkdir -p server/outputs
mkdir -p server/logs

# Create and activate virtual environment with Python 3.11
echo "Creating Python virtual environment..."
python3.11 -m venv venv
source venv/bin/activate

# Add project root to PYTHONPATH
export PYTHONPATH="${PROJECT_ROOT}:${PYTHONPATH}"

# Upgrade pip to latest version
python -m pip install --upgrade pip

# Install main server requirements
echo "Installing server requirements..."
pip install -r requirements.txt
pip install -r server/requirements.txt

# Verify rembg installation
echo "Verifying background removal dependencies..."
pip install rembg[gpu] u2net

# Install Node.js dependencies and build frontend
echo "Installing Node.js dependencies..."
cd "$PROJECT_ROOT"
npm install

# Install testing dependencies
echo "Installing testing dependencies..."
npm install --save-dev \
  vitest@latest \
  @vitest/coverage-v8@latest \
  @vitest/ui@latest \
  @testing-library/react@latest \
  @testing-library/jest-dom@latest \
  jsdom@latest \
  happy-dom@latest \
  glob@^10.3.10 \
  rimraf@^5.0.5 \
  lru-cache@^10.2.0

# Build frontend
echo "Building frontend..."
npm run build

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Configure PM2
echo "Configuring PM2..."
pm2 delete all 2>/dev/null || true

# Create PM2 ecosystem file
cat > ecosystem.config.cjs << EOF
module.exports = {
  apps: [
    {
      name: 'frontend',
      script: 'npm',
      args: 'run preview',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'backend',
      script: '${PROJECT_ROOT}/venv/bin/python',
      args: '-m uvicorn main:app --host 0.0.0.0 --port 8000',
      cwd: '${PROJECT_ROOT}/server',
      env: {
        PYTHONPATH: '${PROJECT_ROOT}/server:${PROJECT_ROOT}',
        PYTHONUNBUFFERED: '1',
      },
    },
  ],
};
EOF

# Set proper permissions
chmod -R 755 server/outputs
chmod -R 755 server/logs

# Create .env file for server
cat > server/.env << EOF
PYTHONPATH=${PROJECT_ROOT}/server:${PROJECT_ROOT}
EOF

# Start services with PM2
pm2 start ecosystem.config.cjs

# Configure Nginx
echo "Configuring Nginx..."
sudo apt-get update
sudo apt-get install -y nginx

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "Server IP: ${SERVER_IP}"

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/t-shirt-designer << EOF
server {
    listen 80;
    server_name ${SERVER_IP};

    client_max_body_size 10M;  # Allow larger file uploads

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api {
        rewrite ^/api(/.*)$ \$1 break;  # Remove /api prefix
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;  # Increased timeout for background removal
    }

    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site and restart Nginx
sudo ln -sf /etc/nginx/sites-available/t-shirt-designer /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo "Deployment complete! Server is running at http://${SERVER_IP}"
echo "API endpoints are available at http://${SERVER_IP}/api"

# Display Nginx status
echo -e "\nChecking Nginx status:"
sudo systemctl status nginx --no-pager

# Display Python path for debugging
echo -e "\nPython path configuration:"
echo "PYTHONPATH: ${PYTHONPATH}"

# Display PM2 process status
echo -e "\nChecking PM2 process status:"
pm2 status
