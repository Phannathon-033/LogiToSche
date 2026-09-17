@echo off
title LogiAI - Dual AI Model Server (OCR + SLM)
echo =======================================================
echo       Starting LogiAI Model Server (GPU Dedicated)
echo =======================================================
echo.
echo [1/2] Launching AI Gateway on Port 8000 (0.0.0.0)...
start "LogiAI Gateway (Port 8000)" cmd /k "%~dp0run-ocr.bat"

echo [2/2] Launching SLM Service on Port 8001 (127.0.0.1 - Internal)...
start "LogiAI SLM Service (Port 8001)" cmd /k "%~dp0run-slm.bat"

echo.
echo =======================================================
echo AI Services are running in background windows!
echo Gateway API: http://0.0.0.0:8000 (Docs: /docs)
echo SLM Internal: http://127.0.0.1:8001 (Internal only)
echo.
echo Gateway for friend via Radmin:   http://26.112.184.108:8000
echo Gateway for friend via Tailscale: http://100.125.120.97:8000
echo =======================================================
pause
