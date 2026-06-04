@echo off
echo =========================================
echo GrindOS - Starting Services
echo =========================================

:: Kiem tra va copy file .env neu chua co
if not exist "api\.env" (
    echo Copying .env for API...
    copy "api\.env.example" "api\.env"
)
if not exist "ai\.env" (
    echo Copying .env for AI...
    copy "ai\.env-example" "ai\.env"
    echo WARNING: Vui long them GEMINI_API vao file ai\.env !
)

echo.
echo Starting Backend API (Port 8080) in new window...
start "GrindOS - Backend API (8080)" cmd /k "cd api && (if not exist venv python -m venv venv) && call venv\Scripts\activate && pip install -r requirements.txt && python main.py"

echo Starting AI Core (Port 8000) in new window...
start "GrindOS - AI Core (8000)" cmd /k "cd ai && (if not exist venv python -m venv venv) && call venv\Scripts\activate && pip install -r requirements.txt && uvicorn main:app --port 8000 --reload"

echo.
echo Both services are starting up! Keep the new windows open.
echo To stop them, just close those windows.
