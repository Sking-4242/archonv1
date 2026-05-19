@echo off
REM Run this once from the project root to initialize the git repo and make the first commit.
REM Then add your GitHub remote and push.

echo Cleaning up any stale git lock files...
if exist ".git\config.lock" del /f ".git\config.lock"
if exist ".git\index.lock" del /f ".git\index.lock"

echo Initializing git repo...
git init -b main

echo Configuring line endings...
git config core.autocrlf false

echo Staging all files...
git add -A

echo Files to be committed:
git status

echo.
echo Ready to commit. Run:
echo   git commit -m "Initial commit: Archon v0.1.0"
echo.
echo Then add your GitHub remote and push:
echo   git remote add origin https://github.com/YOUR_USERNAME/archon.git
echo   git push -u origin main
echo.
pause
