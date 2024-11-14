# AI T-Shirt Design Worker

Worker node implementation for the AI T-Shirt Design Generation System. This component handles the actual design generation using Stable Diffusion.

## Prerequisites

- CUDA-capable GPU
- Python 3.8+
- Stable Diffusion model weights

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## Configuration

### Environment Variables (.env)
```env
SERVER_URL=ws://localhost:8000/ws
WORKER_ID=worker-1
GPU_ID=0
MODEL_PATH=/path/to/stable-diffusion-model
```

## Usage

Start the worker process:
```bash
python main.py
```

## Architecture

The worker:
1. Connects to the central server via WebSocket
2. Receives design generation tasks
3. Runs Stable Diffusion inference
4. Returns generated designs to the server

## Monitoring

Worker metrics available at:
- GPU utilization
- Memory usage
- Task completion rate
- Error rate

## Error Handling

The worker implements:
1. Automatic reconnection
2. Task timeout handling
3. GPU error recovery
4. Resource cleanup

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request