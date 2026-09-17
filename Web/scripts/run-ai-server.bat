@echo off
title LogiAI - Dual AI Model Server (OCR + SLM)
echo =======================================================
echo       Starting LogiAI Model Server (GPU Dedicated)
echo =======================================================
echo.
echo [1/2] Launching Gateway (OCR + SLM routes) on Port 8000...
start "LogiAI Gateway (Port 8000)" cmd /k "%~dp0run-ocr.bat"

echo [2/2] Launching private SLM Service on localhost Port 8001...
start "LogiAI SLM Service (Private Port 8001)" cmd /k "%~dp0run-slm.bat"

echo.
echo =======================================================
echo AI services are running in background windows!
echo Gateway API: http://0.0.0.0:8000 (Docs: /docs)
echo Private SLM: http://127.0.0.1:8001 (not for network clients)
echo.
echo Friend endpoint via Radmin: http://26.112.184.108:8000
echo Friend endpoint via Tailscale: http://100.125.120.97:8000
echo Use X-LogiAI-Token and never connect to port 8001.
echo =======================================================
echo.
pause
