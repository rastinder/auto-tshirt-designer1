import os
import sys
import json
import logging
import asyncio
import websockets
import base64
from datetime import datetime
import torch
from pathlib import Path
from monitoring import WorkerMonitor
from stable_diffusion import create_pipeline, optimize_image, ProgressCallback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DesignWorker:
    def __init__(self):
        self.worker_id = os.getenv('WORKER_ID', 'worker1')
        self.server_url = os.getenv('SERVER_URL', 'ws://141.148.223.177:8000/ws')
        self.monitor = WorkerMonitor()
        self.connected = False
        self.output_dir = Path('outputs')
        self.output_dir.mkdir(exist_ok=True)
        self.pipeline = None
        self.ws = None
        
        # Get Hugging Face token
        self.hf_token = os.getenv('HUGGINGFACE_TOKEN')
        if not self.hf_token:
            raise ValueError("HUGGINGFACE_TOKEN environment variable is required")

    async def initialize_pipeline(self):
        """Initialize Stable Diffusion pipeline"""
        try:
            # Initialize Stable Diffusion
            model_id = os.getenv('MODEL_ID', 'CompVis/stable-diffusion-v1-4')
            cache_dir = os.getenv('MODEL_CACHE_DIR', 'model_cache')
            self.pipeline = await create_pipeline(model_id, cache_dir, token=self.hf_token)
            logger.info("Stable Diffusion pipeline initialized")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize pipeline: {str(e)}")
            return False

    async def connect(self):
        """Connect to the server and handle messages"""
        # Initialize pipeline first
        if not await self.initialize_pipeline():
            logger.error("Failed to initialize pipeline, exiting...")
            return

        retry_count = 0
        max_retries = 5

        while retry_count < max_retries:
            try:
                async with websockets.connect(
                    self.server_url,
                    ping_interval=20,
                    ping_timeout=10,
                    close_timeout=10
                ) as websocket:
                    self.ws = websocket
                    logger.info(f"Connected to server at {self.server_url}")
                    self.connected = True

                    # Send initial connection message
                    await websocket.send(json.dumps({
                        "type": "connect",
                        "worker_id": self.worker_id,
                        "status": "ready"
                    }))

                    # Wait for connection acknowledgment
                    response = await websocket.recv()
                    logger.info(f"Server response: {response}")

                    # Reset retry count on successful connection
                    retry_count = 0

                    # Handle messages
                    await self.message_loop(websocket)

            except websockets.ConnectionClosed:
                logger.warning("Connection closed. Attempting to reconnect...")
                self.connected = False
                retry_count += 1
                await asyncio.sleep(min(5 * retry_count, 30))

            except Exception as e:
                logger.error(f"Connection error: {str(e)}")
                retry_count += 1
                await asyncio.sleep(min(5 * retry_count, 30))

        logger.error("Max retries reached. Exiting...")

    async def message_loop(self, websocket):
        """Main message handling loop"""
        try:
            while self.connected:
                try:
                    # Send status update
                    status = self.monitor.get_status()
                    await websocket.send(json.dumps({
                        "type": "worker_status",
                        "worker_id": self.worker_id,
                        "status": status
                    }))

                    # Wait for messages with a timeout
                    message = await asyncio.wait_for(websocket.recv(), timeout=5)
                    data = json.loads(message)
                    
                    if data.get('type') == 'task':
                        await self.process_task(websocket, data.get('data', {}))

                except asyncio.TimeoutError:
                    continue
                except websockets.ConnectionClosed:
                    logger.warning("WebSocket connection closed")
                    break

        except Exception as e:
            logger.error(f"Error in message loop: {str(e)}")
            self.connected = False

    async def process_task(self, websocket, task):
        """Process a design generation task"""
        task_id = task.get('id')
        if not task_id:
            logger.error("Task ID missing")
            return

        try:
            logger.info(f"Processing task: {task_id}")
            self.monitor.start_task(task_id)

            # Send processing status
            await websocket.send(json.dumps({
                'type': 'status_update',
                'task_id': task_id,
                'status': 'processing'
            }))

            # Generate the design using Stable Diffusion
            prompt = task.get('prompt', '')
            negative_prompt = task.get('negative_prompt', '')
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = self.output_dir / f"{task_id}_{timestamp}.webp"

            # Create progress callback
            callback = ProgressCallback(30, websocket, task_id)

            # Run Stable Diffusion with optimized settings
            with torch.cuda.amp.autocast():
                image = self.pipeline(
                    prompt,
                    negative_prompt=negative_prompt,
                    num_inference_steps=30,
                    guidance_scale=7.5,
                    width=512,
                    height=512,
                    callback=callback
                ).images[0]

            # Optimize and save the image
            image_bytes = optimize_image(image)
            with open(output_path, "wb") as f:
                f.write(image_bytes)
            logger.info(f"Image saved to: {output_path}")

            # Convert image to base64
            image_data = base64.b64encode(image_bytes).decode('utf-8')

            # Send completion status with image data
            await websocket.send(json.dumps({
                'type': 'result',
                'task_id': task_id,
                'status': 'completed',
                'image_data': image_data,
                'image_name': output_path.name,
                'metadata': {
                    'timestamp': datetime.utcnow().isoformat(),
                    'worker_id': self.worker_id,
                    'prompt': prompt
                }
            }))

            self.monitor.complete_task(task_id)
            logger.info(f"Task completed: {task_id}")

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error processing task {task_id}: {error_msg}")
            self.monitor.fail_task(task_id)

            await websocket.send(json.dumps({
                'type': 'result',
                'task_id': task_id,
                'status': 'failed',
                'error': error_msg
            }))

async def main():
    """Main entry point"""
    worker = DesignWorker()
    await worker.connect()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker shutdown requested")
    except Exception as e:
        logger.error(f"Worker error: {str(e)}")