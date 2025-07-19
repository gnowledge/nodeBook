#!/bin/bash

# NodeBook Android APK Setup Script
# This script sets up Capacitor for Android APK packaging

set -e

echo "🚀 Setting up NodeBook for Android APK packaging..."

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the frontend directory"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed."
    exit 1
fi

echo "📦 Installing Capacitor dependencies..."
npm install

echo "🔧 Initializing Capacitor..."
npx cap init NodeBook com.nodebook.app --web-dir=dist

echo "🤖 Adding Android platform..."
npx cap add android

echo "🏗️ Building the web app..."
npm run build

echo "🔄 Syncing with Capacitor..."
npx cap sync

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Install Android Studio if not already installed"
echo "2. Set up Android SDK (API level 33+)"
echo "3. Set ANDROID_HOME environment variable"
echo "4. Run: npm run android:open"
echo "5. Or run: npm run android:run (if device/emulator is connected)"
echo ""
echo "Useful commands:"
echo "- npm run android:build    # Build and sync"
echo "- npm run android:open     # Open in Android Studio"
echo "- npm run android:run      # Run on device/emulator"
echo "- npm run android:build-apk # Generate debug APK"
echo ""
echo "For more information, see: ANDROID_APK_GUIDE.md" 