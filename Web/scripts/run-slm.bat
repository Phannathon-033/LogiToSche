@echo off
title LogiAI SLM Service (Port 8001)
cd /d "%~dp0..\backend"
if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Python virtual environment not found in backend\.venv!
    echo Please run: python -m venv backend\.venv and install requirements first.
    pause
    exit /b 1
)
echo Starting LogiAI SLM Service on http://0.0.0.0:8001...
".venv\Scripts\python.exe" -m uvicorn slm_app:app --host 0.0.0.0 --port 8001
pause
