#!/bin/bash

# Build Electron packages for NodeBook
set -e

echo "📱 Building NodeBook Electron packages..."

# Navigate to project root
cd "$(dirname "$0")/.."

# Build frontend first
echo "🔨 Building frontend..."
cd frontend
npm run build
cd ..

# Install electron-builder if not already installed
if [ ! -d "electron/node_modules/electron-builder" ]; then
    echo "📦 Installing electron-builder..."
    cd electron
    npm install
    cd ..
fi

# Build Electron packages
echo "📦 Building Electron packages..."
cd electron

# Build for current platform
echo "🎯 Building for current platform..."
npm run dist

# Run post-install script for backend
echo "🔧 Running post-install script..."
cd ../backend && python scripts/post_install.py && cd ../electron

# Build for specific platforms (uncomment as needed)
# echo "🪟 Building for Windows..."
# npm run dist:win

# echo "🍎 Building for macOS..."
# npm run dist:mac

# echo "🐧 Building for Linux..."
# npm run dist:linux

cd ..

echo "✅ Electron packages built successfully!"
echo ""
echo "Packages available in electron/dist/:"
ls -la electron/dist/
echo ""
echo "To install dependencies for electron-builder:"
echo "  cd electron && npm install" 