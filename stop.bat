@echo off
title Stopping OpenRouter Dashboard

echo ==========================================
echo   Stopping OpenRouter Dashboard
echo ==========================================

REM Kill processes on ports 3001 and 5173
echo Stopping Backend Server (port 3001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    echo Killing PID %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo Stopping Frontend (port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    echo Killing PID %%a
    taskkill /F /PID %%a >nul 2>&1
)

REM Also kill any node processes running the dashboard
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Backend*" >nul 2>&1
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Frontend*" >nul 2>&1

echo.
echo ==========================================
echo   All services stopped!
echo ==========================================

pause
