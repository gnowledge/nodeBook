#!/bin/bash

# Test Electron build for NodeBook
set -e

echo "🧪 Testing NodeBook Electron build..."

# Navigate to project root
cd "$(dirname "$0")/.."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository. Please run this from the project root."
    exit 1
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Check if electron dependencies are installed
if [ ! -d "electron/node_modules" ]; then
    echo "📦 Installing electron dependencies..."
    cd electron
    npm install
    cd ..
fi

# Test frontend build
echo "🔨 Testing frontend build..."
cd frontend
npm run build
cd ..

# Test electron build
echo "📱 Testing electron build..."
cd electron

# Test pack (unpacked app)
echo "🎯 Testing pack build..."
npm run pack

# Test dist build for current platform
echo "🎯 Testing dist build..."
npm run build

cd ..

echo "✅ Electron build test completed successfully!"
echo ""
echo "Build outputs:"
echo "  Pack (unpacked): electron/dist/linux-unpacked/"
echo "  Dist (packaged): electron/dist/"
echo ""
echo "To run the unpacked app:"
echo "  cd electron/dist/linux-unpacked && ./nodebook" 