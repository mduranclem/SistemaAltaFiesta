@echo off
cd /d "%~dp0"
title Sistema Alta Fiesta

echo =======================================
echo   Sistema Alta Fiesta - Iniciando...
echo =======================================
echo.

REM Verificar que existe el entorno virtual
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: No se encontro el entorno virtual.
    echo Ejecuta primero INSTALAR.bat
    pause
    exit /b 1
)

REM Verificar que estan instaladas las dependencias del frontend
if not exist "frontend-v0\node_modules" (
    echo ERROR: Faltan dependencias del panel visual.
    echo Ejecuta primero INSTALAR.bat
    pause
    exit /b 1
)

echo [1/2] Iniciando Backend (puerto 8000)...
start "Backend - Alta Fiesta" cmd /k "cd /d "%~dp0" && venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000"

REM Esperar a que el backend arranque
timeout /t 4 /nobreak > nul

echo [2/2] Iniciando Panel Visual (puerto 3000)...
start "Frontend - Alta Fiesta" cmd /k "cd /d "%~dp0\frontend-v0" && npm run dev -- --hostname 0.0.0.0"

REM Esperar y abrir el navegador
timeout /t 6 /nobreak > nul

echo.
echo =======================================
echo   Abriendo navegador...
echo =======================================
start "" "http://localhost:3000"

echo.
echo Sistema iniciado. Para cerrarlo, cierra las dos ventanas negras.
echo.
pause
