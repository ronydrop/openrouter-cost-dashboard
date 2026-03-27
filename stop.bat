@echo off
title Stopping OpenRouter Dashboard

echo ==========================================
echo   Parando OpenRouter Dashboard
echo ==========================================
echo.

REM Parar Backend
echo Parando Backend (port 3001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM Parar Frontend
echo Parando Frontend (port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    taskkill /F /PID %%a >nul 2>&1
)

set /p STOP_PG="Parar PostgreSQL tambem? (S/N): "
if /i "%STOP_PG%"=="S" (
    echo Parando PostgreSQL...
    net stop postgresql-x64-18
)

echo.
echo ==========================================
echo   Todos os servicos parados!
echo ==========================================

pause
