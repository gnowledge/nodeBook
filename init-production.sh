#!/bin/bash

# NodeBook Production Deployment Script
# This script sets up the complete production environment with SSL certificates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking system requirements..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    if ! command -v openssl &> /dev/null; then
        print_error "OpenSSL is not installed. Please install OpenSSL first."
        exit 1
    fi
    
    print_success "All requirements are met."
}

# Validate environment configuration
validate_environment() {
  print_status "Validating environment configuration..."
  
  # Check for both possible names
  print_status "Current working directory: $(pwd)"
  print_status "Looking for environment files..."
  
  if [ -f ".env.production" ]; then
    ENV_FILE=".env.production"
    print_status "Found .env.production"
  elif [ -f "env.production" ]; then
    ENV_FILE="env.production"
    print_status "Found env.production"
  else
    print_error "Environment file not found in current directory"
    print_error "Files in current directory:"
    ls -la | grep -E "(env|\.env)" || print_error "No env files found"
    print_error "Please create either .env.production or env.production"
    print_error "Recommended: cp env.production .env.production"
    exit 1
  fi
  
  print_status "Using environment file: $ENV_FILE"
  print_status "File contents preview:"
  head -5 "$ENV_FILE" | while read line; do
    print_status "  $line"
  done
  
  # Source the environment file
  source "$ENV_FILE"
  
  # Debug: Show what was loaded
  print_status "Debug: Environment variables loaded:"
  print_status "DOMAIN='$DOMAIN'"
  print_status "EMAIL='$EMAIL'"
  print_status "JWT_SECRET='$JWT_SECRET'"
    
  # Check required variables
  if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "your-domain.com" ]; then
    print_error "Please set a valid DOMAIN in $ENV_FILE"
    print_error "Current DOMAIN value: '$DOMAIN'"
    exit 1
  fi
    
    if [ -z "$EMAIL" ] || [ "$EMAIL" = "your-email@domain.com" ]; then
      print_error "Please set a valid EMAIL in $ENV_FILE"
      exit 1
    fi
    
    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-this-in-production" ]; then
      print_error "Please set a secure JWT_SECRET in $ENV_FILE"
      exit 1
    fi
    
    print_success "Environment configuration is valid."
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p nginx/ssl
    mkdir -p nginx/logs
    mkdir -p data/backups
    mkdir -p data/logs
    
    print_success "Directories created successfully."
}

# Update Nginx configuration with domain
update_nginx_config() {
    print_status "Updating Nginx configuration with domain: $DOMAIN"
    
    # Copy production config to app.conf
    cp nginx/conf.d/production.conf nginx/conf.d/app.conf
    
    # Replace domain placeholder
    sed -i "s/YOUR_DOMAIN.COM/$DOMAIN/g" nginx/conf.d/app.conf
    
    print_success "Nginx configuration updated."
}

# Initialize SSL certificates
init_ssl() {
    print_status "Initializing SSL certificates for domain: $DOMAIN"
    
    # Create dummy certificate for initial Nginx start
    mkdir -p certbot-data/etc/letsencrypt/live/$DOMAIN
    
    openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
        -keyout "certbot-data/etc/letsencrypt/live/$DOMAIN/privkey.pem" \
        -out "certbot-data/etc/letsencrypt/live/$DOMAIN/fullchain.pem" \
        -subj "/CN=localhost"
    
    print_success "Dummy SSL certificate created."
}

# Start services and get real SSL certificate
setup_ssl() {
    print_status "Starting services to obtain real SSL certificate..."
    
    # Start Nginx with dummy certificate
    docker-compose -f docker-compose.prod.yml up -d nginx
    
    # Wait for Nginx to be ready
    print_status "Waiting for Nginx to be ready..."
    sleep 10
    
    # Remove dummy certificate
    docker-compose -f docker-compose.prod.yml run --rm --entrypoint \
        "rm -Rf /etc/letsencrypt/live/$DOMAIN && \
        rm -Rf /etc/letsencrypt/archive/$DOMAIN && \
        rm -Rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot
    
    # Request real certificate
    print_status "Requesting Let's Encrypt certificate..."
    docker-compose -f docker-compose.prod.yml run --rm --entrypoint \
        "certbot certonly --webroot -w /var/lib/letsencrypt \
            --email $EMAIL \
            -d $DOMAIN \
            --rsa-key-size 4096 \
            --agree-tos \
            --force-renewal" certbot
    
    # Stop Nginx
    docker-compose -f docker-compose.prod.yml down
    
    # Clean up dummy data
    rm -rf certbot-data
    
    print_success "SSL certificate obtained successfully."
}

# Start all services
start_services() {
    print_status "Starting all production services..."
    
    docker-compose -f docker-compose.prod.yml up -d
    
    print_success "All services started successfully."
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Wait for services to be ready
    sleep 15
    
    # Check health endpoints
    if curl -f -s "https://$DOMAIN/health" > /dev/null; then
        print_success "Main application is healthy."
    else
        print_warning "Main application health check failed."
    fi
    
    if curl -f -s "https://$DOMAIN/api/wordnet/health" > /dev/null; then
        print_success "WordNet service is healthy."
    else
        print_warning "WordNet service health check failed."
    fi
    
    if curl -f -s "https://$DOMAIN/api/nlp/health" > /dev/null; then
        print_success "NLP service is healthy."
    else
        print_warning "NLP service health check failed."
    fi
    
    if curl -f -s "https://$DOMAIN/api/media/health" > /dev/null; then
        print_success "Media service is healthy."
    else
        print_warning "Media service health check failed."
    fi
    
    print_success "Deployment verification completed."
}

# Main execution
main() {
    echo "=========================================="
    echo "NodeBook Production Deployment Script"
    echo "=========================================="
    echo
    
    check_requirements
    validate_environment
    create_directories
    update_nginx_config
    init_ssl
    setup_ssl
    start_services
    verify_deployment
    
    echo
    echo "=========================================="
    print_success "Production deployment completed successfully!"
    echo "=========================================="
    echo
    echo "Your NodeBook application is now available at:"
    echo "  https://$DOMAIN"
    echo
    echo "To monitor services:"
    echo "  docker-compose -f docker-compose.prod.yml logs -f"
    echo
    echo "To stop services:"
    echo "  docker-compose -f docker-compose.prod.yml down"
    echo
    echo "To update services:"
    echo "  docker-compose -f docker-compose.prod.yml pull"
    echo "  docker-compose -f docker-compose.prod.yml up -d"
    echo
}

# Run main function
main "$@"
