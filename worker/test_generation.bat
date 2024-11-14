@echo off
echo Testing Stable Diffusion Image Generation
echo =======================================

REM Activate virtual environment if it exists
if exist "worker_env\Scripts\activate.bat" (
    call worker_env\Scripts\activate.bat
) else (
    echo Virtual environment not found!
    echo Please run setup_worker_gpu.bat first
    pause
    exit /b 1
)

REM Run the test script
echo Running test generation...
python test_generation.py

REM Check if the test was successful
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Test completed successfully!
    echo Check the test_outputs folder for the generated image
) else (
    echo.
    echo Test failed! Please check the error messages above
)

pause