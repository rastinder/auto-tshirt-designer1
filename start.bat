@echo off
echo Starting AI T-Shirt Generator Website and Server...

:: Start the Python backend server in a new window
start cmd /k "call venv\Scripts\activate.bat && python -m uvicorn server.main:app --host 0.0.0.0 --port 8000"

:: Start the frontend in a new window
start cmd /k "npm run dev"

echo Services started:
echo - Frontend: http://localhost:5173 (development mode)
echo - Backend API: http://localhost:8000
echo.
echo Press any key to stop all services...
pause >nul

:: Kill all node and Python processes (be careful with this in a production environment)
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
