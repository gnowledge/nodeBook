#!/bin/bash

echo "🚀 Starting NodeBook Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.dev.yml down

# Build and start all services
echo "🔨 Building and starting services..."
docker compose -f docker-compose.dev.yml up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🏥 Checking service health..."

# Check media backend
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Media Backend: Running on http://localhost:3001"
else
    echo "❌ Media Backend: Not responding"
fi

# Check main backend
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Main Backend: Running on http://localhost:3000"
else
    echo "⚠️  Main Backend: Health check not available (may still be starting)"
fi

# Check frontend
if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ Frontend: Running on http://localhost:5173"
else
    echo "⚠️  Frontend: May still be starting (Vite takes a moment)"
fi

echo ""
echo "🎉 Development environment started!"
echo ""
echo "📱 Services:"
echo "   Frontend:     http://localhost:5173"
echo "   Main Backend: http://localhost:3000"
echo "   Media Backend: http://localhost:3001"
echo ""
echo "🔧 Commands:"
echo "   View logs:    docker compose -f docker-compose.dev.yml logs -f"
echo "   Stop all:     docker compose -f docker-compose.dev.yml down"
echo "   Restart:      ./start-dev.sh"
echo ""
echo "📁 Media files will be stored in: ./media-backend/media-data/"
