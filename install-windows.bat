@echo off
chcp 65001 >nul
echo ===================================================
echo   LogiAI - Automated Installation Script
echo ===================================================
echo.

:: Check for Administrator privileges (required for some winget installs)
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] Please run this script as Administrator for the best experience.
    echo Some installations like Python or Node.js might require Admin rights.
    echo.
    pause
)

echo [1/5] Checking and Installing Prerequisites (Git, Python, Node.js)...
echo ---------------------------------------------------

:: Check Git
where git >nul 2>&1
if %errorLevel% neq 0 (
    echo Git is not installed. Installing via winget...
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
) else (
    echo [OK] Git is already installed.
)

:: Check Python
where python >nul 2>&1
if %errorLevel% neq 0 (
    echo Python is not installed. Installing Python 3.10 via winget...
    winget install --id Python.Python.3.10 -e --source winget --accept-package-agreements --accept-source-agreements
) else (
    echo [OK] Python is already installed.
)

:: Check Node
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo Node.js is not installed. Installing Node.js LTS via winget...
    winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
) else (
    echo [OK] Node.js is already installed.
)

echo.
echo [2/5] Setting up Environment Variables (.env)...
echo ---------------------------------------------------
cd Web
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo [OK] Created Web/.env
    )
) else (
    echo [OK] Web/.env already exists.
)

if not exist backend\.env (
    if exist backend\.env.example (
        copy backend\.env.example backend\.env >nul
        echo [OK] Created Web/backend/.env
    )
) else (
    echo [OK] Web/backend/.env already exists.
)

echo.
echo [3/5] Installing Frontend Dependencies (npm install)...
echo ---------------------------------------------------
call npm install
if %errorLevel% neq 0 (
    echo [ERROR] npm install failed. Please check your Node.js installation.
    pause
    exit /b %errorLevel%
)
echo [OK] Frontend dependencies installed successfully.

echo.
echo [4/5] Setting up Python Virtual Environment (backend/.venv)...
echo ---------------------------------------------------
if not exist backend\.venv (
    python -m venv backend\.venv
    echo [OK] Virtual environment created.
) else (
    echo [OK] Virtual environment already exists.
)

echo.
echo [5/5] Installing Backend Dependencies (pip install)...
echo ---------------------------------------------------
:: Upgrade pip
call backend\.venv\Scripts\python.exe -m pip install --upgrade pip >nul

:: Install requirements
echo Installing Python packages (this may take a while to download PyTorch and Qwen models)...
call backend\.venv\Scripts\pip.exe install -r backend\requirements.txt
if %errorLevel% neq 0 (
    echo [ERROR] pip install failed.
    pause
    exit /b %errorLevel%
)
echo [OK] Backend dependencies installed successfully.

echo.
echo ===================================================
echo   Installation Completed Successfully!
echo ===================================================
echo.
echo You can now run the system by executing:
echo scripts\run-all-windows.bat
echo (Or type: npm run dev:windows in the Web folder)
echo.
pause
