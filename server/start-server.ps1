# OpenRouter Dashboard - Server Start Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OpenRouter Cost Dashboard - Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Starting server on http://localhost:3001" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

npx tsx src/server.ts
