from typing import Dict, List
import logging
from datetime import datetime, timedelta
import json
from collections import deque

logger = logging.getLogger(__name__)

class SystemMonitor:
    def __init__(self):
        self.metrics_history = deque(maxlen=1000)  # Keep last 1000 metrics points
        self.worker_metrics: Dict[str, List[dict]] = {}
        
    def update_system_metrics(self, metrics: dict):
        self.metrics_history.append({
            **metrics,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Log metrics for monitoring
        logger.info(f"System metrics updated: {json.dumps(metrics)}")

    def update_worker_metrics(self, worker_id: str, metrics: dict):
        if worker_id not in self.worker_metrics:
            self.worker_metrics[worker_id] = deque(maxlen=100)  # Keep last 100 metrics per worker
            
        self.worker_metrics[worker_id].append({
            **metrics.dict(),
            "timestamp": datetime.utcnow().isoformat()
        })

    def get_metrics(self) -> dict:
        current_time = datetime.utcnow()
        
        # Calculate system-wide metrics
        system_metrics = self._calculate_system_metrics()
        
        # Calculate per-worker metrics
        worker_metrics = {}
        for worker_id, metrics in self.worker_metrics.items():
            worker_metrics[worker_id] = self._calculate_worker_metrics(metrics)

        return {
            "system": system_metrics,
            "workers": worker_metrics,
            "timestamp": current_time.isoformat()
        }

    def _calculate_system_metrics(self) -> dict:
        if not self.metrics_history:
            return {}

        # Calculate metrics for different time windows
        windows = {
            "1m": timedelta(minutes=1),
            "5m": timedelta(minutes=5),
            "1h": timedelta(hours=1)
        }

        metrics = {}
        current_time = datetime.utcnow()

        for window_name, delta in windows.items():
            window_start = current_time - delta
            window_metrics = [
                m for m in self.metrics_history
                if datetime.fromisoformat(m["timestamp"]) >= window_start
            ]

            if window_metrics:
                metrics[window_name] = {
                    "avg_queue_length": sum(m["queue_length"] for m in window_metrics) / len(window_metrics),
                    "max_queue_length": max(m["queue_length"] for m in window_metrics),
                    "avg_active_workers": sum(m["active_workers"] for m in window_metrics) / len(window_metrics)
                }

        return metrics

    def _calculate_worker_metrics(self, metrics: List[dict]) -> dict:
        if not metrics:
            return {}

        recent_metrics = [
            m for m in metrics
            if datetime.fromisoformat(m["timestamp"]) >= datetime.utcnow() - timedelta(minutes=5)
        ]

        if not recent_metrics:
            return {}

        return {
            "avg_gpu_utilization": sum(m["gpu_utilization"] for m in recent_metrics) / len(recent_metrics),
            "avg_memory_available": sum(m["memory_available"] for m in recent_metrics) / len(recent_metrics),
            "tasks_completed": recent_metrics[-1]["tasks_completed"],
            "errors": recent_metrics[-1]["errors"],
            "current_task": recent_metrics[-1].get("current_task"),
            "last_heartbeat": recent_metrics[-1]["timestamp"]
        }