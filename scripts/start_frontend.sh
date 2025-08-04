#!/bin/bash

# Start the nodebook-base frontend server
echo "Starting nodebook-base frontend..."

# Change to the frontend directory
cd "$(dirname "$0")/../nodebook-base/frontend"

# Check if we're in the correct directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Error: Not in the correct directory!"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "✅ Directory check passed"

# Check if node_modules exists
if [[ ! -d "node_modules" ]]; then
    echo "⚠️  Warning: node_modules not found!"
    echo "Installing dependencies..."
    npm install
fi

# Kill any existing vite processes
echo "🔄 Stopping any existing frontend processes..."
pkill -f vite

# Start the frontend server
echo "🚀 Starting frontend server with Vite..."
npm run dev & 