#!/bin/bash

# Deploy specific version/tag of NodeBook
set -e

VERSION=${1:-"latest"}
ENVIRONMENT=${2:-"dev"}

if [ "$VERSION" = "latest" ]; then
    echo "Usage: $0 <version/tag> [environment]"
    echo "Examples:"
    echo "  $0 v1.0.0 prod"
    echo "  $0 feature/new-ui dev"
    echo "  $0 main dev"
    exit 1
fi

echo "🚀 Deploying NodeBook version: $VERSION"
echo "Environment: $ENVIRONMENT"

# Create deployment directory
DEPLOY_DIR="deployments/$VERSION-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Clone or checkout specific version
echo "📥 Fetching code version: $VERSION"

if [ -d ".git" ]; then
    # We're in a git repository
    echo "🔄 Checking out version: $VERSION"
    git fetch --all
    git checkout "$VERSION"
    git pull origin "$VERSION" 2>/dev/null || echo "No remote changes to pull"
else
    echo "❌ Not in a git repository. Please run this from the project root."
    exit 1
fi

# Build Docker images with version tag
echo "🐳 Building Docker images for version: $VERSION"
docker build -t "nodebook-backend:$VERSION" ./backend
docker build -t "nodebook-frontend:$VERSION" ./frontend

# Create version-specific docker-compose
echo "📝 Creating deployment configuration..."
cat > "$DEPLOY_DIR/docker-compose.yml" << EOF
version: '3.8'

services:
  backend:
    image: nodebook-backend:$VERSION
    ports:
      - "8000:8000"
    volumes:
      - ./graph_data:/app/graph_data
      - ./logs:/app/logs
    environment:
      - PYTHONPATH=/app
      - NODEBOOK_VERSION=$VERSION
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    image: nodebook-frontend:$VERSION
    ports:
      - "3000:80"
    depends_on:
      - backend
    environment:
      - VITE_API_BASE_URL=http://localhost:8000
      - NODEBOOK_VERSION=$VERSION
    restart: unless-stopped
EOF

# Create production version if needed
if [ "$ENVIRONMENT" = "prod" ]; then
    echo "📝 Creating production configuration..."
    cp docker-compose.prod.yml "$DEPLOY_DIR/"
    sed -i "s/nodebook-backend:latest/nodebook-backend:$VERSION/g" "$DEPLOY_DIR/docker-compose.prod.yml"
    sed -i "s/nodebook-frontend:latest/nodebook-frontend:$VERSION/g" "$DEPLOY_DIR/docker-compose.prod.yml"
fi

# Create deployment script
echo "🔧 Creating deployment script..."
cat > "$DEPLOY_DIR/deploy.sh" << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying NodeBook..."

# Create necessary directories
mkdir -p graph_data/users graph_data/global logs

# Start services
docker-compose up -d

echo "✅ NodeBook deployed successfully!"
echo ""
echo "Access the application:"
echo "  Frontend: http://localhost:3000"
echo "  API: http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop:"
echo "  docker-compose down"
EOF

chmod +x "$DEPLOY_DIR/deploy.sh"

# Create rollback script
echo "🔧 Creating rollback script..."
cat > "$DEPLOY_DIR/rollback.sh" << 'EOF'
#!/bin/bash
set -e

echo "🔄 Rolling back NodeBook..."

# Stop current services
docker-compose down

# Remove version-specific images
docker rmi nodebook-backend:$VERSION nodebook-frontend:$VERSION 2>/dev/null || true

echo "✅ Rollback completed"
EOF

chmod +x "$DEPLOY_DIR/rollback.sh"

# Create version info
echo "📝 Creating version information..."
cat > "$DEPLOY_DIR/version.info" << EOF
Version: $VERSION
Deployed: $(date)
Environment: $ENVIRONMENT
Git Commit: $(git rev-parse HEAD)
Git Branch: $(git branch --show-current)
EOF

echo ""
echo "✅ Version $VERSION prepared for deployment!"
echo ""
echo "Deployment files created in: $DEPLOY_DIR"
echo ""
echo "To deploy:"
echo "  cd $DEPLOY_DIR"
echo "  ./deploy.sh"
echo ""
echo "To rollback:"
echo "  cd $DEPLOY_DIR"
echo "  ./rollback.sh"
echo ""
echo "Available versions:"
docker images | grep nodebook | grep -E "(backend|frontend)" | head -10 