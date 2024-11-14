from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class DesignRequest(BaseModel):
    prompt: str
    style: Optional[str] = "realistic"
    colors: Optional[List[str]] = []
    size: Optional[str] = "M"
    priority: Optional[int] = Field(1, ge=1, le=5)
    callback_url: Optional[str] = None

class Task(BaseModel):
    id: str
    request: Dict[str, Any]
    status: TaskStatus
    worker_id: Optional[str] = None
    attempts: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None