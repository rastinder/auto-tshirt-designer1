import psutil
import logging
from datetime import datetime
import os

logger = logging.getLogger(__name__)

class WorkerMonitor:
    def __init__(self):
        self.current_task = None
        self.tasks_completed = 0
        self.errors = 0
        self.start_time = datetime.utcnow()
        self.has_gpu = self._check_gpu_availability()
        
        # Log system info at startup
        self._log_system_info()

    def _check_gpu_availability(self):
        """Check if GPU monitoring is available"""
        try:
            import torch
            has_gpu = torch.cuda.is_available()
            if has_gpu:
                logger.info(f"GPU detected: {torch.cuda.get_device_name(0)}")
            else:
                logger.info("No GPU detected, running in CPU-only mode")
            return has_gpu
        except ImportError:
            logger.info("PyTorch not available, running in CPU-only mode")
            return False
        except Exception as e:
            logger.info(f"GPU monitoring disabled: {str(e)}")
            return False

    def _log_system_info(self):
        """Log system information at startup"""
        try:
            logger.info("=== System Information ===")
            logger.info(f"OS: Windows")
            logger.info(f"CPU Cores: {psutil.cpu_count()}")
            memory = psutil.virtual_memory()
            logger.info(f"Total Memory: {memory.total / (1024**3):.1f} GB")
            
            if self.has_gpu:
                import torch
                logger.info(f"CUDA Version: {torch.version.cuda}")
                logger.info(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / (1024**3):.1f} GB")
        except Exception as e:
            logger.error(f"Error logging system info: {str(e)}")

    def _get_gpu_metrics(self):
        """Get GPU metrics if available"""
        if not self.has_gpu:
            return {
                'gpu_utilization': 0.0,
                'gpu_memory_used': 0.0,
                'gpu_memory_total': 0.0
            }

        try:
            import torch
            gpu_props = torch.cuda.get_device_properties(0)
            memory_allocated = torch.cuda.memory_allocated(0)
            memory_total = gpu_props.total_memory
            
            return {
                'gpu_utilization': memory_allocated / memory_total * 100,
                'gpu_memory_used': memory_allocated / 1024**3,  # GB
                'gpu_memory_total': memory_total / 1024**3  # GB
            }
        except Exception as e:
            logger.debug(f"Could not get GPU metrics: {str(e)}")
            return {
                'gpu_utilization': 0.0,
                'gpu_memory_used': 0.0,
                'gpu_memory_total': 0.0
            }

    def start_task(self, task_id):
        """Record the start of a task"""
        self.current_task = task_id
        logger.info(f"Started task: {task_id}")

    def complete_task(self, task_id):
        """Record the completion of a task"""
        self.tasks_completed += 1
        self.current_task = None
        logger.info(f"Completed task: {task_id}")

    def fail_task(self, task_id):
        """Record a task failure"""
        self.errors += 1
        self.current_task = None
        logger.info(f"Failed task: {task_id}")

    def get_status(self):
        """Get current worker status"""
        try:
            # Get system metrics
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            
            # Get GPU metrics
            gpu_metrics = self._get_gpu_metrics()

            # Calculate uptime
            uptime = (datetime.utcnow() - self.start_time).total_seconds()

            return {
                'timestamp': datetime.utcnow().isoformat(),
                'cpu_percent': cpu_percent,
                'memory_used_percent': memory.percent,
                'memory_available_gb': memory.available / 1024**3,
                'gpu_available': self.has_gpu,
                **gpu_metrics,
                'current_task': self.current_task,
                'tasks_completed': self.tasks_completed,
                'errors': self.errors,
                'uptime': uptime,
                'status': 'busy' if self.current_task else 'ready'
            }

        except Exception as e:
            logger.error(f"Error getting worker status: {str(e)}")
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'status': 'error',
                'error': str(e)
            }