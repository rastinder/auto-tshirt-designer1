@echo off
setlocal EnableDelayedExpansion

:: Check if a commit message was provided as an argument
if "%~1"=="" (
    set "commit_msg=Auto commit: %date% %time%"
) else (
    set "commit_msg=%~1"
)

echo.
echo === Git Auto Commit and Push Script (Force Push Enabled) ===
echo.

:: Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Not a git repository!
    exit /b 1
)

:: Detect detached HEAD and switch to main
for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD') do set branch=%%B
if "!branch!"=="HEAD" (
    echo Warning: Detached HEAD detected. Switching to 'main'...
    git switch main
    if %errorlevel% neq 0 (
        echo Error: Failed to switch to branch 'main'!
        exit /b 1
    )
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

:: Push changes (force push)
echo.
echo Force pushing changes to remote...
git push --force
if %errorlevel% neq 0 (
    echo Error: Failed to force push changes!
    exit /b 1
)

echo.
echo === Success! All changes have been committed and force-pushed ===
echo.

exit /b 0
