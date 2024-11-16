# AI T-Shirt Design Generator

An advanced web application that generates unique t-shirt designs using Stable Diffusion 3.5 and Hugging Face API. Create custom t-shirt designs with AI, preview them in real-time, and manage your online store.

## 🌟 Features

- **Dual AI Design Generation**: 
  - Primary: Hugging Face Stable Diffusion API
  - Fallback: Local Stable Diffusion Worker
- **Real-time Preview**: Instant visualization of generated designs
- **Custom Design Interface**: User-friendly prompt-based design creation
- **E-commerce Integration**: Complete shopping cart and checkout system
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Cross-Platform Support**: Runs on both Windows and Ubuntu ARM

## 🚀 Quick Start

### Prerequisites

#### For Development (Windows)
- Windows 10 or later
- Python 3.12+
- Node.js 18+ and npm
- Git installed

#### For Production (Ubuntu ARM)
- Ubuntu 20.04+ on ARM architecture
- Python 3.8+
- Node.js 18+ and npm
- Git installed

### Installation

#### Windows Setup (Development)

1. Clone the repository:
```bash
git clone https://github.com/rastinder/auto-tshirt-designer1.git
cd auto-tshirt-designer1
```

2. Set up Python virtual environment:
```bash
python -m venv venv
venv\Scripts\activate
cd server
pip install -r requirements.txt
cd ..
```

3. Install frontend dependencies:
```bash
npm install
```

4. Start the development servers:
```bash
# Start both frontend and backend
start.bat
```

#### Ubuntu ARM Setup (Production)

1. Clone and setup:
```bash
cd ~
git clone https://github.com/rastinder/auto-tshirt-designer1.git
cd auto-tshirt-designer1
chmod +x deploy.sh
./deploy.sh
```

2. Or use the one-click installation:
```bash
pm2 delete all && cd ~ && sudo rm -rf auto-tshirt-designer1 && git clone https://github.com/rastinder/auto-tshirt-designer1.git && cd auto-tshirt-designer1 && chmod +x deploy.sh && ./deploy.sh
```

### Worker Setup (Optional - for Fallback Generation)

The worker is a fallback system that generates images when the Hugging Face API is unavailable.

#### Windows Worker Setup
```bash
setup_worker_gpu.bat
```

#### Ubuntu Worker Setup
```bash
chmod +x setup_worker_gpu.sh && ./setup_worker_gpu.sh
```

## 🖥️ Architecture

### Frontend (React + TypeScript + Vite)
- Modern React with TypeScript
- Tailwind CSS for styling
- Real-time design preview
- Shopping cart system
- Responsive components

### Backend (FastAPI)
- Primary image generation via Hugging Face API
- Fallback to local worker if API fails
- RESTful API endpoints
- WebSocket support for workers
- Cross-platform path handling
- Robust error handling and logging

### Project Structure
```
.
├── src/                  # Frontend source
│   ├── components/       # React components
│   ├── pages/           # Page components
│   └── utils/           # Utility functions
├── server/              # FastAPI backend
│   ├── main.py          # Server entry point
│   ├── task_queue.py    # Task management
│   └── requirements.txt # Python dependencies
├── outputs/             # Generated images
├── logs/               # Server logs
└── worker/             # Stable Diffusion worker (fallback)
```

## 📝 API Documentation

### Main Endpoints

- `POST /design` - Create new design
  ```json
  {
    "prompt": "A cosmic galaxy pattern",
    "style": "realistic",
    "negative_prompt": "blurry, distorted, low quality",
    "priority": 1
  }
  ```
- `GET /status/{task_id}` - Check design status
- `GET /images/{image_name}` - Retrieve generated images
- `WS /ws` - WebSocket connection for workers

### Environment Variables

Create a `.env` file in the server directory:
```env
HOST=0.0.0.0
PORT=8000
HF_API_KEY=your_huggingface_api_key
```

## 🧪 Testing

### Test Dashboard

Access the test dashboard at `https://aitshirts.in/test` for a visual interface showing:
- System Status
- Worker Status
- Queue Information
- Available Test Endpoints
- Test Results

### API Test Commands

#### 1. View Test Dashboard
```bash
curl https://aitshirts.in/test
```

#### 2. Run All Tests
```bash
curl https://aitshirts.in/test/run-all
```

#### 3. Individual Test Commands

Health Check:
```bash
curl https://aitshirts.in/api/test/health
```

Design Generation Test:
```bash
curl -X POST https://aitshirts.in/api/test/design \
     -H "Content-Type: application/json" \
     -d '{"prompt": "test design", "test_mode": true}'
```

Background Removal Test:
```bash
curl -X POST https://aitshirts.in/api/test/background-removal \
     -H "Content-Type: application/json" \
     -d '{"image_url": "https://example.com/image.png", "test_mode": true}'
```

Worker Status:
```bash
curl https://aitshirts.in/api/test/workers
```

### Test Response Examples

#### Health Check Response
```json
{
    "status": "ok",
    "timestamp": "2024-01-20T12:00:00Z"
}
```

#### Worker Status Response
```json
{
    "workers": {
        "connected": 2,
        "ids": ["worker1", "worker2"]
    },
    "queue": {
        "size": 0,
        "pending": 0,
        "processing": 0
    }
}
```

#### Design Generation Test Response
```json
{
    "status": "success",
    "task_id": "test-123",
    "result": {
        "image_url": "/images/test-image.png",
        "metadata": {
            "prompt": "test design",
            "test": true
        }
    }
}
```

### Automated Testing

For Windows users, run the test script:
```cmd
cd server
test_full_api.bat
```

For PowerShell users (detailed output):
```powershell
cd server
.\test_full_api.ps1
```

## 🛠️ Development

### Available Scripts

#### Windows
```bash
# Start development servers
start.bat

# Start worker (optional)
worker\start_worker.bat
```

#### Ubuntu
```bash
# Start production servers
./deploy.sh

# Start worker (optional)
./worker/start_worker.sh
```

### Logging

Logs are stored in the `logs` directory:
- Server logs: `logs/server.log`
- Access logs: Generated by Uvicorn

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Hugging Face](https://huggingface.co/) for the Stable Diffusion API
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
- [React](https://reactjs.org/) for the frontend framework
- [Tailwind CSS](https://tailwindcss.com/) for styling

## 📧 Contact

Rastinder - [GitHub](https://github.com/rastinder)

Project Link: [https://github.com/rastinder/auto-tshirt-designer1](https://github.com/rastinder/auto-tshirt-designer1)