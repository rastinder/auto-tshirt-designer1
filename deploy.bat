@echo off
echo Deploying AI T-Shirt Generator Website and Server...

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed. Please install Node.js 18.x or later from https://nodejs.org/
    exit /b 1
)

:: Create and activate Python virtual environment
echo Creating Python virtual environment...
python -m venv venv
call venv\Scripts\activate.bat

:: Install server requirements
echo Installing server requirements...
pip install -r requirements.txt
pip install -r server/requirements.txt

:: Install Node.js dependencies and build frontend
echo Installing Node.js dependencies...
call npm install

:: Install PM2 globally if not installed
where pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing PM2...
    call npm install -g pm2
)

:: Build the frontend
echo Building frontend...
call npm run build

:: Configure PM2 and start services
echo Configuring PM2...
pm2 delete all 2>nul
pm2 start ecosystem.config.cjs

:: Display success message and next steps
echo.
echo Deployment completed successfully!
echo.
echo The following services are now running:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:8000
echo.
echo To monitor the services, use: pm2 monit
echo To stop all services, use: pm2 stop all
echo To view logs, use: pm2 logs
echo.
pause
