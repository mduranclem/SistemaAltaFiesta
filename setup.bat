@echo off
:: Ir siempre a la carpeta donde está este .bat, sin importar desde dónde se ejecute
cd /d "%~dp0"

echo ============================================================
echo  Sistema Alta Fiesta - Setup Inicial
echo ============================================================

:: Crear entorno virtual
echo [1/3] Creando entorno virtual...
python -m venv venv

:: Activar e instalar dependencias
echo [2/3] Instalando dependencias...
call venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt

:: Mensaje final
echo.
echo [3/3] Setup completado!
echo.
echo Para iniciar el servidor:
echo   venv\Scripts\activate
echo   uvicorn app.main:app --reload
echo.
echo Para correr los tests:
echo   venv\Scripts\activate
echo   pytest tests/ -v
echo.
pause
