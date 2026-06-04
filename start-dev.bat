@echo off
echo =========================================
echo  GrindOS DEV - SQLite mode
echo =========================================
echo.
echo [1] AI Core  (port 8000)  WEB_API_URL=http://localhost:8080
echo [2] API      (port 8080)  SQLite backend
echo [3] Dev UI   (port 3001)  api/ui/ - minimalist
echo.

start "GrindOS DEV - SQLite API (8080)" cmd /k "cd /d %~dp0api && (if not exist venv python -m venv venv) && call venv\Scripts\activate && pip install -r requirements.txt -q && uvicorn main:app --port 8080 --reload"
timeout /t 2 /nobreak >nul

start "GrindOS DEV - AI Core (8000)" cmd /k "cd /d %~dp0ai && (if not exist venv python -m venv venv) && call venv\Scripts\activate && set WEB_API_URL=http://localhost:8080 && uvicorn main:app --port 8000 --reload"
timeout /t 1 /nobreak >nul

start "GrindOS DEV - UI (3001)" cmd /k "cd /d %~dp0api\ui && npm run dev -- --port 3001"

echo.
echo Dev services starting...
timeout /t 5 /nobreak >nul
start http://localhost:3001
