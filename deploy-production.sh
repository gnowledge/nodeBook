#!/bin/bash

# NodeBook Production Deployment Script
# This script deploys NodeBook with nginx proxy manager
# Option to enable/disable admin interface access

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env.deploy exists
if [ ! -f ".env.deploy" ]; then
    print_error ".env.deploy file not found!"
    print_status "Please create .env.deploy from env.deploy.template"
    exit 1
fi

# Ask about admin interface access
echo "Nginx Proxy Manager Admin Interface Access:"
echo "1) Enable admin interface (port 81 open)"
echo "2) Disable admin interface (port 81 closed) - Production mode"
echo "3) Keep current configuration"
read -p "Choose option (1-3): " admin_option

case $admin_option in
    1)
        print_status "Deploying with admin interface enabled..."
        COMPOSE_FILE="docker-compose-deploy.yml"
        ;;
    2)
        print_status "Deploying in production mode (admin interface disabled)..."
        COMPOSE_FILE="docker-compose-production.yml"
        ;;
    3)
        print_status "Keeping current configuration..."
        # Check current container status
        if docker ps | grep -q "nodebook-nginx-proxy-manager"; then
            print_status "Nginx proxy manager is running"
        else
            print_error "Nginx proxy manager is not running"
            exit 1
        fi
        exit 0
        ;;
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac

# Deploy the services
print_status "Deploying NodeBook with $COMPOSE_FILE..."

# Stop existing services
print_status "Stopping existing services..."
docker-compose -f $COMPOSE_FILE --env-file .env.deploy down

# Pull latest images
print_status "Pulling latest images..."
docker-compose -f $COMPOSE_FILE --env-file .env.deploy pull

# Start services
print_status "Starting services..."
docker-compose -f $COMPOSE_FILE --env-file .env.deploy up -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 10

# Check service status
print_status "Checking service status..."
docker-compose -f $COMPOSE_FILE --env-file .env.deploy ps

print_status "Deployment complete!"

# Show access information
if [ "$admin_option" = "1" ]; then
    print_status "Admin interface available at: http://your-server:81"
    print_warning "Remember to disable admin access in production!"
fi

print_status "NodeBook should be available at your configured domain"
print_status "To backup nginx configs: ./backup-nginx-config.sh"
