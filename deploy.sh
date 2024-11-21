#!/bin/bash

# Enable strict mode
set -euo pipefail

# Error handling function
handle_error() {
    echo "❌ Error: $1"
    exit 1
}

# Log function for better visibility
log() {
    echo "🔄 $1"
}

# Success logging function
success() {
    echo "✅ $1"
}

# Warning logging function
warn() {
    echo "⚠️ Warning: $1"
}

# Function to verify network connectivity
check_network() {
    log "Verifying network connectivity..."
    if ! curl -s --head https://registry.npmjs.org > /dev/null; then
        handle_error "No connection to npm registry. Please check your internet connection."
    fi
    success "Network connectivity verified"
}

# Function to verify package manager
verify_package_manager() {
    log "Verifying package manager..."
    
    # Check if we're on Ubuntu/Debian
    if command -v apt-get &> /dev/null; then
        PKG_MANAGER="apt-get"
        PKG_UPDATE="apt-get update"
        PKG_INSTALL="apt-get install -y"
    # Check if we're on RHEL/CentOS/Fedora
    elif command -v dnf &> /dev/null; then
        PKG_MANAGER="dnf"
        PKG_UPDATE="dnf check-update"
        PKG_INSTALL="dnf install -y"
    elif command -v yum &> /dev/null; then
        PKG_MANAGER="yum"
        PKG_UPDATE="yum check-update"
        PKG_INSTALL="yum install -y"
    else
        handle_error "No supported package manager found. Please install packages manually."
    fi
    
    success "Using package manager: $PKG_MANAGER"
}

# Function to install system dependencies
install_system_dependencies() {
    log "Installing system dependencies..."
    
    verify_package_manager
    
    # Try to update package list, but don't fail if it doesn't work
    log "Updating package list..."
    sudo $PKG_UPDATE || log "Warning: Package list update failed, continuing anyway..."
    
    # Install curl if not present
    if ! command -v curl &> /dev/null; then
        log "Installing curl..."
        sudo $PKG_INSTALL curl || log "Warning: Failed to install curl, continuing anyway..."
    fi
    
    # Install build essentials
    log "Installing build tools..."
    if [ "$PKG_MANAGER" = "apt-get" ]; then
        sudo $PKG_INSTALL build-essential || log "Warning: Failed to install build-essential, continuing anyway..."
    elif [ "$PKG_MANAGER" = "dnf" ] || [ "$PKG_MANAGER" = "yum" ]; then
        sudo $PKG_INSTALL gcc gcc-c++ make || log "Warning: Failed to install build tools, continuing anyway..."
    fi
    
    success "System dependencies installation attempted"
}

# Function to setup MongoDB manually
setup_mongodb_manual() {
    log "Setting up MongoDB manually..."
    
    if ! command -v mongod &> /dev/null; then
        log "Downloading MongoDB..."
        # Download MongoDB binary
        wget https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2204-7.0.2.tgz || handle_error "Failed to download MongoDB"
        
        # Extract MongoDB
        tar -zxvf mongodb-linux-x86_64-ubuntu2204-7.0.2.tgz || handle_error "Failed to extract MongoDB"
        
        # Move MongoDB binaries to /usr/local/bin
        sudo mv mongodb-linux-x86_64-ubuntu2204-7.0.2/bin/* /usr/local/bin/ || handle_error "Failed to move MongoDB binaries"
        
        # Create MongoDB directories
        sudo mkdir -p /var/lib/mongodb /var/log/mongodb || handle_error "Failed to create MongoDB directories"
        sudo chown -R $USER:$USER /var/lib/mongodb /var/log/mongodb || handle_error "Failed to set MongoDB directory permissions"
        
        # Cleanup
        rm -rf mongodb-linux-x86_64-ubuntu2204-7.0.2*
    fi
    
    # Create MongoDB service file
    sudo tee /etc/systemd/system/mongod.service > /dev/null << EOL
[Unit]
Description=MongoDB Database Service
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=/usr/local/bin/mongod --dbpath /var/lib/mongodb --logpath /var/log/mongodb/mongod.log
Restart=always

[Install]
WantedBy=multi-user.target
EOL
    
    # Start MongoDB
    sudo systemctl daemon-reload
    sudo systemctl start mongod || handle_error "Failed to start MongoDB"
    sudo systemctl enable mongod || handle_error "Failed to enable MongoDB"
    
    success "MongoDB manual setup complete"
}

# Function to setup MongoDB
setup_mongodb() {
    log "Setting up MongoDB..."
    
    if ! command -v mongod &> /dev/null; then
        log "Attempting to install MongoDB via package manager..."
        if [ "$PKG_MANAGER" = "apt-get" ]; then
            # Try official MongoDB installation
            if ! curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor; then
                log "Warning: Failed to add MongoDB repository, trying manual installation..."
                setup_mongodb_manual
                return
            fi
            
            echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | \
                sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
            
            sudo apt-get update && sudo apt-get install -y mongodb-org || {
                log "Warning: Failed to install MongoDB via package manager, trying manual installation..."
                setup_mongodb_manual
                return
            }
        else
            # For other package managers, use manual installation
            setup_mongodb_manual
            return
        fi
    fi
    
    # Verify MongoDB is running
    if ! systemctl is-active --quiet mongod; then
        sudo systemctl start mongod || handle_error "Failed to start MongoDB"
    fi
    
    success "MongoDB setup complete"
}

# Function to install test dependencies
install_test_deps() {
    log "Installing test dependencies..."
    
    # Install Vitest and testing-library
    npm install --save-dev vitest @testing-library/jest-dom @types/testing-library__jest-dom || \
        handle_error "Failed to install test dependencies"
    
    success "Test dependencies installed"
}

# Function to verify TypeScript installation
verify_typescript() {
    log "Verifying TypeScript installation..."
    
    # Check if TypeScript is installed
    if [ ! -d "./node_modules/typescript" ]; then
        log "TypeScript not found, installing..."
        npm install --save-dev typescript@5.0.2 || handle_error "Failed to install TypeScript"
    fi
    
    # Test TypeScript compiler
    log "Testing TypeScript compiler..."
    if ! npx tsc --version; then
        handle_error "TypeScript compiler not working"
    fi
    
    success "TypeScript verified"
}

# Function to install frontend dependencies with fallback options
install_frontend_deps() {
    log "Installing frontend dependencies..."
    
    # Remove existing installations
    rm -rf node_modules package-lock.json
    
    # Install dependencies with legacy peer deps
    log "Installing dependencies..."
    if ! npm install --legacy-peer-deps; then
        log "Initial install failed, trying alternative approach..."
        
        # Install dependencies in stages
        npm install --save-dev typescript@5.0.2 || handle_error "Failed to install TypeScript"
        npm install --save-dev @types/react@18.2.17 @types/react-dom@18.2.7 || handle_error "Failed to install React types"
        npm install --legacy-peer-deps || handle_error "Failed to install remaining dependencies"
    fi
    
    # Install test dependencies
    install_test_deps
    
    # Verify TypeScript installation
    verify_typescript
    
    success "Frontend dependencies installed"
}

# Function to build frontend
build_frontend() {
    log "Building frontend..."
    
    # Clean any previous builds
    rm -rf dist
    
    # Create build-specific tsconfig if it doesn't exist
    if [ ! -f "tsconfig.build.json" ]; then
        log "Creating build-specific tsconfig..."
        cat > tsconfig.build.json << 'EOL'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "types": ["node"],
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOL
    fi
    
    # Run TypeScript compilation with build config
    log "Running TypeScript compilation..."
    # Capture TypeScript errors in a file
    if ! npx tsc -p tsconfig.build.json 2> ts-errors.log; then
        # Filter and display unique errors
        if [ -f ts-errors.log ]; then
            warn "TypeScript compilation had errors:"
            sort -u ts-errors.log | while read -r line; do
                if [[ $line == *"error"* ]]; then
                    echo "  $line"
                fi
            done
            rm ts-errors.log
        fi
        warn "Attempting build despite TypeScript errors..."
    else
        success "TypeScript compilation completed"
        [ -f ts-errors.log ] && rm ts-errors.log
    fi
    
    # Build with increased memory limit
    log "Running Vite build..."
    export PATH="$PWD/node_modules/.bin:$PATH"
    export NODE_PATH="$PWD/node_modules"
    if ! NODE_OPTIONS="--max-old-space-size=4096" npm run build 2> build-errors.log; then
        if [ -f build-errors.log ]; then
            warn "Build errors occurred:"
            sort -u build-errors.log | while read -r line; do
                if [[ $line == *"error"* ]]; then
                    echo "  $line"
                fi
            done
            rm build-errors.log
            handle_error "Failed to build frontend"
        fi
    else
        success "Frontend built successfully"
        [ -f build-errors.log ] && rm build-errors.log
    fi
}

# Function to setup Python virtual environment
setup_python_venv() {
    log "Setting up Python virtual environment..."
    
    # Install Python3 and venv if not present
    if ! command -v python3 &> /dev/null; then
        sudo apt-get install -y python3 python3-pip python3-venv || handle_error "Failed to install Python3"
    fi
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "server/venv" ]; then
        cd server || handle_error "Failed to change to server directory"
        python3 -m venv venv || handle_error "Failed to create virtual environment"
        cd .. || handle_error "Failed to return to root directory"
    fi
    
    # Activate virtual environment and install dependencies
    cd server || handle_error "Failed to change to server directory"
    source venv/bin/activate || handle_error "Failed to activate virtual environment"
    pip install --upgrade pip || handle_error "Failed to upgrade pip"
    pip install -r requirements.txt || handle_error "Failed to install Python dependencies"
    deactivate
    cd .. || handle_error "Failed to return to root directory"
    
    success "Python virtual environment setup complete"
}

# Function to setup PM2
setup_pm2() {
    log "Setting up PM2..."
    
    if ! command -v pm2 &> /dev/null; then
        log "Installing PM2..."
        sudo npm install -g pm2 || handle_error "Failed to install PM2"
    fi
    
    # Create ecosystem file if it doesn't exist
    if [ ! -f "ecosystem.config.cjs" ]; then
        log "Creating PM2 ecosystem file..."
        cat > ecosystem.config.cjs << 'EOL'
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
      cwd: './server',
      script: 'python3',
      args: '-m uvicorn main:app --host 0.0.0.0 --port 8000',
      interpreter: './venv/bin/python3',
      env: {
        PYTHONPATH: './server',
      },
    },
  ],
};
EOL
    fi
    
    # Start application with PM2
    pm2 delete all 2>/dev/null || true  # Clean up existing processes
    pm2 start ecosystem.config.cjs --env production || handle_error "Failed to start application with PM2"
    
    # Save PM2 process list and setup startup
    pm2 save || handle_error "Failed to save PM2 process list"
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME || handle_error "Failed to setup PM2 startup"
    
    success "PM2 setup complete"
}

# Function to setup Node.js and TypeScript
setup_node_env() {
    log "Setting up Node.js environment..."
    
    # Install other global dependencies
    npm install -g npm@latest || log "Warning: Failed to update npm, continuing anyway..."
    
    success "Node.js environment setup complete"
}

# Main deployment script
main() {
    log "Starting deployment..."
    
    # Check network connectivity
    check_network
    
    # Install system dependencies
    install_system_dependencies
    
    # Setup MongoDB
    setup_mongodb
    
    # Setup Python environment
    setup_python_venv
    
    # Setup Node.js environment
    setup_node_env
    
    # Install frontend dependencies
    install_frontend_deps
    
    # Build frontend
    build_frontend
    
    # Setup and start PM2 processes
    setup_pm2
    
    success "Deployment completed successfully!"
}

# Set environment variables
export NODE_ENV=production
export NODE_OPTIONS="--no-warnings --experimental-specifier-resolution=node"
export PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PYTHONPATH="$PROJECT_ROOT/server"
export PATH="$PWD/server/venv/bin:$PATH"

# Run main function
main
