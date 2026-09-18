@echo off
title LogiAI - Starting All Services (Frontend + Gateway + SLM)
echo =======================================================
echo       Launching LogiAI All Services (3 Windows)
echo =======================================================
echo.
echo [1/3] Launching Frontend on Port 5173...
start "LogiAI Frontend (Port 5173)" cmd /k "%~dp0run-frontend.bat"

echo [2/3] Launching AI Gateway on Port 8000...
start "LogiAI Gateway (Port 8000)" cmd /k "%~dp0run-ocr.bat"

echo [3/3] Launching SLM Service on Port 8001...
start "LogiAI SLM Service (Port 8001)" cmd /k "%~dp0run-slm.bat"

echo.
echo All 3 windows launched successfully!
echo Frontend: http://127.0.0.1:5173
echo Gateway:  http://127.0.0.1:8000
echo SLM:      http://127.0.0.1:8001
