#!/bin/bash

# Comprehensive release script for NodeBook
set -e

VERSION=${1:-"0.1.0"}
PLATFORM=${2:-"all"}

echo "🚀 Building NodeBook Release v$VERSION"
echo "Platform: $PLATFORM"
echo ""

# Update version in package.json files
echo "📝 Updating version numbers..."
node -e "
const fs = require('fs');
const updateVersion = (file) => {
  if (fs.existsSync(file)) {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    pkg.version = '$VERSION';
    fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
    console.log('Updated ' + file);
  }
};
updateVersion('frontend/package.json');
updateVersion('electron/package.json');
"

# Build Docker images
echo "🐳 Building Docker images..."
./scripts/build-docker.sh

# Build Electron packages
echo "📱 Building Electron packages..."
./scripts/build-electron.sh

# Run post-install script for backend
echo "🔧 Running post-install script..."
cd backend && python scripts/post_install.py && cd ..

# Create release directory
RELEASE_DIR="releases/v$VERSION"
mkdir -p "$RELEASE_DIR"

# Copy Docker images
echo "📦 Saving Docker images..."
docker save nodebook-backend:latest | gzip > "$RELEASE_DIR/nodebook-backend-v$VERSION.tar.gz"
docker save nodebook-frontend:latest | gzip > "$RELEASE_DIR/nodebook-frontend-v$VERSION.tar.gz"

# Copy Electron packages
echo "📦 Copying Electron packages..."
cp -r electron/dist/* "$RELEASE_DIR/"

# Create release notes
echo "📝 Creating release notes..."
cat > "$RELEASE_DIR/RELEASE_NOTES.md" << EOF
# NodeBook v$VERSION

## What's New
- Docker support for easy deployment
- Electron desktop application
- Improved backend management
- Enhanced user interface

## Installation

### Docker (Recommended for Servers)
\`\`\`bash
# Load Docker images
docker load < nodebook-backend-v$VERSION.tar.gz
docker load < nodebook-frontend-v$VERSION.tar.gz

# Run with docker-compose
docker-compose up
\`\`\`

### Desktop Application
Download the appropriate package for your platform:
- Windows: NodeBook Setup v$VERSION.exe
- macOS: NodeBook v$VERSION.dmg
- Linux: NodeBook v$VERSION.AppImage

## System Requirements
- Docker (for server deployment)
- Node.js 18+ (for development)
- Python 3.11+ (for backend development)

## Documentation
See the docs/ directory for detailed documentation.
EOF

# Create deployment scripts
echo "🔧 Creating deployment scripts..."

# Docker deployment script
cat > "$RELEASE_DIR/deploy-docker.sh" << 'EOF'
#!/bin/bash
echo "🐳 Deploying NodeBook with Docker..."

# Load images
docker load < nodebook-backend-v*.tar.gz
docker load < nodebook-frontend-v*.tar.gz

# Create docker-compose.yml
cat > docker-compose.yml << 'DOCKER_COMPOSE'
version: '3.8'
services:
  backend:
    image: nodebook-backend:latest
    ports:
      - "8000:8000"
    volumes:
      - ./graph_data:/app/graph_data
      - ./logs:/app/logs
    restart: unless-stopped

  frontend:
    image: nodebook-frontend:latest
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: unless-stopped
DOCKER_COMPOSE

echo "✅ NodeBook deployed successfully!"
echo "Access the application at: http://localhost:3000"
echo "API available at: http://localhost:8000"
EOF

chmod +x "$RELEASE_DIR/deploy-docker.sh"

echo ""
echo "✅ Release v$VERSION built successfully!"
echo ""
echo "Release files available in: $RELEASE_DIR"
echo ""
echo "Contents:"
ls -la "$RELEASE_DIR"
echo ""
echo "To deploy:"
echo "  cd $RELEASE_DIR"
echo "  ./deploy-docker.sh"
echo ""
echo "Or install the desktop application for your platform." 