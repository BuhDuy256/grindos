@echo off
title GrindOS
echo.
echo  ██████╗ ██████╗ ██╗███╗   ██╗██████╗  ██████╗ ███████╗
echo  ██╔════╝ ██╔══██╗██║████╗  ██║██╔══██╗██╔═══██╗██╔════╝
echo  ██║  ███╗██████╔╝██║██╔██╗ ██║██║  ██║██║   ██║███████╗
echo  ██║   ██║██╔══██╗██║██║╚██╗██║██║  ██║██║   ██║╚════██║
echo  ╚██████╔╝██║  ██║██║██║ ╚████║██████╔╝╚██████╔╝███████║
echo   ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝  ╚═════╝ ╚══════╝
echo.
echo  Starting 3 services...
echo.

start "GrindOS - AI Core  [port 8000]" cmd /k "cd /d %~dp0ai && uvicorn main:app --reload --port 8000"
timeout /t 1 /nobreak >nul

start "GrindOS - Web API  [port 8080]" cmd /k "cd /d %~dp0api && uvicorn main:app --reload --port 8080"
timeout /t 1 /nobreak >nul

start "GrindOS - Frontend [port 3000]" cmd /k "cd /d %~dp0web && npm run dev"

echo  AI Core   ->  http://localhost:8000/docs
echo  Web API   ->  http://localhost:8080/docs
echo  Frontend  ->  http://localhost:3000
echo.
echo  Opening browser in 4 seconds... (Ctrl+C to skip)
timeout /t 4 /nobreak >nul
start http://localhost:3000
