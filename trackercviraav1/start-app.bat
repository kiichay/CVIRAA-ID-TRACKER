@echo off
title CVIRAA Athlete Tracker System - Launcher
color 0A

echo ========================================
echo   CVIRAA Athlete Tracker System
echo   Starting Backend and Frontend...
echo ========================================
echo.

REM Get the directory where this batch file is located
cd /d "%~dp0"

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm is not installed or not in PATH!
    pause
    exit /b 1
)

echo [1/3] Starting Backend Server (Port 3000)...
start "CVIRAA Backend" cmd /k "cd backend && npm start"
timeout /t 3 /nobreak >nul

echo [2/3] Starting Frontend Server (Port 8080)...
start "CVIRAA Frontend" cmd /k "cd frontend && npm run serve"
timeout /t 8 /nobreak >nul

echo [3/3] Opening browser...
start http://localhost:8080

echo.
echo ========================================
echo   Application is starting!
echo   Backend: http://localhost:3000
echo   Frontend: http://localhost:8080
echo.
echo   Two windows opened:
echo   - One for Backend (keep it open)
echo   - One for Frontend (keep it open)
echo.
echo   To stop the app, close both windows.
echo ========================================
echo.
echo Press any key to close this launcher window...
echo (The app will continue running in the other windows)
pause >nul
