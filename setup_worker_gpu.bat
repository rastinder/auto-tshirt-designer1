@echo off
setlocal enabledelayedexpansion

echo Starting GPU Worker Setup...

:: Check if NVIDIA driver is installed
where nvidia-smi >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo NVIDIA driver not found! Please install NVIDIA drivers first.
    exit /b 1
)

:: Check CUDA availability
echo.
echo Checking CUDA...
nvidia-smi
for /f "tokens=3" %%i in ('nvidia-smi ^| findstr "CUDA Version"') do set CUDA_VERSION=%%i
echo Detected CUDA Version: %CUDA_VERSION%

:: Create virtual environment
echo.
echo Creating Python virtual environment...
python -m venv worker_env
call worker_env\Scripts\activate.bat

:: Upgrade pip
echo.
echo Upgrading pip...
python -m pip install --upgrade pip

:: Install PyTorch with CUDA support
echo.
echo Installing PyTorch with CUDA support...
pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu118

:: Install other dependencies
echo.
echo Installing other dependencies...
pip install diffusers==0.25.0^
 transformers==4.36.0^
 accelerate==0.25.0^
 safetensors==0.4.1^
 huggingface-hub==0.20.1^
 websockets==11.0.3^
 python-dotenv==1.0.0^
 numpy==1.24.0^
 pillow==10.0.0^
 tqdm==4.65.0^
 psutil==5.9.0

:: Create necessary directories
echo.
echo Creating directories...
mkdir model_cache 2>nul
mkdir outputs 2>nul
mkdir logs 2>nul

:: Run GPU diagnostics
echo.
echo Running GPU diagnostics...
python worker/check_gpu.py

echo.
echo Setup complete!
echo Next steps:
echo 1. Edit worker\.env file with your server URL
echo 2. Run the worker: python worker/main.py

pause