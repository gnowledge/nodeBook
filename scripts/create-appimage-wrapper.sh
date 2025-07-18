#!/bin/bash

# AppImage wrapper script for NodeBook
set -e

echo "🚀 NodeBook AppImage Wrapper"
echo "============================"

# Find the AppImage
APPIMAGE=$(find . -name "NodeBook-*.AppImage" | head -1)

if [ -z "$APPIMAGE" ]; then
    echo "❌ No NodeBook AppImage found"
    echo "Build the AppImage first:"
    echo "  ./scripts/build-electron-enhanced.sh"
    exit 1
fi

echo "📦 Found AppImage: $APPIMAGE"

# Make it executable
chmod +x "$APPIMAGE"

# Create a wrapper script
WRAPPER_SCRIPT="nodebook-appimage.sh"
cat > "$WRAPPER_SCRIPT" << 'EOF'
#!/bin/bash

# NodeBook AppImage Wrapper
set -e

# Find the AppImage
APPIMAGE=$(find . -name "NodeBook-*.AppImage" | head -1)

if [ -z "$APPIMAGE" ]; then
    echo "❌ No NodeBook AppImage found"
    exit 1
fi

echo "🚀 Starting NodeBook..."

# Set environment variables
export NODEBOOK_SKIP_POST_INSTALL=1
export NODEBOOK_DEBUG=1

# Run the AppImage with error handling
if "$APPIMAGE" "$@"; then
    echo "✅ NodeBook exited successfully"
else
    echo "❌ NodeBook exited with error"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "1. Check if AppImage is executable: chmod +x $APPIMAGE"
    echo "2. Run with debug: $APPIMAGE --appimage-extract-and-run"
    echo "3. Check system dependencies: sudo apt-get install libfuse2"
    echo "4. Rebuild AppImage: ./scripts/build-electron-enhanced.sh"
    exit 1
fi
EOF

chmod +x "$WRAPPER_SCRIPT"

echo "✅ Created wrapper script: $WRAPPER_SCRIPT"
echo ""
echo "Usage:"
echo "  ./$WRAPPER_SCRIPT"
echo ""
echo "Or run directly:"
echo "  $APPIMAGE" 