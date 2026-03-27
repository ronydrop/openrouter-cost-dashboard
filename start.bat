@echo off
title OpenRouter Cost Dashboard

echo ==========================================
echo   OpenRouter Cost Dashboard - Starting
echo ==========================================
echo.

REM ============================================
REM 1. INICIAR POSTGRESQL
REM ============================================
echo [1/4] Verificando PostgreSQL...

sc query postgresql-x64-18 | find "RUNNING" >nul
if %errorlevel% neq 0 (
    echo Iniciando PostgreSQL...
    net start postgresql-x64-18
    timeout /t 3 /nobreak >nul
) else (
    echo PostgreSQL ja esta rodando.
)

REM ============================================
REM 2. LIMPAR PORTAS
REM ============================================
echo [2/4] Limpando portas 3001 e 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

REM ============================================
REM 3. INSTALAR DEPENDENCIAS (se necessario)
REM ============================================
echo [3/4] Verificando dependencias...
if not exist "server\node_modules" (
    echo Instalando dependencias do servidor...
    cd server && call npm install && cd ..
)
if not exist "client\node_modules" (
    echo Instalando dependencias do cliente...
    cd client && call npm install && cd ..
)

REM ============================================
REM 4. INICIAR SERVICOS
REM ============================================
echo [4/4] Iniciando Backend e Frontend...

REM Salva o diretorio atual
set START_DIR=%CD%

REM Abre primeira aba - Backend
wt new-tab --title "Backend" -d "%START_DIR%\server" cmd /k "npm run dev"

REM Abre segunda aba - Frontend  
wt new-tab --title "Frontend" -d "%START_DIR%\client" cmd /k "npm run dev -- --host"

echo.
echo ==========================================
echo   Aguardando servidores iniciarem...
echo ==========================================
echo.
echo   PostgreSQL: localhost:5432
echo   Backend:    http://localhost:3001
echo   Frontend:   http://localhost:5173
echo ==========================================

timeout /t 5 /nobreak >nul
echo Abrindo navegador...
start http://localhost:5173

echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
