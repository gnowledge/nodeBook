#!/bin/bash

# Production deployment script with Let's Encrypt SSL
set -e

DOMAIN=${1:-"your-domain.com"}
EMAIL=${2:-"your-email@example.com"}

if [ "$DOMAIN" = "your-domain.com" ] || [ "$EMAIL" = "your-email@example.com" ]; then
    echo "Usage: $0 <domain> <email>"
    echo "Example: $0 nodebook.example.com admin@example.com"
    exit 1
fi

echo "🚀 Deploying NodeBook to production..."
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"

# Create necessary directories
mkdir -p nginx/ssl
mkdir -p certbot/conf
mkdir -p certbot/www

# Update nginx configuration with domain
echo "📝 Updating nginx configuration..."
sed -i "s/your-domain.com/$DOMAIN/g" nginx/nginx.conf

# Update docker-compose.prod.yml with domain and email
echo "📝 Updating production docker-compose..."
sed -i "s/your-domain.com/$DOMAIN/g" docker-compose.prod.yml
sed -i "s/your-email@example.com/$EMAIL/g" docker-compose.prod.yml

# Build Docker images
echo "🐳 Building Docker images..."
./scripts/build-docker.sh

# Start services without SSL first
echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d nginx backend frontend

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Get SSL certificate
echo "🔒 Obtaining SSL certificate from Let's Encrypt..."
docker-compose -f docker-compose.prod.yml run --rm certbot

# Reload nginx with SSL
echo "🔄 Reloading nginx with SSL..."
docker-compose -f docker-compose.prod.yml restart nginx

# Test SSL
echo "🧪 Testing SSL configuration..."
sleep 5
if curl -f -k https://$DOMAIN/health > /dev/null 2>&1; then
    echo "✅ SSL is working correctly"
else
    echo "⚠️  SSL test failed, but deployment may still be working"
fi

echo ""
echo "🎉 NodeBook deployed successfully!"
echo ""
echo "Access your application:"
echo "  HTTPS: https://$DOMAIN"
echo "  API: https://$DOMAIN/api"
echo "  API Docs: https://$DOMAIN/api/docs"
echo ""
echo "SSL certificate will auto-renew every 60 days"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "To stop:"
echo "  docker-compose -f docker-compose.prod.yml down" 