@echo off
echo ================================================
echo Starting FinanceFlow - Personal Finance Tracker
echo ================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.9 or higher
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js 18 or higher
    pause
    exit /b 1
)

echo Prerequisites check passed
echo.

REM Backend setup
echo Setting up Backend...
cd backend

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment and install dependencies
call venv\Scripts\activate
echo Installing backend dependencies...
pip install -q -r requirements.txt

REM Start backend
echo Starting FastAPI backend on http://localhost:8000
start /B python main.py

cd ..

REM Frontend setup
echo.
echo Setting up Frontend...
cd frontend

REM Install frontend dependencies
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)

REM Start frontend
echo Starting React frontend on http://localhost:3000
start /B npm run dev

cd ..

echo.
echo ================================================
echo FinanceFlow is running!
echo ================================================
echo Backend API:  http://localhost:8000
echo API Docs:     http://localhost:8000/docs
echo Frontend:     http://localhost:3000
echo ================================================
echo.
echo Press any key to stop the servers...
pause >nul

REM Kill processes (this is basic - you may need to close them manually)
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
echo Servers stopped.
