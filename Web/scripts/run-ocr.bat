@echo off
cd /d "E:\Logistics To JSON\Web\backend"
".venv\Scripts\python.exe" -m uvicorn ocr_app:app --host 127.0.0.1 --port 8000
