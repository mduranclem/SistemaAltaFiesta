@echo off
cd /d "%~dp0"
title Sistema Alta Fiesta - Instalacion

echo.
echo ============================================================
echo   Sistema Alta Fiesta - Instalacion Inicial
echo   (Solo ejecutar UNA vez)
echo ============================================================
echo.

REM ── Verificar Python ────────────────────────────────────────
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python no esta instalado.
    echo.
    echo Por favor instala Python desde:
    echo   https://www.python.org/downloads/
    echo.
    echo IMPORTANTE: Durante la instalacion marca la opcion
    echo   "Add Python to PATH"
    echo.
    pause
    exit /b 1
)
echo [OK] Python encontrado.

REM ── Verificar Node.js ────────────────────────────────────────
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    echo.
    echo Por favor instala Node.js desde:
    echo   https://nodejs.org/  (descargar la version LTS)
    echo.
    echo Despues de instalar Node.js, vuelve a ejecutar este archivo.
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js encontrado.

REM ── Entorno virtual Python ───────────────────────────────────
echo.
echo [1/3] Preparando entorno Python...
if exist "venv\Scripts\activate.bat" (
    echo      Ya existe, omitiendo creacion.
) else (
    python -m venv venv
    echo      Entorno creado.
)

REM ── Dependencias Python ──────────────────────────────────────
echo.
echo [2/3] Instalando dependencias del servidor...
echo      (puede tardar unos minutos la primera vez)
call venv\Scripts\activate.bat
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo      Dependencias instaladas.

REM ── Dependencias Node ────────────────────────────────────────
echo.
echo [3/3] Instalando dependencias del panel visual...
echo      (puede tardar unos minutos la primera vez)
cd frontend-v0
call npm install --silent
cd ..
echo      Dependencias instaladas.

echo.
echo ============================================================
echo   Instalacion completada con exito!
echo.
echo   Para iniciar el sistema, ejecuta:  INICIAR.bat
echo ============================================================
echo.
pause
