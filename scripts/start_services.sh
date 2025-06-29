#!/bin/bash

# Start both NDF Studio backend and frontend services

echo "🚀 Starting NDF Studio Services..."

# Change to the project root directory (parent of scripts)
cd "$(dirname "$0")/.."

# Check if we're in the correct virtual environment
if [[ "$VIRTUAL_ENV" != *"nodeBook"* ]]; then
    echo "❌ Error: Not running in the correct virtual environment!"
    echo "Please activate the virtual environment first:"
    echo "  source venv/bin/activate"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ Virtual environment check passed: $VIRTUAL_ENV"

# Check if we're in the correct directory
if [[ ! -f "backend/main.py" ]] || [[ ! -f "frontend/package.json" ]]; then
    echo "❌ Error: Not in the correct directory!"
    echo "Please run this script from the ndf-studio root directory."
    exit 1
fi

echo "✅ Directory check passed"

# Kill any existing processes
echo "🔄 Stopping any existing processes..."
pkill -f uvicorn
pkill -f vite

# Check if node_modules exists
if [[ ! -d "frontend/node_modules" ]]; then
    echo "⚠️  Warning: node_modules not found!"
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Start backend in background
echo "🚀 Starting backend server..."
PYTHONPATH="$(pwd)/backend" python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "🚀 Starting frontend server..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Services started successfully!"
echo "📊 Backend: http://localhost:8000"
echo "🎨 Frontend: http://localhost:5173 (or next available port)"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for user to stop
trap "echo ''; echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait 