@echo off
cd /d "%~dp0..\backend"
".venv\Scripts\python.exe" -m uvicorn slm_app:app --host 0.0.0.0 --port 8001
