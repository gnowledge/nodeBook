#!/bin/bash

if ! [ -x "$(command -v docker-compose)" ]; then
  echo 'Error: docker-compose is not installed.' >&2
  exit 1
fi

read -p "Enter your domain name (e.g., nodebook.example.com): " DOMAIN
read -p "Enter your email address (for Let\'s Encrypt notifications): " EMAIL

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Error: Domain and email are required."
  exit 1
fi

# Create a temporary dummy Nginx config
sed "s/YOUR_DOMAIN.COM/$DOMAIN/g" ./nginx/conf.d/app.conf > ./nginx/conf.d/default.conf

# Create dummy certificate directories and files for Nginx to start
echo "### Creating dummy certificate for $DOMAIN ..."
mkdir -p ./certbot-data/etc/letsencrypt/live/$DOMAIN
openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
    -keyout "./certbot-data/etc/letsencrypt/live/$DOMAIN/privkey.pem" \
    -out "./certbot-data/etc/letsencrypt/live/$DOMAIN/fullchain.pem" \
    -subj "/CN=localhost"
echo

# Start Nginx with the dummy certificate
echo "### Starting Nginx ..."
docker-compose -f docker-compose-ssl.yml up --force-recreate -d nginx
echo

# Request the real certificate from Let's Encrypt
echo "### Deleting dummy certificate ..."
docker-compose -f docker-compose-ssl.yml run --rm --entrypoint \
  "rm -Rf /etc/letsencrypt/live/$DOMAIN && \
  rm -Rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -Rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot
echo

echo "### Requesting Let's Encrypt certificate for $DOMAIN ..."
# Request the certificate
docker-compose -f docker-compose-ssl.yml run --rm --entrypoint \
  "certbot certonly --webroot -w /var/lib/letsencrypt \
    --email $EMAIL \
    -d $DOMAIN \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal" certbot
echo

# Stop Nginx
echo "### Stopping Nginx ..."
docker-compose -f docker-compose-ssl.yml down
echo

# Replace placeholders in the final Nginx config
sed -i "s/YOUR_DOMAIN.COM/$DOMAIN/g" ./nginx/conf.d/app.conf

# Clean up dummy config
rm ./nginx/conf.d/default.conf
rm -rf ./certbot-data

echo "### SSL setup complete!"
echo "### You can now start the services with: docker-compose -f docker-compose-ssl.yml up -d"
