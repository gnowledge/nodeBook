# NodeBook Production Deployment Guide

This guide covers deploying NodeBook with all microservices, SSL certificates, and Nginx in a production environment.

## 🏗️ Architecture Overview

The production deployment includes:

- **NodeBook Base**: Main application (port 3000)
- **WordNet Service**: Python/FastAPI service (port 8000)
- **NLP Service**: Node.js parsing service (port 8001)
- **Media Backend**: File/media handling service (port 8002)
- **Nginx**: Reverse proxy with SSL termination
- **Redis**: Session management and caching
- **Let's Encrypt**: SSL certificate management

## 📋 Prerequisites

### System Requirements
- Ubuntu 20.04+ or CentOS 8+
- Docker 20.10+
- Docker Compose 2.0+
- OpenSSL
- Domain name pointing to your server
- Ports 80 and 443 open

### Software Installation
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install OpenSSL
sudo apt update
sudo apt install openssl
```

## 🚀 Quick Deployment

### 1. Clone and Setup
```bash
git clone <your-repo>
cd nodeBook
```

### 2. Configure Environment
```bash
# Copy and edit the production environment file
cp env.production .env.production
nano .env.production
```

**Required changes in `.env.production`:**
```bash
DOMAIN=your-actual-domain.com
EMAIL=your-email@domain.com
JWT_SECRET=your-super-secure-jwt-secret-key
```

### 3. Run Production Deployment
```bash
./init-production.sh
```

The script will:
- Validate your configuration
- Create necessary directories
- Set up SSL certificates
- Start all services
- Verify deployment health

## 🔧 Manual Deployment Steps

If you prefer manual deployment or need to troubleshoot:

### 1. Create Directories
```bash
mkdir -p nginx/ssl nginx/logs data/backups data/logs
```

### 2. Update Nginx Configuration
```bash
# Copy production config
cp nginx/conf.d/production.conf nginx/conf.d/app.conf

# Replace domain placeholder
sed -i "s/YOUR_DOMAIN.COM/your-domain.com/g" nginx/conf.d/app.conf
```

### 3. Initialize SSL
```bash
# Create dummy certificate
mkdir -p certbot-data/etc/letsencrypt/live/your-domain.com
openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
    -keyout "certbot-data/etc/letsencrypt/live/your-domain.com/privkey.pem" \
    -out "certbot-data/etc/letsencrypt/live/your-domain.com/fullchain.pem" \
    -subj "/CN=localhost"

# Start Nginx temporarily
docker-compose -f docker-compose.prod.yml up -d nginx

# Wait for Nginx to be ready
sleep 10

# Remove dummy certificate and get real one
docker-compose -f docker-compose.prod.yml run --rm --entrypoint \
    "rm -Rf /etc/letsencrypt/live/your-domain.com && \
    rm -Rf /etc/letsencrypt/archive/your-domain.com && \
    rm -Rf /etc/letsencrypt/renewal/your-domain.com.conf" certbot

docker-compose -f docker-compose.prod.yml run --rm --entrypoint \
    "certbot certonly --webroot -w /var/lib/letsencrypt \
        --email your-email@domain.com \
        -d your-domain.com \
        --rsa-key-size 4096 \
        --agree-tos \
        --force-renewal" certbot

# Stop Nginx
docker-compose -f docker-compose.prod.yml down

# Clean up
rm -rf certbot-data
```

### 4. Start All Services
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Service Management

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f nodebook-base
docker-compose -f docker-compose.prod.yml logs -f wordnet-service
docker-compose -f docker-compose.prod.yml logs -f nginx-proxy
```

### Service Status
```bash
docker-compose -f docker-compose.prod.yml ps
```

### Restart Services
```bash
# All services
docker-compose -f docker-compose.prod.yml restart

# Specific service
docker-compose -f docker-compose.prod.yml restart nodebook-base
```

### Update Services
```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Restart with new images
docker-compose -f docker-compose.prod.yml up -d
```

## 🔒 Security Features

### SSL/TLS Configuration
- TLS 1.2 and 1.3 only
- Strong cipher suites
- HSTS headers
- SSL stapling

### Security Headers
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Content-Security-Policy
- Strict-Transport-Security

### Rate Limiting
- API endpoints: 10 requests/second
- Login endpoints: 5 requests/second

## 📈 Monitoring and Health Checks

### Health Endpoints
- Main app: `https://your-domain.com/health`
- WordNet: `https://your-domain.com/api/wordnet/health`
- NLP: `https://your-domain.com/api/nlp/health`
- Media: `https://your-domain.com/api/media/health`

### Docker Health Checks
All services include health checks that monitor:
- Service availability
- Response times
- Resource usage

## 🗄️ Data Management

### Volume Locations
- **NodeBook data**: `/var/lib/docker/volumes/nodebook_nodebook-data`
- **WordNet data**: `/var/lib/docker/volumes/nodebook_wordnet-data`
- **NLP data**: `/var/lib/docker/volumes/nodebook_nlp-data`
- **Media data**: `/var/lib/docker/volumes/nodebook_media-data`
- **SSL certificates**: `/var/lib/docker/volumes/nodebook_certbot-etc`

### Backup Strategy
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup volumes
docker run --rm -v nodebook_nodebook-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/nodebook-data.tar.gz -C /data .
docker run --rm -v nodebook_wordnet-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/wordnet-data.tar.gz -C /data .
docker run --rm -v nodebook_nlp-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/nlp-data.tar.gz -C /data .
docker run --rm -v nodebook_media-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/media-data.tar.gz -C /data .

echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x backup.sh
```

## 🚨 Troubleshooting

### Common Issues

#### SSL Certificate Issues
```bash
# Check certificate status
docker-compose -f docker-compose.prod.yml run --rm certbot certificates

# Renew certificates manually
docker-compose -f docker-compose.prod.yml run --rm certbot renew
```

#### Service Won't Start
```bash
# Check service logs
docker-compose -f docker-compose.prod.yml logs service-name

# Check container status
docker ps -a

# Restart specific service
docker-compose -f docker-compose.prod.yml restart service-name
```

#### Port Conflicts
```bash
# Check what's using ports 80/443
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Stop conflicting services
sudo systemctl stop apache2  # if Apache is running
sudo systemctl stop nginx    # if system Nginx is running
```

### Log Analysis
```bash
# Follow all logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100

# Search for errors
docker-compose -f docker-compose.prod.yml logs | grep -i error

# Check Nginx access logs
docker exec nginx-proxy tail -f /var/log/nginx/access.log
```

## 🔄 Maintenance

### Certificate Renewal
Certificates auto-renew every 12 hours. Monitor renewal logs:
```bash
docker-compose -f docker-compose.prod.yml logs certbot
```

### Updates
```bash
# Update images
docker-compose -f docker-compose.prod.yml pull

# Restart with updates
docker-compose -f docker-compose.prod.yml up -d

# Clean up old images
docker image prune -f
```

### Scaling
To scale specific services:
```bash
# Scale WordNet service to 3 instances
docker-compose -f docker-compose.prod.yml up -d --scale wordnet-service=3

# Scale NLP service to 2 instances
docker-compose -f docker-compose.prod.yml up -d --scale nlp-service=2
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

## 🆘 Support

For deployment issues:
1. Check the troubleshooting section above
2. Review service logs
3. Verify configuration files
4. Check system resources (CPU, memory, disk)
5. Ensure firewall rules allow necessary traffic

---

**Note**: This deployment configuration is designed for production use. Always test in a staging environment first and ensure you have proper backups before deploying to production.
