#!/bin/bash

# Test Docker deployment for NodeBook
set -e

echo "🧪 Testing NodeBook Docker deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Build images if they don't exist
if ! docker image inspect nodebook-backend:latest > /dev/null 2>&1; then
    echo "📦 Building backend image..."
    docker build -t nodebook-backend:latest ./backend
fi

if ! docker image inspect nodebook-frontend:latest > /dev/null 2>&1; then
    echo "📦 Building frontend image..."
    docker build -t nodebook-frontend:latest ./frontend
fi

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15  # Give more time for post-install script to complete

# Test backend health
echo "🔍 Testing backend health..."
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    docker-compose logs backend
    exit 1
fi

# Test frontend
echo "🔍 Testing frontend..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend is not accessible"
    docker-compose logs frontend
    exit 1
fi

# Test API endpoints
echo "🔍 Testing API endpoints..."
if curl -f http://localhost:8000/docs > /dev/null 2>&1; then
    echo "✅ API documentation is accessible"
else
    echo "❌ API documentation is not accessible"
fi

echo ""
echo "🎉 All tests passed! NodeBook is running successfully."
echo ""
echo "Access the application:"
echo "  Frontend: http://localhost:3000"
echo "  API: http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "To stop the services:"
echo "  docker-compose down" 