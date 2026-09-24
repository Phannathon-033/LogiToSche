@echo off
title LogiAI Gateway (Port 8000)
cd /d "%~dp0..\backend"
if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Python virtual environment not found in backend\.venv!
    echo Please run: python -m venv backend\.venv and install requirements first.
    pause
    exit /b 1
)
echo Starting LogiAI Gateway on http://0.0.0.0:8000...
".venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000
pause
