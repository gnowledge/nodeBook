#!/bin/bash

# NodeBook SSL Certificate Setup Script
# This script sets up Let's Encrypt SSL certificates for NodeBook

set -e

# Configuration
DOMAIN_NAME=${DOMAIN_NAME:-"yourdomain.com"}
EMAIL=${ADMIN_EMAIL:-"admin@yourdomain.com"}

echo "🔐 Setting up SSL certificates for $DOMAIN_NAME"

# Check if domain is provided
if [ -z "$DOMAIN_NAME" ] || [ "$DOMAIN_NAME" = "yourdomain.com" ]; then
    echo "❌ Please set DOMAIN_NAME environment variable"
    echo "   Example: DOMAIN_NAME=nodebook.co.in ./setup-ssl.sh"
    exit 1
fi

# Update nginx configuration with actual domain
echo "📝 Updating nginx configuration for $DOMAIN_NAME"
sed -i "s/yourdomain.com/$DOMAIN_NAME/g" nginx/conf.d/default.conf

# Create Let's Encrypt directory
echo "📁 Creating Let's Encrypt directory"
mkdir -p nginx-letsencrypt

# Start nginx for ACME challenge
echo "🚀 Starting nginx for ACME challenge"
docker-compose -f docker-compose-deploy.yml up -d nginx

# Wait for nginx to start
echo "⏳ Waiting for nginx to start..."
sleep 10

# Generate SSL certificate using certbot
echo "🔑 Generating SSL certificate with Let's Encrypt"
docker run --rm \
    -v "$(pwd)/nginx-letsencrypt:/etc/letsencrypt" \
    -v "$(pwd)/nginx-data:/var/www/html" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/html \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --domains "$DOMAIN_NAME,www.$DOMAIN_NAME"

# Check if certificate was generated
if [ -f "nginx-letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]; then
    echo "✅ SSL certificate generated successfully!"
    echo "📋 Certificate details:"
    echo "   Domain: $DOMAIN_NAME"
    echo "   Certificate: nginx-letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
    echo "   Private Key: nginx-letsencrypt/live/$DOMAIN_NAME/privkey.pem"
    
    # Restart nginx with SSL
    echo "🔄 Restarting nginx with SSL configuration"
    docker-compose -f docker-compose-deploy.yml restart nginx
    
    echo "🎉 SSL setup complete!"
    echo "🌐 Your NodeBook is now available at: https://$DOMAIN_NAME"
else
    echo "❌ SSL certificate generation failed"
    echo "🔍 Check the logs above for errors"
    exit 1
fi

# Setup automatic renewal
echo "🔄 Setting up automatic certificate renewal"
cat > renew-ssl.sh << EOF
#!/bin/bash
docker run --rm \\
    -v "$(pwd)/nginx-letsencrypt:/etc/letsencrypt" \\
    -v "$(pwd)/nginx-data:/var/www/html" \\
    certbot/certbot renew \\
    --webroot \\
    --webroot-path=/var/www/html

# Reload nginx after renewal
docker-compose -f docker-compose-deploy.yml exec nginx nginx -s reload
EOF

chmod +x renew-ssl.sh

echo "📅 Add this to your crontab for automatic renewal:"
echo "   0 12 * * * $(pwd)/renew-ssl.sh >> $(pwd)/ssl-renewal.log 2>&1"

echo ""
echo "🎯 Next steps:"
echo "1. Test your site: https://$DOMAIN_NAME"
echo "2. Set up automatic renewal (see above)"
echo "3. Remove port 81 from docker-compose-deploy.yml"
echo "4. Restart services: docker-compose -f docker-compose-deploy.yml restart"
