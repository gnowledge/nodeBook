#!/bin/bash

# Start the NDF Studio frontend server

echo "Starting NDF Studio Frontend..."

# Change to the project root directory (parent of scripts)
cd "$(dirname "$0")/.."

# Check if we're in the correct directory
if [[ ! -f "frontend/package.json" ]]; then
    echo "❌ Error: Not in the correct directory!"
    echo "Please run this script from the ndf-studio root directory."
    exit 1
fi

echo "✅ Directory check passed"

# Check if node_modules exists
if [[ ! -d "frontend/node_modules" ]]; then
    echo "⚠️  Warning: node_modules not found!"
    echo "Installing dependencies..."
    cd frontend && npm install && cd ..
fi

# Kill any existing vite processes
echo "🔄 Stopping any existing frontend processes..."
pkill -f vite

# Start the frontend server
echo "🚀 Starting frontend server..."
cd frontend && npm run dev 