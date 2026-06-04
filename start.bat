@echo off
echo =========================================
echo  GrindOS - Starting Services
echo =========================================
echo.

:: Auto-copy .env files if missing
if not exist "ai\.env" (
    if exist "ai\.env-example" copy "ai\.env-example" "ai\.env" >nul
    echo [!] ai\.env created — add your GEMINI_API key before using AI features
)
if not exist "api\.env" (
    if exist "api\.env.example" copy "api\.env.example" "api\.env" >nul
)

:: ── Production (MongoDB) ────────────────────────────────────────────────────
echo [1] AI Core        (port 8000)  - Gemini pipelines
echo [2] Frontend       (port 3000)  - MongoDB UI  (web/)
echo.
echo [DEV] SQLite API   (port 8080)  - api/
echo [DEV] SQLite UI    (port 3001)  - api/ui/
echo.

start "GrindOS - AI Core (8000)" cmd /k "cd /d %~dp0ai && (if not exist venv python -m venv venv) && call venv\Scripts\activate && pip install -r requirements.txt -q && uvicorn main:app --port 8000 --reload"
timeout /t 1 /nobreak >nul

start "GrindOS - Frontend (3000)" cmd /k "cd /d %~dp0web && npm run dev"

echo.
echo Services starting. Opening browser in 5 seconds...
echo.
echo To run SQLite dev environment instead:
echo   start-dev.bat
timeout /t 5 /nobreak >nul
start http://localhost:3000
