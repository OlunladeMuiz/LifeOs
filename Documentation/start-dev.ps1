# LifeOS Development Startup Script
# This script starts both backend and frontend in separate windows

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "  LifeOS Development Environment" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$backendPath = "$PSScriptRoot\backend"
$frontendPath = "$PSScriptRoot\frontend"

# Stop any existing processes on ports 3000 and 3001
Write-Host "Stopping existing processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Compile backend TypeScript
Write-Host "Compiling backend..." -ForegroundColor Yellow
Push-Location $backendPath
npx tsc --build 2>$null
Pop-Location

# Start Backend in new SEPARATE window (critical for stability)
Write-Host "Starting Backend on http://localhost:3001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; `$Host.UI.RawUI.WindowTitle = 'LifeOS Backend'; Write-Host 'LifeOS Backend - Port 3001' -ForegroundColor Green; Write-Host ''; node dist/index.js"

Start-Sleep -Seconds 4

# Start Frontend in new SEPARATE window
Write-Host "Starting Frontend on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; `$Host.UI.RawUI.WindowTitle = 'LifeOS Frontend'; Write-Host 'LifeOS Frontend - Port 3000' -ForegroundColor Blue; Write-Host ''; npm run dev"

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "  Servers Starting!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Two new PowerShell windows opened for each server." -ForegroundColor Yellow
Write-Host "Close those windows to stop the servers." -ForegroundColor Yellow
