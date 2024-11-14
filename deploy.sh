#!/bin/bash

# Deploy script for AI T-Shirt Generator Website and Server
echo "Deploying AI T-Shirt Generator Website and Server..."

# Install Node.js 18.x if not installed or upgrade if older version
if ! command -v node &> /dev/null || [[ ! "$(node -v)" =~ ^v18\. ]]; then
    echo "Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs build-essential
fi

# Create and activate virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install main server requirements
echo "Installing server requirements..."
pip install -r requirements.txt
pip install -r server/requirements.txt

# Install Node.js dependencies and build frontend
echo "Installing Node.js dependencies..."
npm install
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
sudo tee /etc/nginx/sites-available/ai-tshirt << EOF
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://${SERVER_IP}:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }

    # API Backend
    location /api/ {
        proxy_pass http://${SERVER_IP}:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }

    # WebSocket endpoint
    location /ws {
        proxy_pass http://${SERVER_IP}:8000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Enable CORS
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
    add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
}
EOF

# Enable site and restart Nginx
sudo ln -sf /etc/nginx/sites-available/ai-tshirt /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup

echo "Deployment complete! The application should be running at:"
echo "Frontend: http://${SERVER_IP}"
echo "Backend: http://${SERVER_IP}/api"
echo "WebSocket: ws://${SERVER_IP}/ws"

# Display PM2 status
pm2 status