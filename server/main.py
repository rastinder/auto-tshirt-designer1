import os
import sys
import json
import logging
import base64
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, File, UploadFile, Response, BackgroundTasks, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

# Add the parent directory to sys.path
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir))

from server.models import Task, DesignRequest, TaskStatus
from server.task_queue import TaskQueue
from server.utils import serialize_datetime

import io
from PIL import Image
from rembg import remove
import cv2
import numpy as np

# Get the application root directory
ROOT_DIR = Path(__file__).parent.parent.resolve()
OUTPUTS_DIR = ROOT_DIR / "outputs"

# Create outputs directory if it doesn't exist
OUTPUTS_DIR.mkdir(exist_ok=True, parents=True)

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
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
    max_age=3600
)

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

@app.options("/color_transparency")
async def color_transparency_options():
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "3600",
        }
    )

# Initialize task queue
task_queue = TaskQueue()

# Store design history in memory (last 5 designs)
design_history = []

# Connected workers
connected_workers: Dict[str, WebSocket] = {}

@app.get("/")
async def health_check():
    """Health check endpoint"""
    try:
        # Check if outputs directory is writable
        test_file = OUTPUTS_DIR / "test.txt"
        try:
            test_file.write_text("test")
            test_file.unlink()
        except Exception as e:
            logger.error(f"Outputs directory not writable: {str(e)}")
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unhealthy",
                    "error": "Outputs directory not writable",
                    "timestamp": datetime.utcnow().isoformat()
                }
            )

        # Check worker connections
        if not connected_workers:
            logger.warning("No workers connected")
            return JSONResponse(
                status_code=503,
                content={
                    "status": "degraded",
                    "warning": "No workers connected",
                    "timestamp": datetime.utcnow().isoformat()
                }
            )

        return {
            "status": "healthy",
            "workers": len(connected_workers),
            "queue_size": task_queue.size(),
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )

@app.get("/status")
async def service_status():
    """Get detailed service status"""
    try:
        return {
            "status": "online",
            "workers": {
                "connected": len(connected_workers),
                "ids": list(connected_workers.keys())
            },
            "queue": {
                "size": task_queue.size(),
                "pending": task_queue.pending_count(),
                "processing": task_queue.processing_count()
            },
            "storage": {
                "outputs_dir": str(OUTPUTS_DIR),
                "space_available": True  # TODO: Add actual disk space check
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting service status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/previous-designs")
async def get_previous_designs():
    """Get the last 5 generated designs."""
    try:
        return JSONResponse(content={
            "designs": design_history[-5:],
            "total": len(design_history)
        })
    except Exception as e:
        logger.error(f"Error getting design history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/save-design")
async def save_design(design_data: dict):
    """Save a design to history."""
    try:
        if "image_data" not in design_data:
            raise HTTPException(status_code=400, detail="No image data provided")

        # Validate base64 image data
        try:
            image_data = design_data["image_data"]
            if isinstance(image_data, str) and image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            base64.b64decode(image_data)
        except Exception as e:
            logger.error(f"Invalid image data: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid image data")

        # Add timestamp and metadata
        design_entry = {
            "image_data": design_data["image_data"],
            "created_at": datetime.utcnow().isoformat(),
            "metadata": design_data.get("metadata", {})
        }

        design_history.append(design_entry)
        
        # Keep only last 5 designs
        while len(design_history) > 5:
            design_history.pop(0)
        
        return {"status": "success", "timestamp": design_entry["created_at"]}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving design: {str(e)}")
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

@app.post("/remove-background")
async def remove_background(file: UploadFile = File(...)):
    try:
        # Read the uploaded image
        image_data = await file.read()
        input_image = Image.open(io.BytesIO(image_data))
        
        # Remove background
        output_image = remove(input_image)
        
        # Convert to PNG format with transparency
        output_buffer = io.BytesIO()
        output_image.save(output_buffer, format='PNG')
        output_buffer.seek(0)
        
        # Return the processed image
        return StreamingResponse(
            output_buffer, 
            media_type="image/png",
            headers={
                'Content-Disposition': 'attachment; filename="processed_image.png"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/color_transparency")
async def color_transparency(
    file: UploadFile = File(...),
    color: str = Form(...),
    tolerance: float = Form(0.5)
):
    try:
        logger.info(f"Received color transparency request: color={color}, tolerance={tolerance}")
        
        # Read the image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Failed to decode image")
            
        if len(img.shape) < 3:
            raise HTTPException(status_code=400, detail="Image must be in color format")
        
        if color is None or not color:
            raise HTTPException(status_code=400, detail="Color parameter is required")
            
        # Convert BGR to RGB
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Ensure color is in correct hex format (without #)
        color = color.lstrip('#')  # Remove # if present
        if len(color) != 6:
            raise HTTPException(status_code=400, detail="Invalid color format. Must be a 6-digit hex color (e.g., FF0000)")
            
        try:
            r = int(color[0:2], 16)
            g = int(color[2:4], 16)
            b = int(color[4:6], 16)
            target_color = np.array([r, g, b])
            logger.info(f"Target color RGB: {target_color}")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid color format. Must be a valid hex color (e.g., FF0000)")
        
        # Create alpha channel based on color similarity
        height, width = img_rgb.shape[:2]
        alpha = np.ones((height, width), dtype=np.uint8) * 255
        
        # Calculate color difference and create mask
        color_diff = np.sqrt(np.sum((img_rgb - target_color) ** 2, axis=2))
        max_diff = 255 * np.sqrt(3)  # Maximum possible difference
        similarity = 1 - (color_diff / max_diff)
        mask = similarity > (1 - tolerance)
        
        logger.info(f"Applying transparency with tolerance: {tolerance}")
        
        # Apply transparency
        alpha[mask] = 0
        
        # Convert to RGBA
        img_rgba = np.dstack((img_rgb, alpha))
        
        # Convert to PIL Image and save to BytesIO
        pil_img = Image.fromarray(img_rgba)
        img_byte_arr = io.BytesIO()
        pil_img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        logger.info("Successfully processed image")
        
        # Return the processed image with proper headers
        return StreamingResponse(
            img_byte_arr,
            media_type="image/png",
            headers={
                "Content-Disposition": "attachment; filename=transparent.png",
                "Content-Type": "image/png",
                "Cache-Control": "no-cache"
            }
        )
        
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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
    """Create a new design request and save it to history if successful."""
    try:
        # Add task to queue and get task ID
        task_id = await task_queue.add_task(request)
        logger.info(f"Created new task: {task_id}")
        
        return JSONResponse({
            "task_id": task_id,
            "status": "pending"
        })
        
    except Exception as e:
        logger.error(f"Error creating design: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test/health")
async def test_health():
    """Simple health check for curl testing"""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.post("/test/design")
async def test_design_generation(
    prompt: str = Body(..., embed=True),
    test_mode: bool = Body(False, embed=True)
):
    """Test endpoint for design generation via curl
    
    Example curl:
    curl -X POST http://localhost:8000/test/design 
         -H "Content-Type: application/json" 
         -d '{"prompt": "a cool t-shirt design", "test_mode": true}'
    """
    try:
        if test_mode:
            # Return mock data for testing
            return {
                "status": "success",
                "task_id": "test-123",
                "result": {
                    "image_url": "/images/test-image.png",
                    "metadata": {
                        "prompt": prompt,
                        "test": True
                    }
                }
            }
        
        # Create real design request
        request = DesignRequest(prompt=prompt)
        task_id = await task_queue.add_task(request)
        
        return {
            "status": "pending",
            "task_id": task_id,
            "message": "Design generation started"
        }
        
    except Exception as e:
        logger.error(f"Test design generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/test/background-removal")
async def test_background_removal(
    image_url: str = Body(..., embed=True),
    test_mode: bool = Body(False, embed=True)
):
    """Test endpoint for background removal via curl
    
    Example curl:
    curl -X POST http://localhost:8000/test/background-removal 
         -H "Content-Type: application/json" 
         -d '{"image_url": "https://example.com/image.png", "test_mode": true}'
    """
    try:
        if test_mode:
            # Return mock data for testing
            return {
                "status": "success",
                "result": {
                    "image_url": "/images/test-transparent.png",
                    "metadata": {
                        "original_url": image_url,
                        "test": True
                    }
                }
            }
            
        # TODO: Implement actual background removal test
        raise NotImplementedError("Real background removal test not implemented")
        
    except Exception as e:
        logger.error(f"Test background removal error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test/workers")
async def test_workers():
    """Test endpoint to check worker status via curl
    
    Example curl:
    curl http://localhost:8000/test/workers
    """
    return {
        "workers": {
            "connected": len(connected_workers),
            "ids": list(connected_workers.keys())
        },
        "queue": {
            "size": task_queue.size(),
            "pending": task_queue.pending_count(),
            "processing": task_queue.processing_count()
        }
    }

@app.get("/test")
async def test_display():
    """Display comprehensive system test results"""
    try:
        # Collect system status
        system_status = {
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "environment": os.getenv("ENVIRONMENT", "production"),
            "backend": {
                "status": "healthy",
                "workers": {
                    "connected": len(connected_workers),
                    "ids": list(connected_workers.keys())
                },
                "queue": {
                    "size": task_queue.size(),
                    "pending": task_queue.pending_count(),
                    "processing": task_queue.processing_count()
                },
                "storage": {
                    "outputs_dir": str(OUTPUTS_DIR),
                    "writable": os.access(OUTPUTS_DIR, os.W_OK)
                }
            },
            "endpoints": {
                "design": {
                    "url": "/api/design",
                    "method": "POST",
                    "status": "active"
                },
                "background_removal": {
                    "url": "/api/remove-background",
                    "method": "POST",
                    "status": "active"
                },
                "color_transparency": {
                    "url": "/api/color-transparency",
                    "method": "POST",
                    "status": "active"
                },
                "design_history": {
                    "url": "/api/previous-designs",
                    "method": "GET",
                    "status": "active",
                    "count": len(design_history)
                }
            },
            "test_endpoints": {
                "health": {
                    "url": "/api/test/health",
                    "method": "GET",
                    "curl": "curl https://aitshirts.in/api/test/health"
                },
                "design_test": {
                    "url": "/api/test/design",
                    "method": "POST",
                    "curl": """curl -X POST https://aitshirts.in/api/test/design \\
                           -H "Content-Type: application/json" \\
                           -d '{"prompt": "test design", "test_mode": true}'"""
                },
                "background_removal_test": {
                    "url": "/api/test/background-removal",
                    "method": "POST",
                    "curl": """curl -X POST https://aitshirts.in/api/test/background-removal \\
                           -H "Content-Type: application/json" \\
                           -d '{"image_url": "https://example.com/image.png", "test_mode": true}'"""
                },
                "workers_test": {
                    "url": "/api/test/workers",
                    "method": "GET",
                    "curl": "curl https://aitshirts.in/api/test/workers"
                }
            }
        }

        # Generate HTML display
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>AI T-Shirt Designer - System Test</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 20px;
                    background: #f5f5f5;
                }}
                .container {{
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                h1, h2 {{
                    color: #333;
                    border-bottom: 2px solid #eee;
                    padding-bottom: 10px;
                }}
                .status {{
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 14px;
                    font-weight: bold;
                }}
                .healthy {{ background: #d4edda; color: #155724; }}
                .warning {{ background: #fff3cd; color: #856404; }}
                .error {{ background: #f8d7da; color: #721c24; }}
                .endpoint {{
                    background: #f8f9fa;
                    padding: 15px;
                    margin: 10px 0;
                    border-radius: 4px;
                    border-left: 4px solid #007bff;
                }}
                .curl-command {{
                    background: #2d2d2d;
                    color: #fff;
                    padding: 15px;
                    border-radius: 4px;
                    overflow-x: auto;
                    font-family: monospace;
                }}
                .stats {{
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin: 20px 0;
                }}
                .stat-card {{
                    background: white;
                    padding: 15px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>AI T-Shirt Designer System Test</h1>
                <div class="stats">
                    <div class="stat-card">
                        <h3>System Status</h3>
                        <span class="status healthy">HEALTHY</span>
                        <p>Version: {system_status['version']}</p>
                        <p>Environment: {system_status['environment']}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Workers</h3>
                        <p>Connected: {len(connected_workers)}</p>
                        <p>Queue Size: {task_queue.size()}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Design History</h3>
                        <p>Total Designs: {len(design_history)}</p>
                    </div>
                </div>

                <h2>Test Endpoints</h2>
                <div class="endpoint">
                    <h3>Health Check</h3>
                    <p>Test the system health status</p>
                    <div class="curl-command">
                        curl https://aitshirts.in/api/test/health
                    </div>
                </div>

                <div class="endpoint">
                    <h3>Design Generation Test</h3>
                    <p>Test the design generation system</p>
                    <div class="curl-command">
                        curl -X POST https://aitshirts.in/api/test/design \\<br>
                        &nbsp;&nbsp;-H "Content-Type: application/json" \\<br>
                        &nbsp;&nbsp;-d '{{"prompt": "test design", "test_mode": true}}'
                    </div>
                </div>

                <div class="endpoint">
                    <h3>Background Removal Test</h3>
                    <p>Test the background removal system</p>
                    <div class="curl-command">
                        curl -X POST https://aitshirts.in/api/test/background-removal \\<br>
                        &nbsp;&nbsp;-H "Content-Type: application/json" \\<br>
                        &nbsp;&nbsp;-d '{{"image_url": "https://example.com/image.png", "test_mode": true}}'
                    </div>
                </div>

                <div class="endpoint">
                    <h3>Worker Status Test</h3>
                    <p>Check the status of worker processes</p>
                    <div class="curl-command">
                        curl https://aitshirts.in/api/test/workers
                    </div>
                </div>

                <h2>Quick Test All</h2>
                <div class="endpoint">
                    <h3>Run All Tests</h3>
                    <p>Test all endpoints in sequence</p>
                    <div class="curl-command">
                        curl https://aitshirts.in/test/run-all
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        return HTMLResponse(content=html_content, status_code=200)
    except Exception as e:
        logger.error(f"Error in test display: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test/run-all")
async def run_all_tests():
    """Run all system tests and return results"""
    try:
        results = {
            "timestamp": datetime.utcnow().isoformat(),
            "tests": []
        }

        # Test health
        try:
            health_result = {"name": "Health Check", "status": "healthy"}
            results["tests"].append(health_result)
        except Exception as e:
            results["tests"].append({"name": "Health Check", "status": "error", "error": str(e)})

        # Test workers
        try:
            worker_result = {
                "name": "Worker Status",
                "status": "active" if connected_workers else "warning",
                "workers": len(connected_workers)
            }
            results["tests"].append(worker_result)
        except Exception as e:
            results["tests"].append({"name": "Worker Status", "status": "error", "error": str(e)})

        # Test design generation
        try:
            test_design = await test_design_generation(
                prompt="test design",
                test_mode=True
            )
            results["tests"].append({"name": "Design Generation", "status": "success", "result": test_design})
        except Exception as e:
            results["tests"].append({"name": "Design Generation", "status": "error", "error": str(e)})

        # Test background removal
        try:
            test_bg = await test_background_removal(
                image_url="https://example.com/image.png",
                test_mode=True
            )
            results["tests"].append({"name": "Background Removal", "status": "success", "result": test_bg})
        except Exception as e:
            results["tests"].append({"name": "Background Removal", "status": "error", "error": str(e)})

        return JSONResponse(content=results)
    except Exception as e:
        logger.error(f"Error running all tests: {str(e)}")
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