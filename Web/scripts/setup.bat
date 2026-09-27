@echo off
title LogiAI - Project Environment Setup
echo ========================================================
echo        LogiAI Project Quick Setup (One-Time Setup)
echo ========================================================
echo.

cd /d "%~dp0.."

echo [1/5] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found in PATH!
    echo Please install Python 3.10 or 3.11 from https://www.python.org/
    echo Make sure to check 'Add python.exe to PATH' during installation.
    pause
    exit /b 1
)
python --version

echo.
echo [2/5] Checking Node.js installation...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found in PATH!
    echo Please install Node.js 18+ LTS from https://nodejs.org/
    pause
    exit /b 1
)
node -v

echo.
echo [3/5] Setting up Environment Variables (.env)...
if not exist ".env" (
    echo Copying .env.example to .env...
    copy ".env.example" ".env"
) else (
    echo Root .env already exists.
)

if not exist "backend\.env" (
    echo Copying backend\.env.example to backend\.env...
    copy "backend\.env.example" "backend\.env"
) else (
    echo backend\.env already exists.
)

echo.
echo [4/5] Setting up Backend Python Virtual Environment...
if not exist "backend\.venv\Scripts\python.exe" (
    echo Creating virtual environment at backend\.venv...
    python -m venv backend\.venv
) else (
    echo Virtual environment already exists at backend\.venv.
)

echo.
echo Do you have an NVIDIA GPU (RTX / GTX with CUDA)?
set /p HAS_GPU="Install with NVIDIA GPU acceleration? [Y/N, default=Y]: "
if /i "%HAS_GPU%"=="N" (
    echo Installing CPU dependencies from requirements-cpu.txt...
    "backend\.venv\Scripts\python.exe" -m pip install --upgrade pip
    "backend\.venv\Scripts\python.exe" -m pip install -r backend\requirements-cpu.txt
) else (
    echo Installing GPU dependencies from requirements.txt...
    "backend\.venv\Scripts\python.exe" -m pip install --upgrade pip
    "backend\.venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
)

echo.
echo [5/5] Installing Frontend Dependencies (npm install)...
call npm install

echo.
echo ========================================================
echo                 Setup Completed Successfully!
echo ========================================================
echo.
echo To run the project, you can now:
echo   1. Double-click: scripts\run-all-windows.bat
echo   2. Or in terminal: npm run dev:windows
echo.
echo Web UI will be at: http://localhost:5173
echo.
pause
