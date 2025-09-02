# 🌊 NodeBook Digital Ocean Deployment Guide

## 📊 Port & Volume Management Summary

### **🔌 Port Configuration (Digital Ocean Compatible)**

**External Ports (Only 80 & 443 exposed):**
- `80` → Nginx Proxy Manager (HTTP)
- `443` → Nginx Proxy Manager (HTTPS)
- `81` → Nginx Proxy Manager Admin (Internal only)

**Internal Services (No external ports):**
- `keycloak:8080` → Authentication service
- `nodebook-p2p:3000` → Main backend API
- `media-backend:3001` → File upload service
- `nlp-service:3002` → Natural language processing
- `wordnet-service:3003` → Word definitions
- `p2p-monitor:3003` → Network monitoring
- `signaling-server:4444` → WebRTC signaling
- `frontend:5173` → React development server

### **📁 Volume Mounts**

```yaml
# Data Persistence
./data:/app/data                    # Main application data
keycloak-data:/opt/keycloak/data    # Keycloak database
nginx-data:/data                    # Nginx Proxy Manager data
nginx-letsencrypt:/etc/letsencrypt  # SSL certificates

# Development (Hot Reload)
./nodebook-base:/app                # Backend source code
./nodebook-base:/app/nodebook-base  # Frontend source code
/app/node_modules                   # Node modules (excluded from host)
```

### **🌐 Nginx Proxy Routes**

All external traffic flows through nginx-proxy-manager:

```
https://yourdomain.com/          → frontend:5173
https://yourdomain.com/api/      → nodebook-p2p:3000
https://yourdomain.com/auth/     → keycloak:8080
https://yourdomain.com/media/    → media-backend:3001
https://yourdomain.com/nlp/      → nlp-service:3002
https://yourdomain.com/wordnet/  → wordnet-service:3003
```

### **🔧 Environment Variables**

**Frontend (Production URLs):**
```bash
VITE_API_TARGET=https://yourdomain.com/api
VITE_KEYCLOAK_URL=https://yourdomain.com/auth
VITE_MEDIA_BACKEND_URL=https://yourdomain.com/media
VITE_NLP_SERVICE_URL=https://yourdomain.com/nlp
VITE_WORDNET_SERVICE_URL=https://yourdomain.com/wordnet
```

**Frontend (Internal URLs for Development):**
```bash
VITE_INTERNAL_API_TARGET=http://nodebook-p2p:3000
VITE_INTERNAL_KEYCLOAK_URL=http://keycloak:8080
VITE_INTERNAL_MEDIA_BACKEND_URL=http://media-backend:3001
VITE_INTERNAL_NLP_SERVICE_URL=http://nlp-service:3002
VITE_INTERNAL_WORDNET_SERVICE_URL=http://wordnet-service:3003
```

**Backend:**
```bash
KEYCLOAK_URL=http://keycloak:8080  # Internal communication
```

## 🚀 Deployment Steps

### 1. **Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. **Configure Environment**
```bash
# Copy template
cp env.deploy.template .env.deploy

# Edit with your values
nano .env.deploy
```

**Required Variables:**
```bash
DOMAIN_NAME=yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
KEYCLOAK_ADMIN_PASSWORD=secure-password
KEYCLOAK_CLIENT_SECRET=secure-secret
MAILGUN_API_KEY=your-mailgun-key
MAILGUN_DOMAIN=mg.yourdomain.com
```

### 3. **DNS Configuration**
```
A Record: yourdomain.com → YOUR_SERVER_IP
A Record: www.yourdomain.com → YOUR_SERVER_IP
```

### 4. **Deploy**
```bash
# Start all services
docker-compose -f docker-compose-deploy.yml --env-file .env.deploy up -d

# Check status
docker-compose -f docker-compose-deploy.yml ps
```

### 5. **Setup SSL Certificates**

```bash
# Set your domain name
export DOMAIN_NAME=yourdomain.com
export ADMIN_EMAIL=admin@yourdomain.com

# Run SSL setup script
./setup-ssl.sh
```

### 6. **Configure Nginx Proxy Manager (Optional)**

1. **Access Admin**: `http://YOUR_SERVER_IP:81`
2. **Login**: `admin@example.com` / `changeme`
3. **Change Password**
4. **Add Proxy Hosts** (if needed):

   **Main App:**
   - Domain: `yourdomain.com`
   - Forward: `frontend:5173`
   - SSL: ✅ Force SSL

   **API:**
   - Domain: `yourdomain.com`
   - Forward: `nodebook-p2p:3000`
   - Path: `/api`
   - SSL: ✅ Force SSL

   **Auth:**
   - Domain: `yourdomain.com`
   - Forward: `keycloak:8080`
   - Path: `/auth`
   - SSL: ✅ Force SSL

   **Media:**
   - Domain: `yourdomain.com`
   - Forward: `media-backend:3001`
   - Path: `/media`
   - SSL: ✅ Force SSL

   **NLP:**
   - Domain: `yourdomain.com`
   - Forward: `nlp-service:3002`
   - Path: `/nlp`
   - SSL: ✅ Force SSL

   **WordNet:**
   - Domain: `yourdomain.com`
   - Forward: `wordnet-service:3003`
   - Path: `/wordnet`
   - SSL: ✅ Force SSL

## 🔍 Verification

### **Check Services**
```bash
# All containers running
docker-compose -f docker-compose-deploy.yml ps

# Check logs
docker-compose -f docker-compose-deploy.yml logs -f
```

### **Test Endpoints**
```bash
# Main app
curl -I https://yourdomain.com

# API
curl -I https://yourdomain.com/api/health

# Auth
curl -I https://yourdomain.com/auth
```

## 🔐 Security Features

- ✅ **SSL/TLS**: Automatic Let's Encrypt certificates
- ✅ **Firewall**: Only ports 80/443 exposed
- ✅ **Internal Network**: All services communicate internally
- ✅ **Authentication**: Keycloak with JWT tokens
- ✅ **Email**: Mailgun for notifications
- ✅ **Proxy**: Nginx handles all external traffic

## 📈 Benefits

1. **Cost Effective**: Only 2 ports needed
2. **Secure**: No direct service exposure
3. **Scalable**: Easy to add more services
4. **Professional**: HTTPS with proper certificates
5. **Maintainable**: Centralized proxy configuration

---

**🎉 Your NodeBook instance is now ready for Digital Ocean deployment!**
