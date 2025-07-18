#!/bin/bash

# Build Electron AppImage for NodeBook Frontend Only
set -e

VERSION=${1:-"0.1.0"}
AUTHOR_NAME=${2:-"NodeBook Team"}
AUTHOR_EMAIL=${3:-"nagarjun@gnowledge.org"}

echo "📱 Building NodeBook Electron AppImage (frontend only)..."
echo "Version: $VERSION"
echo "Author: $AUTHOR_NAME <$AUTHOR_EMAIL>"

# Navigate to project root
cd "$(dirname "$0")/.."

# Build frontend first
echo "🔨 Building frontend..."
cd frontend
npm run build
cd ..

# Update electron package.json with author info
echo "📝 Updating package.json..."
cd electron

# Update package.json with author info
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$VERSION';
pkg.author = {
  name: '$AUTHOR_NAME',
  email: '$AUTHOR_EMAIL'
};
pkg.repository = {
  type: 'git',
  url: 'https://github.com/your-org/nodebook.git'
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('Updated package.json with author information');
"

# Install electron-builder if not already installed
if [ ! -d "node_modules/electron-builder" ]; then
    echo "📦 Installing electron-builder..."
    npm install
fi

# Build Electron packages
echo "📦 Building Electron packages (frontend only)..."
echo "🎯 Building for current platform..."
npm run build

cd ..

echo "✅ Electron packages built successfully (frontend only)!"
echo ""
echo "Packages available in electron/dist/:"
ls -la electron/dist/
echo ""
echo "Build information:"
echo "  Version: $VERSION"
echo "  Author: $AUTHOR_NAME <$AUTHOR_EMAIL>"
echo ""
echo "To test the AppImage:"
echo "  chmod +x electron/dist/NodeBook-*.AppImage"
echo "  ./electron/dist/NodeBook-*.AppImage" 