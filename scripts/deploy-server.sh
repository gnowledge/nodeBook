#!/bin/bash

# NodeBook Server Deployment Script
# This script deploys nodeBook on a server with custom ports to avoid conflicts

set -e

echo "🚀 NodeBook Server Deployment Script"
echo "====================================="

# Configuration
DOMAIN=${1:-"your-domain.com"}
EMAIL=${2:-"your-email@example.com"}
USE_SSL=${3:-"false"}

echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "SSL: $USE_SSL"
echo ""

# Step 1: Check prerequisites
echo "📋 Checking prerequisites..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if ports are available
echo "🔍 Checking port availability..."
PORTS=(3001 8001 8080 8443)
for port in "${PORTS[@]}"; do
    if netstat -tulpn 2>/dev/null | grep ":$port " > /dev/null; then
        echo "⚠️  Port $port is already in use. You may need to change it in docker-compose.server.yml"
    else
        echo "✅ Port $port is available"
    fi
done

# Step 2: Make scripts executable
echo ""
echo "🔧 Making scripts executable..."
chmod +x scripts/*.sh

# Step 3: Build Docker images
echo ""
echo "🐳 Building Docker images..."
./scripts/build-docker.sh

# Step 4: Create necessary directories
echo ""
echo "📁 Creating necessary directories..."
mkdir -p nginx/ssl
mkdir -p certbot/conf
mkdir -p certbot/www
mkdir -p graph_data/users
mkdir -p logs

# Step 5: Update configuration if SSL is enabled
if [ "$USE_SSL" = "true" ]; then
    echo ""
    echo "🔒 Configuring SSL..."
    
    # Update nginx configuration
    if [ -f "nginx/nginx.conf" ]; then
        sed -i "s/your-domain.com/$DOMAIN/g" nginx/nginx.conf
        echo "✅ Updated nginx configuration"
    fi
    
    # Update docker-compose.server.yml
    sed -i "s/your-domain.com/$DOMAIN/g" docker-compose.server.yml
    sed -i "s/your-email@example.com/$EMAIL/g" docker-compose.server.yml
    echo "✅ Updated docker-compose configuration"
fi

# Step 6: Start services
echo ""
echo "🚀 Starting services..."

if [ "$USE_SSL" = "true" ]; then
    # Start with SSL configuration
    docker-compose -f docker-compose.server.yml up -d nginx backend frontend
    
    echo "⏳ Waiting for services to start..."
    sleep 10
    
    echo "🔒 Obtaining SSL certificate..."
    docker-compose -f docker-compose.server.yml run --rm certbot
    
    echo "🔄 Reloading nginx with SSL..."
    docker-compose -f docker-compose.server.yml restart nginx
else
    # Start without SSL
    docker-compose -f docker-compose.server.yml up -d backend frontend
fi

# Step 7: Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 15

# Step 8: Health checks
echo ""
echo "🏥 Running health checks..."

# Check backend
if curl -f http://localhost:8001/api/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend health check failed"
fi

# Check frontend
if curl -f http://localhost:3001 > /dev/null 2>&1; then
    echo "✅ Frontend is accessible"
else
    echo "⚠️  Frontend check failed"
fi

# Check nginx if SSL is enabled
if [ "$USE_SSL" = "true" ]; then
    if curl -f -k https://localhost:8443/health > /dev/null 2>&1; then
        echo "✅ Nginx with SSL is working"
    else
        echo "⚠️  Nginx SSL check failed"
    fi
fi

# Step 9: Display access information
echo ""
echo "🎉 NodeBook deployed successfully!"
echo ""
echo "📱 Access your application:"
echo "  Frontend: http://$(hostname -I | awk '{print $1}'):3001"
echo "  Backend API: http://$(hostname -I | awk '{print $1}'):8001"
echo "  API Documentation: http://$(hostname -I | awk '{print $1}'):8001/docs"

if [ "$USE_SSL" = "true" ]; then
    echo "  Nginx (HTTPS): https://$DOMAIN"
    echo "  Nginx (HTTP): http://$(hostname -I | awk '{print $1}'):8080"
fi

echo ""
echo "🔑 Admin credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo "  ⚠️  IMPORTANT: Change the password after first login!"
echo ""
echo "📊 Management commands:"
echo "  View logs: docker-compose -f docker-compose.server.yml logs -f"
echo "  Stop services: docker-compose -f docker-compose.server.yml down"
echo "  Restart services: docker-compose -f docker-compose.server.yml restart"
echo "  Check status: docker-compose -f docker-compose.server.yml ps"
echo ""
echo "🔄 SSL certificate will auto-renew every 60 days"
echo ""
echo "✅ Deployment complete!" 