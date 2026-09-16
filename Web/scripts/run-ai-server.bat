@echo off
title LogiAI - Dual AI Model Server (OCR + SLM)
echo =======================================================
echo       Starting LogiAI Model Server (GPU Dedicated)
echo =======================================================
echo.
echo [1/2] Launching OCR Service on Port 8000 (0.0.0.0)...
start "LogiAI OCR Service (Port 8000)" cmd /k "%~dp0run-ocr.bat"

echo [2/2] Launching SLM Service on Port 8001 (0.0.0.0)...
start "LogiAI SLM Service (Port 8001)" cmd /k "%~dp0run-slm.bat"

echo.
echo =======================================================
echo AI Services are running in background windows!
echo OCR API:  http://0.0.0.0:8000 (Docs: /docs)
echo SLM API:  http://0.0.0.0:8001 (Docs: /docs)
echo.
echo IP for friend via Radmin:   26.112.184.108
echo IP for friend via Tailscale: 100.125.120.97
echo =======================================================
pause
