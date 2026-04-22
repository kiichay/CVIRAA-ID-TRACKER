@echo off
title CVIRAA Athlete Tracker System - Stop
color 0C

echo ========================================
echo   Stopping CVIRAA Athlete Tracker...
echo ========================================
echo.

REM Kill Node.js processes (backend and frontend)
echo Stopping Backend and Frontend servers...
taskkill /FI "WINDOWTITLE eq CVIRAA Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq CVIRAA Frontend*" /T /F >nul 2>&1

REM Also kill any node processes running on ports 3000 and 8080
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Application stopped!
echo.
timeout /t 2 /nobreak >nul
