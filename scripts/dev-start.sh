#!/bin/bash

# NodeBook Development Startup Script
# This script sets up and starts the development environment

set -e

echo "🚀 Starting NodeBook Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "docker-compose.dev.yml" ]; then
    echo "❌ Please run this script from the NodeBook root directory."
    exit 1
fi

# Create necessary directories if they don't exist
echo "📁 Creating development directories..."
mkdir -p nodebook-base/user_data
mkdir -p nodebook-base/logs

# Set development environment variables
export NODE_ENV=development
export JWT_SECRET=dev-jwt-secret-change-in-production
export JWT_EXPIRES_IN=7d
export SESSION_SECRET=dev-session-secret-change-in-production
export HYPERSWARM_PORT=49737

echo "🔧 Environment variables set:"
echo "   NODE_ENV: $NODE_ENV"
echo "   JWT_SECRET: $JWT_SECRET"
echo "   HYPERSWARM_PORT: $HYPERSWARM_PORT"

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down

# Remove old volumes if requested
if [ "$1" = "--clean" ]; then
    echo "🧹 Cleaning old development data..."
    docker-compose -f docker-compose.dev.yml down -v
    rm -rf nodebook-base/user_data/*
    rm -rf nodebook-base/logs/*
    echo "✅ Development data cleaned."
fi

# Build and start services
echo "🔨 Building development containers..."
docker-compose -f docker-compose.dev.yml build

echo "🚀 Starting development services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "📊 Service Status:"
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "🎉 Development environment is ready!"
echo ""
echo "📱 Frontend (PWA): http://localhost:5173"
echo "🔧 Backend API: http://localhost:3000"
echo "📚 API Docs: http://localhost:3000/api"
echo ""
echo "🔐 Default Admin User:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "   Stop services: docker-compose -f docker-compose.dev.yml down"
echo "   Restart backend: docker-compose -f docker-compose.dev.yml restart backend"
echo "   Restart frontend: docker-compose -f docker-compose.dev.yml restart frontend"
echo ""
echo "🧪 To test the federated features:"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Login with admin/admin123"
echo "   3. Create a new graph"
echo "   4. Test the PWA features (install, offline mode)"
echo "   5. Test data export/import functionality"
echo ""
echo "Happy coding! 🎯"
