import sys
import subprocess
import pkg_resources
import logging
from pathlib import Path
import torch
import numpy as np
try:
    import tensorflow as tf
except ImportError:
    tf = None
try:
    from torch.utils.cpp_extension import CUDA_HOME
except ImportError:
    CUDA_HOME = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class GPUDiagnostics:
    def __init__(self):
        self.cuda_available = torch.cuda.is_available()
        self.gpu_count = torch.cuda.device_count() if self.cuda_available else 0
        self.cuda_version = torch.version.cuda if self.cuda_available else None
        self.cudnn_version = torch.backends.cudnn.version() if self.cuda_available else None
        self.cuda_home = CUDA_HOME

    def check_nvidia_driver(self):
        try:
            result = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
            return result.stdout
        except FileNotFoundError:
            return "NVIDIA driver not found or nvidia-smi not in PATH"

    def get_gpu_info(self):
        if not self.cuda_available:
            return "No CUDA-capable GPU detected"
        
        info = []
        for i in range(self.gpu_count):
            gpu = torch.cuda.get_device_properties(i)
            info.append({
                'name': gpu.name,
                'compute_capability': f"{gpu.major}.{gpu.minor}",
                'total_memory': f"{gpu.total_memory / 1024**2:.0f} MB",
                'available_memory': f"{torch.cuda.memory_reserved(i) / 1024**2:.0f} MB",
                'multi_processor_count': gpu.multi_processor_count
            })
        return info

    def check_torch_cuda(self):
        return {
            'torch_version': torch.__version__,
            'cuda_available': self.cuda_available,
            'cuda_version': self.cuda_version,
            'cudnn_version': self.cudnn_version,
            'cuda_home': self.cuda_home,
            'gpu_count': self.gpu_count
        }

    def check_tensorflow_gpu(self):
        if tf is None:
            return "TensorFlow not installed"
        
        return {
            'tf_version': tf.__version__,
            'gpu_available': len(tf.config.list_physical_devices('GPU')) > 0,
            'devices': [device.device_type for device in tf.config.list_physical_devices()]
        }

    def check_package_versions(self):
        packages = [
            'torch', 'torchvision', 'diffusers', 'transformers',
            'accelerate', 'tensorflow', 'numpy', 'pillow'
        ]
        
        versions = {}
        for package in packages:
            try:
                version = pkg_resources.get_distribution(package).version
                versions[package] = version
            except pkg_resources.DistributionNotFound:
                versions[package] = "Not installed"
        
        return versions

    def run_gpu_test(self):
        if not self.cuda_available:
            return "Cannot run GPU test - CUDA not available"
        
        try:
            # Test PyTorch GPU
            x = torch.randn(1000, 1000).cuda()
            y = torch.matmul(x, x)
            del x, y
            torch.cuda.empty_cache()
            return "GPU test successful"
        except Exception as e:
            return f"GPU test failed: {str(e)}"

def main():
    logger.info("Starting GPU diagnostics...")
    diag = GPUDiagnostics()

    # Check NVIDIA driver
    logger.info("\n=== NVIDIA Driver ===")
    logger.info(diag.check_nvidia_driver())

    # Check GPU Info
    logger.info("\n=== GPU Information ===")
    gpu_info = diag.get_gpu_info()
    if isinstance(gpu_info, str):
        logger.info(gpu_info)
    else:
        for i, gpu in enumerate(gpu_info):
            logger.info(f"GPU {i}:")
            for key, value in gpu.items():
                logger.info(f"  {key}: {value}")

    # Check PyTorch CUDA
    logger.info("\n=== PyTorch CUDA Status ===")
    torch_info = diag.check_torch_cuda()
    for key, value in torch_info.items():
        logger.info(f"{key}: {value}")

    # Check TensorFlow
    logger.info("\n=== TensorFlow Status ===")
    tf_info = diag.check_tensorflow_gpu()
    if isinstance(tf_info, str):
        logger.info(tf_info)
    else:
        for key, value in tf_info.items():
            logger.info(f"{key}: {value}")

    # Check Package Versions
    logger.info("\n=== Package Versions ===")
    versions = diag.check_package_versions()
    for package, version in versions.items():
        logger.info(f"{package}: {version}")

    # Run GPU Test
    logger.info("\n=== GPU Test ===")
    logger.info(diag.run_gpu_test())

    # Provide recommendations
    logger.info("\n=== Recommendations ===")
    if not diag.cuda_available:
        logger.info("CUDA is not available. Consider:")
        logger.info("1. Installing NVIDIA drivers")
        logger.info("2. Installing CUDA Toolkit")
        logger.info("3. Reinstalling PyTorch with CUDA support:")
        logger.info("   pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu118")
    else:
        logger.info("GPU setup appears to be working correctly")

    # Log GPU information periodically (every 60 seconds)
    import time
    while True:
        time.sleep(60)
        logger.info("\n=== Periodic GPU Information ===")
        gpu_info = diag.get_gpu_info()
        if isinstance(gpu_info, str):
            logger.info(gpu_info)
        else:
            for i, gpu in enumerate(gpu_info):
                logger.info(f"GPU {i}:")
                for key, value in gpu.items():
                    logger.info(f"  {key}: {value}")

if __name__ == "__main__":
    main()
