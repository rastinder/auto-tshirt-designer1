from typing import Dict, List, Optional
from datetime import datetime, timedelta
import logging
from .models import WorkerStatus

logger = logging.getLogger(__name__)

class LoadBalancer:
    def __init__(self):
        self.workers: Dict[str, WorkerStatus] = {}
        self.heartbeat_timeout = 30  # seconds

    def update_worker_status(self, worker_id: str, status: WorkerStatus):
        status.last_heartbeat = datetime.utcnow()
        self.workers[worker_id] = status
        logger.info(f"Updated status for worker {worker_id}")

    def remove_worker(self, worker_id: str):
        self.workers.pop(worker_id, None)
        logger.info(f"Removed worker {worker_id}")

    def get_available_worker(self) -> Optional[str]:
        current_time = datetime.utcnow()
        available_workers = []

        for worker_id, status in self.workers.items():
            # Check if worker is active and not timed out
            if (status.available and 
                not status.current_task and 
                current_time - status.last_heartbeat <= timedelta(seconds=self.heartbeat_timeout)):
                
                # Calculate worker score based on performance metrics
                score = self._calculate_worker_score(status)
                available_workers.append((worker_id, score))

        if not available_workers:
            return None

        # Return worker with best score
        return max(available_workers, key=lambda x: x[1])[0]

    def _calculate_worker_score(self, status: WorkerStatus) -> float:
        # Higher score is better
        # Consider GPU utilization (lower is better) and success rate
        gpu_score = 1 - status.gpu_utilization
        success_rate = (status.tasks_completed / (status.tasks_completed + status.errors)) if (status.tasks_completed + status.errors) > 0 else 0
        memory_score = status.memory_available

        # Weighted average of factors
        return (0.4 * gpu_score + 0.4 * success_rate + 0.2 * memory_score)

    def get_worker_statuses(self) -> List[dict]:
        current_time = datetime.utcnow()
        return [
            {
                "worker_id": worker_id,
                "status": status.dict(),
                "active": (current_time - status.last_heartbeat <= timedelta(seconds=self.heartbeat_timeout))
            }
            for worker_id, status in self.workers.items()
        ]