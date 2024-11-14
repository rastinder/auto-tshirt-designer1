import os
import sys
import json
import logging
import base64
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, File, UploadFile, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from server.models import Task, DesignRequest, TaskStatus
from server.task_queue import TaskQueue
from server.utils import serialize_datetime

# Get the application root directory
ROOT_DIR = Path(__file__).parent.parent.resolve()

# Configure logging
LOG_DIR = ROOT_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / "server.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="AI T-Shirt Design API")

# Configure CORS with specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Create and configure directories
OUTPUTS_DIR = ROOT_DIR / "outputs"
OUTPUTS_DIR.mkdir(exist_ok=True)

# Custom static files handler with CORS
class CORSStaticFiles(StaticFiles):
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            path = scope.get("path", "")
            logger.info(f"Attempting to serve static file: {path}")
            
        response = await super().__call__(scope, receive, send)
        
        if scope["type"] == "http":
            # Add CORS headers to the response
            headers = [
                (b"access-control-allow-origin", b"*"),
                (b"access-control-allow-methods", b"GET, OPTIONS"),
                (b"access-control-allow-headers", b"*"),
                (b"access-control-expose-headers", b"*"),
                (b"cache-control", b"no-cache"),
                (b"content-type", b"image/png"),
                (b"vary", b"origin"),
            ]
            
            async def wrapped_send(message):
                if message["type"] == "http.response.start":
                    message["headers"].extend(headers)
                    logger.info(f"Serving static file with headers: {headers}")
                await send(message)
            
            await response(scope, receive, wrapped_send)
        return response

# Mount static files directory for serving images with CORS
app.mount("/images", CORSStaticFiles(directory=str(OUTPUTS_DIR)), name="images")

# Add OPTIONS handler for CORS preflight requests
@app.options("/images/{path:path}")
async def options_handler(path: str):
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "3600",
        },
    )

# Initialize task queue
task_queue = TaskQueue()

# Connected workers
connected_workers: Dict[str, WebSocket] = {}

@app.get("/")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@app.websocket("/ws")
async def websocket_worker(websocket: WebSocket):
    """WebSocket endpoint for worker connections"""
    await websocket.accept()
    worker_id = None
    
    try:
        while True:
            data = await websocket.receive_json()
            logger.info(f"Received WebSocket message: {data}")
            
            message_type = data.get("type")
            
            if message_type == "connect":
                worker_id = data.get("worker_id")
                connected_workers[worker_id] = websocket
                await websocket.send_json({
                    "type": "connected",
                    "status": "ok"
                })
                logger.info(f"Worker {worker_id} connected")
            
            elif message_type == "worker_status":
                if worker_id:
                    next_task = await task_queue.get_next_task()
                    if next_task:
                        await websocket.send_json({
                            "type": "task",
                            "data": {
                                "id": next_task.id,
                                **next_task.request
                            }
                        })
            
            elif message_type == "result":
                task_id = data.get("task_id")
                if task_id:
                    # Handle image data
                    image_data = data.get("image_data")
                    image_name = data.get("image_name")
                    
                    if image_data and image_name:
                        image_path = OUTPUTS_DIR / image_name
                        image_bytes = base64.b64decode(image_data)
                        
                        with open(image_path, "wb") as f:
                            f.write(image_bytes)
                        logger.info(f"Saved image to: {image_path}")
                        
                        # Update task status with correct image URL
                        result = {
                            "image_url": f"/images/{image_name}",
                            "metadata": data.get("metadata", {})
                        }
                    else:
                        result = {"error": data.get("error", "Unknown error")}
                    
                    await task_queue.update_task_status(
                        task_id,
                        TaskStatus.COMPLETED if data.get("status") == "completed" else TaskStatus.FAILED,
                        result
                    )
    
    except WebSocketDisconnect:
        if worker_id:
            logger.info(f"Worker {worker_id} disconnected")
            if worker_id in connected_workers:
                del connected_workers[worker_id]
    
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        if worker_id and worker_id in connected_workers:
            del connected_workers[worker_id]

@app.post("/design")
async def create_design(request: DesignRequest):
    """Create a new design request"""
    try:
        task_id = await task_queue.add_task(request)
        logger.info(f"Created design task: {task_id}")
        
        return JSONResponse({
            "task_id": task_id,
            "status": "pending"
        })
    except Exception as e:
        logger.error(f"Error creating design: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status/{task_id}")
async def get_status(task_id: str):
    """Get the status of a design request"""
    try:
        status = await task_queue.get_task_status(task_id)
        if not status:
            logger.error(f"Task not found: {task_id}")
            raise HTTPException(status_code=404, detail="Task not found")
        
        logger.info(f"Task status: {json.dumps(status)}")
        return JSONResponse(status)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/images/{image_name}")
async def get_image(image_name: str):
    """Serve generated images"""
    try:
        image_path = OUTPUTS_DIR / image_name
        logger.info(f"Attempting to serve image: {image_path}")
        
        if not image_path.exists():
            logger.error(f"Image not found: {image_path}")
            raise HTTPException(status_code=404, detail="Image not found")
        
        logger.info(f"Serving image: {image_path}")
        return FileResponse(
            str(image_path),
            media_type="image/png",
            headers={
                "Cache-Control": "public, max-age=3600",
                "Access-Control-Allow-Origin": "*"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
        ws_ping_interval=30,
        ws_ping_timeout=10,
        timeout_keep_alive=65
    )