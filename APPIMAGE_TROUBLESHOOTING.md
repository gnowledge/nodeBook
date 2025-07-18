# NodeBook AppImage Troubleshooting Guide

This guide helps resolve common AppImage issues, particularly the post-install script error.

## 🐛 Common Errors

### Error 1: Post-Install Script Not Found
```
[post-install error]: python3: can't open file '/tmp/.mount_NodeBo9ojXG5/resources/backend/scripts/post_install.py': [Errno 2] No such file or directory
```

### Error 2: Missing Python Dependencies
```
ModuleNotFoundError: No module named 'fastapi'
```

### Root Cause
The AppImage doesn't include Python dependencies, causing import errors when the backend tries to start.

### Root Cause
The AppImage is looking for the post-install script in the mounted AppImage path, but the file structure doesn't match expectations.

## 🔧 Solutions

### Solution 1: Skip Post-Install Script (Recommended)

Run the AppImage with an environment variable to skip the post-install script:

```bash
# Method 1: Direct execution with environment variable
NODEBOOK_SKIP_POST_INSTALL=1 ./electron/dist/NodeBook-*.AppImage

# Method 2: Use the wrapper script
./scripts/create-appimage-wrapper.sh
./nodebook-appimage.sh
```

### Solution 2: Rebuild AppImage with Python Dependencies

```bash
# Rebuild with Python environment included
./scripts/build-electron-with-python.sh

# Or rebuild with custom author info
./scripts/build-electron-with-python.sh "1.0.0" "Your Name" "your-email@example.com"
```

### Solution 3: Debug AppImage Contents

```bash
# Debug the AppImage structure
./scripts/debug-appimage.sh

# Test Python dependencies in AppImage
./scripts/test-appimage-python.sh
```

## 🧪 Testing AppImage

### Basic Test
```bash
# Make AppImage executable
chmod +x electron/dist/NodeBook-*.AppImage

# Run with debug output
./electron/dist/NodeBook-*.AppImage --appimage-extract-and-run
```

### Verbose Test
```bash
# Run with verbose logging
./electron/dist/NodeBook-*.AppImage --verbose 2>&1 | tee appimage.log
```

### Extract and Inspect
```bash
# Extract AppImage contents
./electron/dist/NodeBook-*.AppImage --appimage-extract

# Inspect extracted contents
ls -la squashfs-root/
ls -la squashfs-root/resources/
```

## 🔍 Debugging Steps

### Step 1: Check AppImage Structure
```bash
# Find AppImage
find . -name "NodeBook-*.AppImage"

# Check if executable
ls -la electron/dist/NodeBook-*.AppImage

# Make executable if needed
chmod +x electron/dist/NodeBook-*.AppImage
```

### Step 2: Check System Dependencies
```bash
# Check FUSE
lsmod | grep fuse

# Install FUSE if needed
sudo apt-get install libfuse2

# Load FUSE module
sudo modprobe fuse
```

### Step 3: Check AppImage Dependencies
```bash
# Check library dependencies
ldd electron/dist/NodeBook-*.AppImage

# Check for missing libraries
ldd electron/dist/NodeBook-*.AppImage | grep "not found"
```

### Step 4: Test Python in AppImage
```bash
# Extract AppImage
./electron/dist/NodeBook-*.AppImage --appimage-extract

# Check Python availability
cd squashfs-root
python3 --version
python3 -c "import sys; print(sys.executable)"
```

## 🛠️ Advanced Solutions

### Solution A: Modify Electron Configuration

Update `electron/package.json` to include scripts directory:

```json
{
  "build": {
    "extraResources": [
      {
        "from": "../backend/scripts",
        "to": "backend/scripts"
      }
    ]
  }
}
```

### Solution B: Create Custom AppImage

```bash
# Create custom AppImage with Python included
./scripts/build-electron-enhanced.sh "1.0.0" "Your Name" "your-email@example.com"

# Test custom AppImage
./scripts/debug-appimage.sh
```

### Solution C: Use Docker Alternative

If AppImage continues to have issues, use Docker:

```bash
# Build and run with Docker
./scripts/build-docker.sh
docker-compose up

# Access at http://localhost:3000
```

## 📋 Common Issues and Fixes

### Issue 1: Permission Denied
```bash
# Fix: Make AppImage executable
chmod +x electron/dist/NodeBook-*.AppImage
```

### Issue 2: FUSE Not Available
```bash
# Fix: Install FUSE
sudo apt-get install libfuse2
sudo modprobe fuse
```

### Issue 3: Missing Dependencies
```bash
# Fix: Install system dependencies
sudo apt-get update
sudo apt-get install libfuse2 fuse
```

### Issue 4: AppImage Not Found
```bash
# Fix: Build AppImage first
./scripts/build-electron-enhanced.sh
```

### Issue 5: Python Not Available in AppImage
```bash
# Fix: Skip post-install script
NODEBOOK_SKIP_POST_INSTALL=1 ./electron/dist/NodeBook-*.AppImage

# Fix: Rebuild with Python dependencies
./scripts/build-electron-with-python.sh
```

## 🚀 Quick Fix Commands

### For Immediate Use
```bash
# 1. Make AppImage executable
chmod +x electron/dist/NodeBook-*.AppImage

# 2. Run with post-install disabled
NODEBOOK_SKIP_POST_INSTALL=1 ./electron/dist/NodeBook-*.AppImage

# 3. Or use wrapper script
./scripts/create-appimage-wrapper.sh
./nodebook-appimage.sh
```

### For Development
```bash
# 1. Rebuild with Python dependencies
./scripts/build-electron-with-python.sh

# 2. Test build
./scripts/test-electron-build.sh

# 3. Test Python in AppImage
./scripts/test-appimage-python.sh

# 4. Debug if issues persist
./scripts/debug-appimage.sh
```

## 📊 Monitoring and Logs

### Check AppImage Logs
```bash
# Run with logging
./electron/dist/NodeBook-*.AppImage 2>&1 | tee appimage.log

# Check for specific errors
grep -i "error\|fail\|missing" appimage.log
```

### Monitor System Resources
```bash
# Check if AppImage is running
ps aux | grep nodebook

# Check mounted AppImage
ls -la /tmp/.mount_NodeBo*
```

## 🔄 Alternative Deployment Methods

### Method 1: Docker (Recommended for Servers)
```bash
./scripts/build-docker.sh
docker-compose up
```

### Method 2: Development Mode
```bash
cd electron
npm run dev
```

### Method 3: Unpacked App
```bash
cd electron
npm run pack
cd dist/linux-unpacked
./nodebook
```

## 📞 Support

If issues persist:

1. **Check logs**: `./electron/dist/NodeBook-*.AppImage 2>&1 | tee appimage.log`
2. **Debug AppImage**: `./scripts/debug-appimage.sh`
3. **Rebuild**: `./scripts/build-electron-enhanced.sh`
4. **Use Docker**: `./scripts/build-docker.sh && docker-compose up`
5. **Check system**: Ensure FUSE and dependencies are installed

## 🎯 Best Practices

1. ✅ Always make AppImage executable: `chmod +x *.AppImage`
2. ✅ Test on clean systems before distribution
3. ✅ Include fallback options (Docker, unpacked app)
4. ✅ Provide clear error messages and solutions
5. ✅ Document system requirements 