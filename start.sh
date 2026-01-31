#!/bin/bash

# FinanceFlow Startup Script

echo "🚀 Starting FinanceFlow - Personal Finance Tracker"
echo "=================================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9 or higher."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Backend setup
echo "📦 Setting up Backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install backend dependencies
echo "Installing backend dependencies..."
pip install -q -r requirements.txt

# Start backend in background
echo "🔧 Starting FastAPI backend on http://localhost:8000"
python main.py &
BACKEND_PID=$!

cd ..

# Frontend setup
echo ""
echo "📦 Setting up Frontend..."
cd frontend

# Install frontend dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start frontend
echo "🎨 Starting React frontend on http://localhost:3000"
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "✅ FinanceFlow is running!"
echo "=================================================="
echo "Backend API:  http://localhost:8000"
echo "API Docs:     http://localhost:8000/docs"
echo "Frontend:     http://localhost:3000"
echo "=================================================="
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
