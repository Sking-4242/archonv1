# Archon — one-time GitHub setup script
# Run from the project root in Windows Terminal (PowerShell):
#   .\git_init.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "`nArchon GitHub Setup" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

# Remove any broken .git directory left by a previous attempt
if (Test-Path ".git") {
    Write-Host "Removing stale .git directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".git"
}

# Initialize a fresh repo on 'main'
Write-Host "Initializing git repository..." -ForegroundColor White
git init -b main

# Normalize line endings per .gitattributes
git config core.autocrlf false

# Stage everything (.gitignore will exclude .env, node_modules, *.pdf, etc.)
Write-Host "Staging files..." -ForegroundColor White
git add -A

Write-Host "`nFiles staged for initial commit:" -ForegroundColor Green
git status --short

# Make the initial commit
Write-Host "`nCreating initial commit..." -ForegroundColor White
git commit -m "Initial commit: Archon v0.1.0"

Write-Host "`nDone! Now push to GitHub:" -ForegroundColor Green
Write-Host "  1. Create a new repo at https://github.com/new (don't add README or .gitignore)" -ForegroundColor White
Write-Host "  2. Run these two commands:" -ForegroundColor White
Write-Host ""
Write-Host "     git remote add origin https://github.com/YOUR_USERNAME/archon.git" -ForegroundColor Yellow
Write-Host "     git push -u origin main" -ForegroundColor Yellow
Write-Host ""
