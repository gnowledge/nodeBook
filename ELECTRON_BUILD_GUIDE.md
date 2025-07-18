# NodeBook Electron Build Guide

This guide covers building Electron packages for NodeBook with proper author information and build scripts.

## 🔧 Author Information Requirements

### Required Fields in package.json

Electron-builder requires author information for Linux builds. The package.json must include:

```json
{
  "name": "ndf-electron",
  "version": "0.1.0",
  "author": {
    "name": "NodeBook Team",
    "email": "admin@nodebook.com"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/nodebook.git"
  }
}
```

### Author Information Syntax

```json
// Single author (string)
"author": "NodeBook Team <admin@nodebook.com>"

// Author object (recommended)
"author": {
  "name": "NodeBook Team",
  "email": "admin@nodebook.com"
}

// Multiple authors
"author": [
  {
    "name": "NodeBook Team",
    "email": "admin@nodebook.com"
  },
  {
    "name": "Contributor",
    "email": "contributor@example.com"
  }
]
```

## 🚀 Build Scripts

### Available Scripts

```bash
# Development
npm run start          # Start electron app
npm run dev           # Start in development mode
npm run build-and-run # Build frontend and start electron

# Building
npm run build         # Build frontend + electron (recommended)
npm run pack          # Build unpacked app
npm run dist          # Build packaged app (deprecated, use build)

# Platform-specific builds
npm run dist:win      # Windows
npm run dist:mac      # macOS  
npm run dist:linux    # Linux
```

### Enhanced Build Script

Use the enhanced build script for proper author information:

```bash
# Basic build
./scripts/build-electron-enhanced.sh

# With custom version and author
./scripts/build-electron-enhanced.sh "1.0.0" "Your Name" "your-email@example.com"
```

## 🧪 Testing Builds

### Test Script

```bash
# Test the complete build process
./scripts/test-electron-build.sh
```

This will:
1. ✅ Check dependencies
2. ✅ Build frontend
3. ✅ Test pack build
4. ✅ Test dist build
5. ✅ Verify outputs

### Manual Testing

```bash
# Test frontend build
cd frontend && npm run build

# Test electron build
cd electron && npm run build

# Test unpacked app
cd electron/dist/linux-unpacked && ./nodebook
```

## 📦 Package Types

### Linux Packages
- **AppImage**: Portable executable
- **Deb**: Debian package
- **Rpm**: Red Hat package

### Windows Packages
- **NSIS**: Installer
- **Portable**: Standalone executable

### macOS Packages
- **DMG**: Disk image
- **PKG**: Package installer

## 🔧 Configuration

### Build Configuration

The electron/package.json includes:

```json
{
  "build": {
    "appId": "com.nodebook.app",
    "productName": "NodeBook",
    "directories": {
      "output": "dist"
    },
    "files": [
      "main.js",
      "preload.js",
      "../frontend/dist/**/*",
      "node_modules/**/*"
    ],
    "extraResources": [
      {
        "from": "../backend",
        "to": "backend"
      },
      {
        "from": "../graph_data",
        "to": "graph_data"
      }
    ]
  }
}
```

### Platform-Specific Settings

```json
{
  "linux": {
    "target": [
      {
        "target": "AppImage",
        "arch": ["x64"]
      },
      {
        "target": "deb",
        "arch": ["x64"]
      }
    ],
    "icon": "../frontend/public/nodebook.png",
    "category": "Development"
  }
}
```

## 🐛 Common Issues

### Author Email Required

**Error**: `author email must be provided in the package.json`

**Solution**: Add author information to package.json:

```json
{
  "author": {
    "name": "Your Name",
    "email": "your-email@example.com"
  }
}
```

### Build Script Not Found

**Error**: `npm run dist` not found

**Solution**: Use the correct build script:

```bash
# Instead of npm run dist
npm run build
```

### Frontend Not Built

**Error**: Electron app shows blank screen

**Solution**: Ensure frontend is built before electron:

```bash
cd frontend && npm run build
cd ../electron && npm run build
```

### Missing Dependencies

**Error**: `electron-builder` not found

**Solution**: Install dependencies:

```bash
cd electron && npm install
```

## 📋 Best Practices

### Build Process
1. ✅ Always build frontend first
2. ✅ Include author information
3. ✅ Test unpacked app before packaging
4. ✅ Use semantic versioning
5. ✅ Include proper icons

### Author Information
1. ✅ Use consistent author name
2. ✅ Provide valid email address
3. ✅ Include repository information
4. ✅ Update version numbers
5. ✅ Test on target platforms

### Distribution
1. ✅ Test on clean systems
2. ✅ Include installation instructions
3. ✅ Provide update mechanisms
4. ✅ Monitor for issues
5. ✅ Keep dependencies updated

## 🚀 Quick Start

### For Development
```bash
# Install dependencies
cd frontend && npm install
cd ../electron && npm install

# Start development
cd electron && npm run dev
```

### For Building
```bash
# Build for current platform
./scripts/build-electron-enhanced.sh

# Build with custom info
./scripts/build-electron-enhanced.sh "1.0.0" "Your Name" "your-email@example.com"
```

### For Testing
```bash
# Test build process
./scripts/test-electron-build.sh

# Test unpacked app
cd electron/dist/linux-unpacked && ./nodebook
```

## 📚 Additional Resources

- [Electron Builder Documentation](https://www.electron.build/)
- [Electron Documentation](https://www.electronjs.org/docs)
- [NodeBook Project](https://github.com/your-org/nodebook) 