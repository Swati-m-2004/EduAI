@echo off
REM EduAI Quick Start Script for Windows

echo.
echo ██████████████████████████████████████████
echo    Welcome to EduAI - Educational Platform
echo ██████████████████████████████████████████
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js found
echo.

REM Check if MongoDB is running
echo Checking MongoDB connection...
timeout /t 1 /nobreak >nul

REM Start Backend
echo.
echo Starting Backend Server...
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    call npm install --silent
)
start "EduAI Backend" cmd /k "npm run dev"
echo ✓ Backend server starting on http://localhost:5000

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend
echo.
echo Starting Frontend Server...
cd ..\frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install --silent
)
start "EduAI Frontend" cmd /k "npm run dev"
echo ✓ Frontend server starting on http://localhost:5173

echo.
echo ██████████████████████████████████████████
echo    Services Started Successfully!
echo ██████████████████████████████████████████
echo.
echo Dashboard URLs:
echo   - Frontend: http://localhost:5173
echo   - Backend: http://localhost:5000
echo   - API Docs: http://localhost:5000/health
echo.
echo Test Credentials:
echo   Email: admin@eduai.com
echo   Password: admin@123
echo.
echo Press any key to continue...
pause

cd ..
