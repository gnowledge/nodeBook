#!/bin/bash

# SSL certificate renewal script
set -e

DOMAIN=${1:-"your-domain.com"}

if [ "$DOMAIN" = "your-domain.com" ]; then
    echo "Usage: $0 <domain>"
    echo "Example: $0 nodebook.example.com"
    exit 1
fi

echo "🔄 Renewing SSL certificate for $DOMAIN..."

# Update domain in docker-compose.prod.yml if needed
sed -i "s/your-domain.com/$DOMAIN/g" docker-compose.prod.yml

# Renew certificate
docker-compose -f docker-compose.prod.yml run --rm certbot renew

# Reload nginx
docker-compose -f docker-compose.prod.yml restart nginx

echo "✅ SSL certificate renewed successfully!"

# Test the certificate
echo "🧪 Testing renewed certificate..."
sleep 5
if curl -f https://$DOMAIN/health > /dev/null 2>&1; then
    echo "✅ Certificate is working correctly"
else
    echo "⚠️  Certificate test failed"
fi 