import logging
from datetime import datetime, timedelta
import uuid
from typing import Optional, Dict, List
from models import Task, DesignRequest, TaskStatus
import json
from utils import serialize_datetime

logger = logging.getLogger(__name__)

class TaskQueue:
    def __init__(self):
        self.tasks: Dict[str, Task] = {}
        self.pending_tasks: List[Task] = []
        self.processing_tasks: Dict[str, Task] = {}
        self.task_timeout = 300  # 5 minutes

    async def add_task(self, request: DesignRequest) -> str:
        task_id = str(uuid.uuid4())
        task = Task(
            id=task_id,
            request=request.dict(),
            status=TaskStatus.PENDING,
            created_at=datetime.utcnow()
        )
        
        self.tasks[task_id] = task
        self.pending_tasks.append(task)
        
        logger.info(f"Added task {task_id} to queue")
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