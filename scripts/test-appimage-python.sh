#!/bin/bash

# Test Python dependencies in NodeBook AppImage
set -e

echo "🧪 Testing NodeBook AppImage Python dependencies..."

# Find the AppImage
APPIMAGE=$(find . -name "NodeBook-*.AppImage" | head -1)

if [ -z "$APPIMAGE" ]; then
    echo "❌ No NodeBook AppImage found"
    echo "Build the AppImage first:"
    echo "  ./scripts/build-electron-with-python.sh"
    exit 1
fi

echo "📦 Found AppImage: $APPIMAGE"

# Make it executable
chmod +x "$APPIMAGE"

# Extract AppImage to inspect Python environment
echo "🔍 Extracting AppImage to test Python environment..."
"$APPIMAGE" --appimage-extract-and-run --help > /dev/null 2>&1 || true

# Check if extraction worked
if [ -d "/tmp/.mount_NodeBo"* ]; then
    MOUNT_DIR=$(find /tmp -name ".mount_NodeBo*" -type d | head -1)
    echo "📁 AppImage mounted at: $MOUNT_DIR"
    
    echo ""
    echo "🐍 Python Environment Test:"
    echo "=========================="
    
    # Check Python environment
    if [ -d "$MOUNT_DIR/resources/python_env" ]; then
        echo "✅ Python environment exists"
        ls -la "$MOUNT_DIR/resources/python_env/"
        
        # Check Python executable
        if [ -f "$MOUNT_DIR/resources/python_env/bin/python" ]; then
            echo "✅ Python executable exists"
            
            # Test Python version
            echo "🔍 Testing Python version..."
            "$MOUNT_DIR/resources/python_env/bin/python" --version
            
            # Test importing FastAPI
            echo "🔍 Testing FastAPI import..."
            "$MOUNT_DIR/resources/python_env/bin/python" -c "import fastapi; print('✅ FastAPI imported successfully')" 2>/dev/null || echo "❌ FastAPI import failed"
            
            # Test importing other key dependencies
            echo "🔍 Testing other dependencies..."
            "$MOUNT_DIR/resources/python_env/bin/python" -c "
import sys
deps = ['uvicorn', 'pydantic', 'sqlmodel', 'spacy']
for dep in deps:
    try:
        __import__(dep)
        print(f'✅ {dep} imported successfully')
    except ImportError as e:
        print(f'❌ {dep} import failed: {e}')
"
            
        else
            echo "❌ Python executable missing"
        fi
        
        # Check installed packages
        echo "📦 Installed Python packages:"
        "$MOUNT_DIR/resources/python_env/bin/pip" list | head -10
        
    else
        echo "❌ Python environment missing"
    fi
    
    # Check backend directory
    if [ -d "$MOUNT_DIR/resources/backend" ]; then
        echo "✅ Backend directory exists"
        
        # Test backend startup with AppImage Python
        echo "🔍 Testing backend startup..."
        cd "$MOUNT_DIR/resources/backend"
        
        # Set up environment
        export VIRTUAL_ENV="$MOUNT_DIR/resources/python_env"
        export PATH="$MOUNT_DIR/resources/python_env/bin:$PATH"
        
        # Test importing main.py
        echo "🔍 Testing main.py import..."
        python -c "
import sys
sys.path.insert(0, '.')
try:
    import main
    print('✅ main.py imported successfully')
except Exception as e:
    print(f'❌ main.py import failed: {e}')
"
        
        cd - > /dev/null
        
    else
        echo "❌ Backend directory missing"
    fi
    
    echo ""
    echo "🚀 Testing AppImage execution..."
    echo "Run this command to test the AppImage:"
    echo "  $APPIMAGE"
    
else
    echo "❌ Failed to extract AppImage"
fi

echo ""
echo "📋 Python Environment Issues:"
echo "============================="
echo "1. Missing Python virtual environment"
echo "2. Missing Python dependencies"
echo "3. Incorrect Python path in AppImage"
echo "4. Environment variables not set correctly"
echo ""
echo "🔧 Solutions:"
echo "============="
echo "1. Rebuild with Python: ./scripts/build-electron-with-python.sh"
echo "2. Check Python environment: $MOUNT_DIR/resources/python_env/"
echo "3. Test Python manually: $MOUNT_DIR/resources/python_env/bin/python"
echo "4. Install missing deps: $MOUNT_DIR/resources/python_env/bin/pip install <package>" 