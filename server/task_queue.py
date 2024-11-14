import logging
from datetime import datetime, timedelta
import uuid
from typing import Optional, Dict, List, Tuple, Any
import aiohttp
import asyncio
import os
from pathlib import Path
import base64
from server.models import Task, DesignRequest, TaskStatus
import json
from server.utils import serialize_datetime

logger = logging.getLogger(__name__)

class TaskQueue:
    def __init__(self):
        self.tasks = {}  # type: Dict[str, Task]
        self.pending_tasks = []  # type: List[Task]
        self.processing_tasks = {}  # type: Dict[str, Task]
        self.task_timeout = 300  # 5 minutes
        self.api_url = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-3.5-large"
        self.api_headers = {"Authorization": "Bearer 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"}
        self.api_timeout = 120  # 2 minutes for API requests
        
        # Get root directory and set up outputs directory
        self.root_dir = Path(__file__).parent.parent.resolve()
        self.outputs_dir = self.root_dir / "outputs"
        self.outputs_dir.mkdir(exist_ok=True)
        
        logger.info(f"Outputs directory: {self.outputs_dir}")

    async def save_image(self, image_data: bytes, task_id: str) -> Tuple[str, str]:
        """Save image data to a file and return the filename and base64 data"""
        filename = f"{task_id}.png"
        filepath = self.outputs_dir / filename
        
        # Ensure the directory exists
        self.outputs_dir.mkdir(exist_ok=True)
        
        logger.info(f"Saving image to: {filepath}")
        filepath.write_bytes(image_data)
        
        # Convert to base64
        base64_data = base64.b64encode(image_data).decode('utf-8')
        logger.info(f"Image converted to base64 (length: {len(base64_data)})")
        
        # Verify the file was saved
        if not filepath.exists():
            raise Exception(f"Failed to save image to {filepath}")
            
        logger.info(f"Image saved successfully: {filepath}")
        return filename, base64_data

    async def try_api_generation(self, task: Task) -> Optional[bytes]:
        """Try to generate image using the API first"""
        prompt = task.request.get("prompt", "")
        if not prompt:
            return None

        payload = {
            "inputs": prompt,
            "parameters": {
                "guidance_scale": 7.5,
                "negative_prompt": "blurry, distorted, low quality",
                "num_inference_steps": 30,
                "width": 1024,
                "height": 1024
            }
        }

        timeout = aiohttp.ClientTimeout(total=self.api_timeout)
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(self.api_url, headers=self.api_headers, json=payload) as response:
                    if response.status != 200:
                        logger.warning(f"API request failed with status {response.status}")
                        return None
                    
                    data = await response.content.read()
                    if data and len(data) > 0:
                        logger.info(f"Received image data from API (size: {len(data)} bytes)")
                        return data
                    return None
        except Exception as e:
            logger.error(f"API request failed: {str(e)}")
            return None

    async def add_task(self, request: DesignRequest) -> str:
        task_id = str(uuid.uuid4())
        task = Task(
            id=task_id,
            request=request.dict(),
            status=TaskStatus.PENDING,
            created_at=datetime.utcnow()
        )
        
        self.tasks[task_id] = task
        
        # Try API generation first
        logger.info(f"Attempting API generation for task {task_id}")
        task.status = TaskStatus.PROCESSING
        task.started_at = datetime.utcnow()
        
        api_result = await self.try_api_generation(task)
        if api_result:
            try:
                # Save the image and get base64 data
                filename, base64_data = await self.save_image(api_result, task_id)
                
                # API generation successful
                task.status = TaskStatus.COMPLETED
                task.completed_at = datetime.utcnow()
                task.result = {
                    "image_url": f"/images/{filename}",
                    "image_data": f"data:image/png;base64,{base64_data}",
                    "source": "api"
                }
                logger.info(f"API generation successful for task {task_id}")
            except Exception as e:
                logger.error(f"Failed to save image for task {task_id}: {str(e)}")
                task.status = TaskStatus.FAILED
                task.result = {"error": str(e)}
        else:
            task.status = TaskStatus.FAILED
            task.result = {"error": "API generation failed"}
            logger.info(f"API generation failed for task {task_id}")
        
        return task_id

    async def get_next_task(self) -> Optional[Task]:
        """Get next task and mark it as processing"""
        if not self.pending_tasks:
            return None
            
        task = self.pending_tasks.pop(0)
        self.processing_tasks[task.id] = task
        task.status = TaskStatus.PROCESSING
        task.started_at = datetime.utcnow()
        
        logger.info(f"Task {task.id} moved to processing")
        return task

    async def get_task_status(self, task_id: str) -> Optional[dict]:
        task = self.tasks.get(task_id)
        if not task:
            return None
            
        # Check for stuck tasks
        if (task.status == TaskStatus.PROCESSING and 
            task.started_at and 
            datetime.utcnow() - task.started_at > timedelta(seconds=self.task_timeout)):
            task.status = TaskStatus.FAILED
            task.result = {"error": "Task timed out"}
            if task.id in self.processing_tasks:
                del self.processing_tasks[task.id]
            
        return json.loads(json.dumps({
            "task_id": task.id,
            "status": task.status,
            "created_at": task.created_at,
            "started_at": task.started_at,
            "completed_at": task.completed_at,
            "result": task.result
        }, default=serialize_datetime))

    async def update_task_status(self, task_id: str, status: TaskStatus, result: Optional[dict] = None):
        if task_id not in self.tasks:
            logger.error(f"Task {task_id} not found")
            return

        task = self.tasks[task_id]
        task.status = status
        
        if status == TaskStatus.PROCESSING:
            task.started_at = datetime.utcnow()
        elif status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
            task.completed_at = datetime.utcnow()
            if result:
                task.result = result
            if task_id in self.processing_tasks:
                del self.processing_tasks[task_id]

        logger.info(f"Updated task {task_id} status to {status}")

    async def cleanup_timed_out_tasks(self):
        """Clean up tasks that have timed out"""
        current_time = datetime.utcnow()
        
        for task_id, task in list(self.processing_tasks.items()):
            if (task.started_at and 
                current_time - task.started_at > timedelta(seconds=self.task_timeout)):
                
                task.status = TaskStatus.FAILED
                task.result = {"error": "Task timed out"}
                task.completed_at = current_time
                del self.processing_tasks[task_id]