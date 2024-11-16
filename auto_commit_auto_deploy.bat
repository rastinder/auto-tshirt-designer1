@echo off
setlocal EnableDelayedExpansion

:: Check if a commit message was provided as an argument
if "%~1"=="" (
    set "commit_msg=Auto commit: %date% %time%"
) else (
    set "commit_msg=%~1"
)

echo.
echo === Git Auto Commit and Push Script ===
echo.

:: Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Not a git repository!
    exit /b 1
)

:: Add all changes
echo Adding all changes...
git add .
if %errorlevel% neq 0 (
    echo Error: Failed to add changes!
    exit /b 1
)

:: Commit changes
echo.
echo Committing with message: %commit_msg%
git commit -m "%commit_msg%"
if %errorlevel% neq 0 (
    echo Error: Failed to commit changes!
    exit /b 1
)

:: Push changes
echo.
echo Pushing changes to remote...
git push
if %errorlevel% neq 0 (
    echo Error: Failed to push changes!
    echo Tip: Make sure you have the correct remote repository configured
    exit /b 1
)

echo.
echo === Success! All changes have been committed and pushed ===
echo.

"C:\Program Files\PuTTY\plink.exe" -i "C:\Users\Administrator\Downloads\oracle.ppk" ubuntu@141.148.223.177
sudo su
cd .. && echo "Cleaning up previous installation..." && pm2 delete all 2>/dev/null || true && [ -d "auto-tshirt-designer1" ] && sudo rm -rf auto-tshirt-designer1 && echo "Cloning repository..." && git clone https://github.com/rastinder/auto-tshirt-designer1.git && cd auto-tshirt-designer1 && echo "Starting deployment..." && chmod +x deploy.sh && ./deploy.sh


exit /b 0
