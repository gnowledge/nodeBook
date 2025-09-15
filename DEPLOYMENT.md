# NodeBook Production Deployment Guide

This guide covers deploying NodeBook to production with NestJS backend, Keycloak authentication, and SSL certificates.

## Prerequisites

- Docker and Docker Compose installed
- Domain name pointing to your server
- Basic understanding of Docker and reverse proxies

## Quick Start

1. **Clone and prepare the repository:**
   ```bash
   git clone <your-repo>
   cd nodeBook
   ```

2. **Set up environment variables:**
   ```bash
   cp deployment.env.example .env.deploy
   # Edit .env.deploy with your values
   ```

3. **Deploy with Docker Compose:**
   ```bash
   docker compose -f docker-compose-deploy.yml --env-file .env.deploy up -d
   ```

4. **Configure SSL certificates:**
   - Access Nginx Proxy Manager at `http://your-domain.com:81`
   - Create proxy hosts for your services
   - Enable SSL certificates

## Environment Variables

### Required Variables

- `DOMAIN_NAME`: Your domain name (e.g., `nodebook.example.com`)
- `KEYCLOAK_ADMIN_PASSWORD`: Secure password for Keycloak admin
- `KEYCLOAK_CLIENT_SECRET`: Client secret from Keycloak realm
- `JWT_SECRET`: Secure JWT secret (32+ characters)

### Optional Variables

- `KEYCLOAK_ADMIN_USER`: Keycloak admin username (default: `admin`)
- `HTTP_PORT`: HTTP port (default: `80`)
- `HTTPS_PORT`: HTTPS port (default: `443`)
- `ADMIN_PORT`: Nginx Proxy Manager admin port (default: `81`)

## Services Overview

### Core Services

- **nodebook-p2p**: NestJS backend with ES modules
- **keycloak**: Authentication service
- **frontend**: React frontend (static build)
- **nginx-proxy-manager**: SSL certificates and reverse proxy

### Supporting Services

- **media-backend**: File uploads and media management
- **nlp-service**: Natural language processing
- **wordnet-service**: WordNet integration
- **signaling-server**: WebRTC collaboration

## Keycloak Configuration

1. **Access Keycloak Admin Console:**
   - URL: `https://auth.your-domain.com`
   - Username: `admin`
   - Password: `$KEYCLOAK_ADMIN_PASSWORD`

2. **Create Realm:**
   - Create realm named `nodebook`
   - Configure realm settings

3. **Create Client:**
   - Client ID: `nodebook-frontend`
   - Client Protocol: `openid-connect`
   - Access Type: `confidential`
   - Valid Redirect URIs: `https://your-domain.com/*`

4. **Get Client Secret:**
   - Copy the client secret to `KEYCLOAK_CLIENT_SECRET`

## SSL Certificate Setup

1. **Access Nginx Proxy Manager:**
   - URL: `http://your-domain.com:81`
   - Default login: `admin@example.com` / `changeme`

2. **Create Proxy Hosts:**
   - **Main App**: `your-domain.com` → `frontend:3004`
   - **API**: `your-domain.com/api` → `nodebook-p2p:3000`
   - **Auth**: `auth.your-domain.com` → `keycloak:8080`
   - **Media**: `your-domain.com/media` → `media-backend:3001`
   - **NLP**: `your-domain.com/nlp` → `nlp-service:3002`
   - **WordNet**: `your-domain.com/wordnet` → `wordnet-service:3005`
   - **Signaling**: `signal.your-domain.com` → `signaling-server:4444`

3. **Enable SSL:**
   - Request Let's Encrypt certificates
   - Enable "Force SSL" and "HTTP/2 Support"

## NestJS Backend Features

### API Endpoints

- **Health Check**: `GET /api/health`
- **API Documentation**: `GET /api/docs` (Swagger UI)
- **Graph Management**: `GET/POST/PUT/DELETE /api/graphs/*`
- **Schema Management**: `GET/POST/PUT/DELETE /api/schema/*`
- **Scientific Library**: `GET /api/scientific/*`
- **Collaboration**: `GET/POST /api/collab/*`
- **Version Control**: `GET/POST /api/graphs/:id/versions/*`

### Authentication

- JWT tokens issued by Keycloak
- Bearer token authentication
- Role-based access control
- Secure session management

## Monitoring and Maintenance

### Health Checks

All services include health checks:
```bash
# Check service status
docker compose -f docker-compose-deploy.yml ps

# View logs
docker compose -f docker-compose-deploy.yml logs -f nodebook-p2p
```

### Backup

Backup your data directory:
```bash
# Create backup
tar -czf nodebook-backup-$(date +%Y%m%d).tar.gz data/

# Restore backup
tar -xzf nodebook-backup-YYYYMMDD.tar.gz
```

### Updates

To update NodeBook:
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose -f docker-compose-deploy.yml --env-file .env.deploy up -d --build
```

## Troubleshooting

### Common Issues

1. **SSL Certificate Issues:**
   - Check domain DNS settings
   - Verify firewall ports (80, 443)
   - Check Nginx Proxy Manager logs

2. **Authentication Issues:**
   - Verify Keycloak realm configuration
   - Check client secret in environment variables
   - Ensure JWT_SECRET is set

3. **Service Communication:**
   - Check Docker network connectivity
   - Verify service health checks
   - Review container logs

### Logs

```bash
# View all logs
docker compose -f docker-compose-deploy.yml logs

# View specific service logs
docker compose -f docker-compose-deploy.yml logs nodebook-p2p
docker compose -f docker-compose-deploy.yml logs keycloak
```

## Security Considerations

- Use strong passwords for all services
- Regularly update dependencies
- Monitor access logs
- Enable firewall rules
- Keep SSL certificates updated
- Regular security audits

## Performance Optimization

- Enable HTTP/2 in Nginx Proxy Manager
- Configure appropriate resource limits
- Monitor memory and CPU usage
- Optimize database queries (if using external DB)
- Enable gzip compression
