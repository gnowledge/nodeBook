# NodeBook Server Deployment Guide

This guide helps you deploy nodeBook on a server using Docker, especially when another Docker server is already running.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- At least 2GB RAM available
- Domain name (optional, for SSL)
- Ports 3001, 8001, 8080, 8443 available (or configurable)

### Step 1: Check Current Docker Services
```bash
# Check what's currently running
docker ps
docker-compose ps

# Check which ports are in use
netstat -tulpn | grep LISTEN
```

### Step 2: Clone and Setup
```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd nodeBook

# Make scripts executable
chmod +x scripts/*.sh
```

### Step 3: Build Docker Images
```bash
# Build all Docker images
./scripts/build-docker.sh
```

### Step 4: Deploy with Custom Ports
```bash
# Create custom docker-compose file for server deployment
cat > docker-compose.server.yml << 'EOF'
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"      # Changed from 80 to 8080
      - "8443:443"     # Changed from 443 to 8443
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    depends_on:
      - backend
    restart: unless-stopped
    command: "/bin/sh -c 'while :; do sleep 6h & wait $${!}; nginx -s reload; done & nginx -g \"daemon off;\"'"

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    command: certonly --webroot --webroot-path=/var/www/certbot --force-renewal --email your-email@example.com --agree-tos --no-eff-email -d your-domain.com

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8001:8000"    # Changed from 8000 to 8001
    environment:
      - PYTHONPATH=/app
    volumes:
      - ./graph_data:/app/graph_data
      - ./logs:/app/logs
    restart: unless-stopped
    command: ["sh", "-c", "python scripts/post_install.py && uvicorn main:app --host 0.0.0.0 --port 8000"]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3001:3000"    # Changed from 3000 to 3001
    depends_on:
      - backend
    environment:
      - VITE_API_BASE_URL=http://localhost:8001
    restart: unless-stopped

  # Development version with hot reload
  backend-dev:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "8002:8000"    # Changed from 8001 to 8002
    volumes:
      - ./backend:/app
      - ./graph_data:/app/graph_data
      - ./logs:/app/logs
    environment:
      - PYTHONPATH=/app
    command: ["sh", "-c", "python scripts/post_install.py && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"]
    profiles:
      - dev

  frontend-dev:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3002:3000"    # Changed from 3001 to 3002
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_BASE_URL=http://localhost:8002
    command: ["npm", "run", "dev"]
    profiles:
      - dev
EOF
```

### Step 5: Start the Application
```bash
# Start production services
docker-compose -f docker-compose.server.yml up -d

# Or start development services
docker-compose -f docker-compose.server.yml --profile dev up -d
```

### Step 6: Access the Application
- **Frontend**: http://your-server-ip:3001
- **Backend API**: http://your-server-ip:8001
- **API Documentation**: http://your-server-ip:8001/docs
- **Nginx (if using)**: http://your-server-ip:8080

## 🔧 Configuration Options

### Custom Port Configuration
If you need different ports, edit the `docker-compose.server.yml` file:

```yaml
# Example: Using ports 4000-4999 range
nginx:
  ports:
    - "4080:80"      # Frontend via nginx
    - "4443:443"     # HTTPS via nginx

backend:
  ports:
    - "4801:8000"    # Backend API

frontend:
  ports:
    - "4301:3000"    # Frontend direct
```

### Environment Variables
Create a `.env` file for custom configuration:

```bash
# .env
NODEBOOK_VERSION=latest
NODE_ENV=production
VITE_API_BASE_URL=http://your-server-ip:8001
DOMAIN=your-domain.com
EMAIL=admin@example.com
```

### SSL Configuration (Optional)
If you have a domain name and want SSL:

```bash
# Update domain in configuration
sed -i "s/your-domain.com/your-actual-domain.com/g" nginx/nginx.conf
sed -i "s/your-email@example.com/your-email@example.com/g" docker-compose.server.yml

# Start with SSL
docker-compose -f docker-compose.server.yml up -d nginx backend frontend

# Get SSL certificate
docker-compose -f docker-compose.server.yml run --rm certbot

# Reload nginx
docker-compose -f docker-compose.server.yml restart nginx
```

## 📊 Monitoring and Management

### Check Service Status
```bash
# View running containers
docker-compose -f docker-compose.server.yml ps

# View logs
docker-compose -f docker-compose.server.yml logs -f

# View specific service logs
docker-compose -f docker-compose.server.yml logs -f backend
docker-compose -f docker-compose.server.yml logs -f frontend
```

### Health Checks
```bash
# Check backend health
curl http://your-server-ip:8001/api/health

# Check frontend
curl http://your-server-ip:3001

# Check nginx (if using)
curl http://your-server-ip:8080
```

### Resource Usage
```bash
# Check Docker resource usage
docker stats

# Check disk usage
docker system df
```

## 🔄 Development Workflow

### Development Mode
```bash
# Start development services with hot reload
docker-compose -f docker-compose.server.yml --profile dev up -d

# Access development services
# Frontend: http://your-server-ip:3002
# Backend: http://your-server-ip:8002
```

### Code Updates
```bash
# Rebuild and restart after code changes
docker-compose -f docker-compose.server.yml build
docker-compose -f docker-compose.server.yml up -d

# Or restart specific service
docker-compose -f docker-compose.server.yml restart backend
```

## 🛠️ Troubleshooting

### Port Conflicts
```bash
# Check what's using a specific port
sudo lsof -i :8001
sudo netstat -tulpn | grep :8001

# Kill process using port (if needed)
sudo kill -9 <PID>
```

### Container Issues
```bash
# Check container logs
docker-compose -f docker-compose.server.yml logs backend

# Restart specific service
docker-compose -f docker-compose.server.yml restart backend

# Rebuild specific service
docker-compose -f docker-compose.server.yml build backend
docker-compose -f docker-compose.server.yml up -d backend
```

### Data Persistence
```bash
# Backup data
tar -czf nodebook-backup-$(date +%Y%m%d).tar.gz graph_data/ logs/

# Restore data
tar -xzf nodebook-backup-YYYYMMDD.tar.gz
```

### Cleanup
```bash
# Stop all services
docker-compose -f docker-compose.server.yml down

# Remove containers and networks
docker-compose -f docker-compose.server.yml down --remove-orphans

# Clean up unused Docker resources
docker system prune -f
```

## 🔒 Security Considerations

### Firewall Configuration
```bash
# Allow only necessary ports
sudo ufw allow 3001/tcp  # Frontend
sudo ufw allow 8001/tcp  # Backend API
sudo ufw allow 8080/tcp  # Nginx (if using)
sudo ufw allow 8443/tcp  # HTTPS (if using)
```

### Admin Access
The post-install script creates an admin user:
- **Username**: `admin`
- **Password**: `admin123`

**Important**: Change the admin password after first login!

### SSL Certificate Renewal
```bash
# Manual renewal
docker-compose -f docker-compose.server.yml run --rm certbot renew

# Auto-renewal (add to crontab)
0 12 * * * cd /path/to/nodebook && docker-compose -f docker-compose.server.yml run --rm certbot renew
```

## 📋 Deployment Checklist

- [ ] Docker and Docker Compose installed
- [ ] Ports 3001, 8001, 8080, 8443 available
- [ ] At least 2GB RAM available
- [ ] Repository cloned and scripts made executable
- [ ] Docker images built successfully
- [ ] Services started and running
- [ ] Health checks passing
- [ ] Admin password changed
- [ ] SSL configured (if using domain)
- [ ] Firewall configured
- [ ] Backup strategy in place

## 🆘 Support

### Common Issues
1. **Port already in use**: Change ports in `docker-compose.server.yml`
2. **Permission denied**: Run `chmod +x scripts/*.sh`
3. **Container won't start**: Check logs with `docker-compose logs`
4. **SSL issues**: Verify domain DNS and firewall settings

### Getting Help
- Check logs: `docker-compose -f docker-compose.server.yml logs`
- Verify configuration: `docker-compose -f docker-compose.server.yml config`
- Test connectivity: `curl http://your-server-ip:8001/api/health`

## 🚀 Next Steps

After successful deployment:
1. Set up monitoring and alerting
2. Configure automated backups
3. Set up CI/CD pipeline
4. Configure load balancing (if needed)
5. Set up logging aggregation
6. Plan for scaling

---

**Note**: This deployment uses custom ports to avoid conflicts with other Docker services. Adjust the port numbers in `docker-compose.server.yml` if needed for your specific environment. 