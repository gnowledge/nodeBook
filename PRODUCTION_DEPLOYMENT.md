# NodeBook Production Deployment Guide

This guide covers production deployment with Let's Encrypt SSL and version management.

## 🔒 SSL Configuration with Let's Encrypt

### Prerequisites
- Domain name pointing to your server
- Ports 80 and 443 open
- Docker and Docker Compose installed
- Valid email address for Let's Encrypt

### Quick SSL Deployment

```bash
# Deploy with SSL
./scripts/deploy-prod.sh your-domain.com your-email@example.com
```

This will:
1. ✅ Build Docker images
2. ✅ Configure nginx with your domain
3. ✅ Start services
4. ✅ Obtain Let's Encrypt SSL certificate
5. ✅ Configure HTTPS with security headers

### Manual SSL Setup

1. **Update domain in configuration:**
   ```bash
   # Update nginx configuration
   sed -i "s/your-domain.com/your-actual-domain.com/g" nginx/nginx.conf
   
   # Update docker-compose
   sed -i "s/your-domain.com/your-actual-domain.com/g" docker-compose.prod.yml
   sed -i "s/your-email@example.com/your-email@example.com/g" docker-compose.prod.yml
   ```

2. **Deploy with production compose:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Obtain SSL certificate:**
   ```bash
   docker-compose -f docker-compose.prod.yml run --rm certbot
   ```

### SSL Certificate Renewal

```bash
# Manual renewal
./scripts/ssl-renew.sh your-domain.com

# Auto-renewal (add to crontab)
0 12 * * * /path/to/nodebook/scripts/ssl-renew.sh your-domain.com
```

## 🏷️ Version Management

### Deploy Specific Version

```bash
# Deploy by tag
./scripts/deploy-version.sh v1.0.0 prod

# Deploy by branch
./scripts/deploy-version.sh feature/new-ui dev

# Deploy latest main
./scripts/deploy-version.sh main prod
```

### List Available Versions

```bash
# Show all versions
./scripts/list-versions.sh
```

### Rollback Deployment

```bash
# Navigate to deployment directory
cd deployments/v1.0.0-20231201-143022

# Rollback
./rollback.sh
```

## 🚀 Production Deployment Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
```

### 2. Testing
```bash
# Deploy feature to test environment
./scripts/deploy-version.sh feature/new-feature dev

# Test the deployment
curl http://localhost:3000/health
```

### 3. Production Release
```bash
# Create release tag
git tag v1.1.0
git push origin v1.1.0

# Deploy to production
./scripts/deploy-version.sh v1.1.0 prod
```

### 4. SSL Setup for Production
```bash
# Deploy with SSL
./scripts/deploy-prod.sh your-domain.com admin@example.com
```

## 🔧 Configuration

### Environment Variables

```bash
# Production environment
NODEBOOK_VERSION=v1.0.0
NODE_ENV=production
VITE_API_BASE_URL=https://your-domain.com

# SSL configuration
DOMAIN=your-domain.com
EMAIL=admin@example.com
```

### Security Headers

The nginx configuration includes:
- ✅ HSTS (HTTP Strict Transport Security)
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ X-XSS-Protection
- ✅ Content-Security-Policy
- ✅ Rate limiting
- ✅ CORS configuration

### Rate Limiting

- **API endpoints**: 10 requests/second
- **Login endpoints**: 5 requests/minute
- **Burst allowance**: 20 requests for API, 5 for login

## 📊 Monitoring

### Health Checks
```bash
# Check application health
curl https://your-domain.com/health

# Check API health
curl https://your-domain.com/api/health
```

### Logs
```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### SSL Certificate Status
```bash
# Check certificate expiration
docker-compose -f docker-compose.prod.yml run --rm certbot certificates

# Test SSL configuration
curl -I https://your-domain.com
```

## 🔄 CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/build.yml` includes:
- ✅ Automated testing
- ✅ Docker image building
- ✅ Electron package creation
- ✅ Release asset creation

### Automated Deployment

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  release:
    types: [published]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Deploy to production
      run: |
        ./scripts/deploy-version.sh ${{ github.event.release.tag_name }} prod
```

## 🛠️ Troubleshooting

### SSL Issues
```bash
# Check certificate status
docker-compose -f docker-compose.prod.yml run --rm certbot certificates

# Force certificate renewal
docker-compose -f docker-compose.prod.yml run --rm certbot renew --force-renewal

# Check nginx configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t
```

### Version Issues
```bash
# List all versions
./scripts/list-versions.sh

# Check current deployment
docker ps
docker images | grep nodebook

# Rollback to previous version
cd deployments/previous-version
./rollback.sh
```

### Performance Issues
```bash
# Check resource usage
docker stats

# Check nginx access logs
docker-compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/access.log

# Check error logs
docker-compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/error.log
```

## 📋 Best Practices

### Security
- ✅ Always use HTTPS in production
- ✅ Keep SSL certificates up to date
- ✅ Use strong passwords for admin accounts
- ✅ Regularly update dependencies
- ✅ Monitor access logs for suspicious activity

### Performance
- ✅ Enable gzip compression
- ✅ Use CDN for static assets
- ✅ Configure proper caching headers
- ✅ Monitor resource usage
- ✅ Set up automated backups

### Deployment
- ✅ Test in staging environment first
- ✅ Use semantic versioning
- ✅ Keep deployment logs
- ✅ Have rollback procedures ready
- ✅ Monitor application health

## 🆘 Support

For production issues:
1. Check logs: `docker-compose -f docker-compose.prod.yml logs`
2. Verify SSL: `./scripts/ssl-renew.sh your-domain.com`
3. Check version: `./scripts/list-versions.sh`
4. Rollback if needed: Navigate to deployment directory and run `./rollback.sh` 