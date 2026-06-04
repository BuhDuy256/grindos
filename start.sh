#!/bin/bash
echo "========================================="
echo "GrindOS - Starting Services"
echo "========================================="

# Kiem tra va copy file .env neu chua co
if [ ! -f "api/.env" ]; then
    echo "Copying .env for API..."
    cp api/.env.example api/.env
fi

if [ ! -f "ai/.env" ]; then
    echo "Copying .env for AI..."
    cp ai/.env-example ai/.env
    echo "WARNING: Vui long them GEMINI_API vao file ai/.env !"
fi

echo ""
echo "Starting Backend API (Port 8080) in background..."
(
    cd api
    [ ! -d "venv" ] && python -m venv venv
    source venv/Scripts/activate 2>/dev/null || source venv/bin/activate
    pip install -r requirements.txt
    python main.py
) &

echo "Starting AI Core (Port 8000) in background..."
(
    cd ai
    [ ! -d "venv" ] && python -m venv venv
    source venv/Scripts/activate 2>/dev/null || source venv/bin/activate
    pip install -r requirements.txt
    uvicorn main:app --port 8000 --reload
) &

echo ""
echo "Both services are running in the background."
echo "Press Ctrl+C to stop both."
wait
