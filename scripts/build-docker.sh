#!/bin/bash

# Build Docker images for NodeBook
set -e

echo "🐳 Building NodeBook Docker images..."

# Build backend image
echo "📦 Building backend image..."
docker build -t nodebook-backend:latest ./backend

# Build frontend image
echo "📦 Building frontend image..."
docker build -t nodebook-frontend:latest ./frontend

# Build development images
echo "📦 Building development images..."
docker build -t nodebook-backend:dev -f ./backend/Dockerfile.dev ./backend
docker build -t nodebook-frontend:dev -f ./frontend/Dockerfile.dev ./frontend

echo "✅ Docker images built successfully!"
echo ""
echo "Available images:"
echo "  - nodebook-backend:latest"
echo "  - nodebook-frontend:latest"
echo "  - nodebook-backend:dev"
echo "  - nodebook-frontend:dev"
echo ""
echo "To run the application:"
echo "  docker-compose up"
echo ""
echo "To run in development mode:"
echo "  docker-compose --profile dev up" 