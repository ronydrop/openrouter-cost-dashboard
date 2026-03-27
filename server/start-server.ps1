# OpenRouter Dashboard Server Startup Script
param(
    [string]$Port = "3001"
)

$ErrorActionPreference = "Continue"

# Kill existing process on port
$process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($process) {
    Write-Host "Stopping existing process on port $Port..."
    Stop-Process -Id $process.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Navigate to server directory
Set-Location $PSScriptRoot

# Start server using Node directly
Write-Host "Starting OpenRouter Dashboard Server..."
Write-Host ""

try {
    node --loader tsx --no-warnings src/server.ts
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Make sure Node.js is installed and dependencies are loaded." -ForegroundColor Yellow
    Write-Host "Run 'npm install' first." -ForegroundColor Yellow
}
