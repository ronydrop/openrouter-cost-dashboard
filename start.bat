@echo off
title OpenRouter Cost Dashboard

echo ==========================================
echo   OpenRouter Cost Dashboard - Starting
echo ==========================================
echo.

REM Kill processes on ports 3001 and 5173
echo Cleaning ports...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /F /PID %%a >nul 2>&1

REM Wait a bit
timeout /t 2 /nobreak >nul

REM Check if node_modules exists
if not exist "server\node_modules" (
    echo Installing server dependencies...
    cd server
    call npm install
    cd ..
)

if not exist "client\node_modules" (
    echo Installing client dependencies...
    cd client
    call npm install
    cd ..
)

echo.
echo Starting Backend Server (port 3001)...
cd server
start "Backend Server" cmd /k "npm run dev"

echo Starting Frontend (port 5173)...
cd ..\client
start "Frontend" cmd /k "npm run dev"

echo.
echo ==========================================
echo   Dashboard starting...
echo   Backend: http://localhost:3001
echo   Frontend: http://localhost:5173
echo ==========================================
echo.
echo Close this window or press Ctrl+C to exit

REM Open browser
timeout /t 5 /nobreak >nul
start http://localhost:5173

pause
