# AI T-Shirt Design Generator

An advanced web application that generates unique t-shirt designs using Stable Diffusion 3.5. Create custom t-shirt designs with AI, preview them in real-time, and manage your online store.

## 🌟 Features

- **AI Design Generation**: Powered by Stable Diffusion 3.5
- **Real-time Preview**: Instant visualization of generated designs
- **Custom Design Interface**: User-friendly prompt-based design creation
- **E-commerce Integration**: Complete shopping cart and checkout system
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites

- Ubuntu 20.04+ (for server)
- CUDA-capable GPU (for worker)
- Git installed

### One-Click Installation (Server)

```bash
pm2 delete all && cd ~ && sudo rm -rf auto-tshirt-designer1 && git clone https://github.com/rastinder/auto-tshirt-designer1.git && cd auto-tshirt-designer1 && chmod +x deploy.sh && ./deploy.sh
```

This command will:
1. Clean up any existing PM2 processes
2. Clone the repository
3. Install all dependencies
4. Configure the server
5. Start all services

### Worker Setup (GPU Machine)

1. Clone the repository:
```bash
git clone https://github.com/rastinder/auto-tshirt-designer1.git
cd auto-tshirt-designer1
```

2. Run the worker setup script:
```bash
# For Linux
chmod +x setup_worker_gpu.sh && ./setup_worker_gpu.sh

# For Windows
setup_worker_gpu.bat
```

3. Configure worker:
```bash
# Edit worker/.env with your server URL
SERVER_URL=ws://your_server_ip:8000/ws
```

4. Test the setup:
```bash
# For Linux
python worker/test_generation.py

# For Windows
worker/test_generation.bat
```

## 🖥️ Architecture

### Frontend (React + TypeScript + Vite)
- Modern React with TypeScript
- Tailwind CSS for styling
- Real-time design preview
- Shopping cart system
- Responsive components

### Backend (FastAPI)
- RESTful API endpoints
- WebSocket support
- Task queue management
- Error handling and logging

### Worker (Stable Diffusion)
- Automatic model download
- GPU acceleration
- Memory optimization
- Progress tracking

## 📝 API Documentation

### Endpoints

- `GET /api/` - Health check
- `POST /api/design` - Create new design
- `GET /api/status/{task_id}` - Check design status
- `WS /ws` - WebSocket connection for workers

### Example Design Request
```json
{
  "prompt": "A cosmic galaxy pattern",
  "style": "realistic",
  "priority": 1
}
```

## 🛠️ Development

### Project Structure
```
.
├── src/                  # Frontend source
│   ├── components/       # React components
│   ├── pages/           # Page components
│   └── utils/           # Utility functions
├── server/              # FastAPI backend
├── worker/              # Stable Diffusion worker
└── deploy.sh           # Deployment script
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Stable Diffusion](https://github.com/CompVis/stable-diffusion) for the AI model
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
- [React](https://reactjs.org/) for the frontend framework
- [Tailwind CSS](https://tailwindcss.com/) for styling

## 📧 Contact

Rastinder - [GitHub](https://github.com/rastinder)

Project Link: [https://github.com/rastinder/auto-tshirt-designer1](https://github.com/rastinder/auto-tshirt-designer1)