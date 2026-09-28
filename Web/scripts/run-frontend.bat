@echo off
title LogiAI Web Frontend (Port 5173)
cd /d "%~dp0.."
if not exist "node_modules" (
    echo [WARNING] node_modules not found! Running npm install first...
    call npm install
)
echo Starting Vite Dev Server on http://localhost:5173...
call npm run dev
pause
