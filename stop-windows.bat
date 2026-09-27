@echo off
chcp 65001 >nul
echo กำลังปิดเซอร์วิส LogiAI ทั้งหมด (Port 5173, 8000, 8001)...
cd /d "%~dp0Web"
powershell -ExecutionPolicy Bypass -File "%~dp0Web\scripts\stop-all.ps1"
if %errorLevel% neq 0 (
    echo กำลังปิดโปรเซสผ่านคำสั่ง taskkill สำรอง...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 :8001 :5173"') do taskkill /F /PID %%a >nul 2>&1
)
echo [OK] ปิดการทำงานของระบบเรียบร้อยแล้ว
pause
