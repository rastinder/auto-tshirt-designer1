#!/bin/bash
# Setup script for the central server (runs on VPS)

# Create virtual environment
python3 -m venv server_env
source server_env/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install server dependencies only (lighter weight)
pip install fastapi==0.104.0 \
            uvicorn==0.24.0 \
            websockets==11.0.3 \
            python-dotenv==1.0.0 \
            pydantic==2.4.0 \
            httpx==0.25.0 \
            python-multipart==0.0.6 \
            aiofiles==23.2.1

# Create logs directory
mkdir -p logs

echo "Server setup complete. Run with: python3 server/main.py"