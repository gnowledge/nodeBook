#!/bin/bash

# Debug AppImage issues for NodeBook
set -e

echo "🔍 Debugging NodeBook AppImage..."

# Check if AppImage exists
if [ ! -f "electron/dist/NodeBook-*.AppImage" ]; then
    echo "❌ No AppImage found in electron/dist/"
    echo "Build the AppImage first:"
    echo "  ./scripts/build-electron-enhanced.sh"
    exit 1
fi

# Find the AppImage
APPIMAGE=$(find electron/dist -name "NodeBook-*.AppImage" | head -1)
echo "📦 Found AppImage: $APPIMAGE"

# Make it executable
chmod +x "$APPIMAGE"

# Extract AppImage to inspect contents
echo "🔍 Extracting AppImage for inspection..."
EXTRACT_DIR="/tmp/nodebook-appimage-debug"
rm -rf "$EXTRACT_DIR"
mkdir -p "$EXTRACT_DIR"

# Extract AppImage
"$APPIMAGE" --appimage-extract-and-run --help > /dev/null 2>&1 || true

# Check if extraction worked
if [ -d "/tmp/.mount_NodeBo"* ]; then
    MOUNT_DIR=$(find /tmp -name ".mount_NodeBo*" -type d | head -1)
    echo "📁 AppImage mounted at: $MOUNT_DIR"
    
    echo ""
    echo "📋 AppImage Contents:"
    echo "======================"
    
    # Check backend directory
    if [ -d "$MOUNT_DIR/resources/backend" ]; then
        echo "✅ Backend directory exists"
        ls -la "$MOUNT_DIR/resources/backend/"
        
        # Check scripts directory
        if [ -d "$MOUNT_DIR/resources/backend/scripts" ]; then
            echo "✅ Scripts directory exists"
            ls -la "$MOUNT_DIR/resources/backend/scripts/"
            
            # Check post_install.py
            if [ -f "$MOUNT_DIR/resources/backend/scripts/post_install.py" ]; then
                echo "✅ post_install.py exists"
            else
                echo "❌ post_install.py missing"
            fi
        else
            echo "❌ Scripts directory missing"
        fi
    else
        echo "❌ Backend directory missing"
    fi
    
    # Check frontend
    if [ -d "$MOUNT_DIR/resources/app" ]; then
        echo "✅ Frontend directory exists"
        ls -la "$MOUNT_DIR/resources/app/"
    else
        echo "❌ Frontend directory missing"
    fi
    
    # Check graph_data
    if [ -d "$MOUNT_DIR/resources/graph_data" ]; then
        echo "✅ Graph data directory exists"
        ls -la "$MOUNT_DIR/resources/graph_data/"
    else
        echo "❌ Graph data directory missing"
    fi
    
    echo ""
    echo "🔧 Testing Python in AppImage..."
    
    # Test Python availability
    if [ -f "$MOUNT_DIR/resources/backend/scripts/post_install.py" ]; then
        echo "Testing post-install script..."
        cd "$MOUNT_DIR/resources/backend"
        python3 scripts/post_install.py --help 2>/dev/null || echo "Script execution failed"
        cd - > /dev/null
    fi
    
    echo ""
    echo "🚀 Testing AppImage execution..."
    echo "Run this command to test the AppImage:"
    echo "  $APPIMAGE --appimage-extract-and-run"
    
else
    echo "❌ Failed to extract AppImage"
fi

echo ""
echo "📋 Common AppImage Issues:"
echo "=========================="
echo "1. Missing dependencies in AppImage"
echo "2. Incorrect file paths in mounted AppImage"
echo "3. Python not available in AppImage"
echo "4. Permission issues with mounted files"
echo ""
echo "🔧 Solutions:"
echo "============="
echo "1. Rebuild AppImage: ./scripts/build-electron-enhanced.sh"
echo "2. Check file permissions: chmod +x $APPIMAGE"
echo "3. Run with debug: $APPIMAGE --appimage-extract-and-run"
echo "4. Check logs: $APPIMAGE --appimage-extract-and-run 2>&1 | tee appimage.log" 