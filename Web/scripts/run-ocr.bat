@echo off
cd /d "%~dp0..\backend"
".venv\Scripts\python.exe" -m uvicorn ocr_app:app --host 0.0.0.0 --port 8000
