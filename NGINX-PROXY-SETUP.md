# 🔧 Nginx Proxy Manager Setup Guide

## 📋 Clarifications

### **Port 81 - Admin Interface Access**

**Why Port 81?**
- Nginx Proxy Manager runs its admin interface on port 81
- This is the **default configuration** of the nginx-proxy-manager image
- It's needed for initial setup and configuration

**How to Access:**
1. **Initial Setup**: `http://YOUR_SERVER_IP:81`
2. **After Configuration**: Can be accessed via proxy routes

### **Database.sqlite - Why It's Required**

**Purpose:**
- **Configuration Storage**: All proxy host settings
- **SSL Certificate Management**: Let's Encrypt certificates
- **User Accounts**: Admin user management
- **Settings**: Nginx-proxy-manager configuration

**Location:** `/data/database.sqlite` (inside container)
**Volume Mount:** `nginx-data:/data` (persistent storage)

## 🚀 Deployment Workflow

### **Phase 1: Initial Setup (Temporary Port 81)**

1. **Deploy with Port 81**:
   ```bash
   docker-compose -f docker-compose-deploy.yml --env-file .env.deploy up -d
   ```

2. **Access Admin Interface**:
   - URL: `http://YOUR_SERVER_IP:81`
   - Login: `admin@example.com` / `changeme`

3. **Configure Proxy Hosts** (see below)

4. **Test SSL Certificates**

### **Phase 2: Remove Port 81 (After Setup)**

1. **Edit docker-compose-deploy.yml**:
   ```yaml
   ports:
     - '80:80'      # HTTP
     - '443:443'    # HTTPS
     # Remove: - '81:81'
   ```

2. **Restart nginx-proxy-manager**:
   ```bash
   docker-compose -f docker-compose-deploy.yml restart nginx-proxy-manager
   ```

3. **Access Admin via Proxy**:
   - URL: `https://yourdomain.com/admin` (if configured)
   - Or: `http://YOUR_SERVER_IP:81` (if still needed)

## 🔧 Proxy Host Configuration

### **Required Proxy Hosts:**

1. **Main Application**:
   - Domain: `yourdomain.com`
   - Forward Hostname/IP: `frontend`
   - Forward Port: `5173`
   - SSL: ✅ Force SSL

2. **API Backend**:
   - Domain: `yourdomain.com`
   - Forward Hostname/IP: `nodebook-p2p`
   - Forward Port: `3000`
   - Path: `/api`
   - SSL: ✅ Force SSL

3. **Authentication**:
   - Domain: `yourdomain.com`
   - Forward Hostname/IP: `keycloak`
   - Forward Port: `8080`
   - Path: `/auth`
   - SSL: ✅ Force SSL

4. **Media Service**:
   - Domain: `yourdomain.com`
   - Forward Hostname/IP: `media-backend`
   - Forward Port: `3001`
   - Path: `/media`
   - SSL: ✅ Force SSL

5. **NLP Service**:
   - Domain: `yourdomain.com`
   - Forward Hostname/IP: `nlp-service`
   - Forward Port: `3002`
   - Path: `/nlp`
   - SSL: ✅ Force SSL

6. **WordNet Service**:
   - Domain: `yourdomain.com`
   - Forward Hostname/IP: `wordnet-service`
   - Forward Port: `3003`
   - Path: `/wordnet`
   - SSL: ✅ Force SSL

## 🔐 SSL Certificate Setup

1. **Enable SSL** for each proxy host
2. **Force SSL** redirect
3. **Let's Encrypt** automatic certificates
4. **HTTP/2 Support** enabled

## 📊 Final Port Configuration

**After Setup Complete:**
- `80` → HTTP (redirects to HTTPS)
- `443` → HTTPS (all services)
- `81` → **REMOVED** (no longer needed)

**Internal Services:**
- All communicate via Docker network
- No external port exposure
- Secure internal communication

## 🆘 Troubleshooting

### **Can't Access Admin Interface**
- Check if port 81 is open: `docker ps | grep 81`
- Verify container is running: `docker logs nodebook-nginx-proxy`
- Try: `http://YOUR_SERVER_IP:81`

### **SSL Certificate Issues**
- Check DNS propagation: `nslookup yourdomain.com`
- Verify domain points to server IP
- Check Let's Encrypt logs in nginx-proxy-manager

### **Proxy Host Not Working**
- Verify container names match
- Check internal network connectivity
- Review nginx-proxy-manager logs

## 📝 Summary

- **Port 81**: Temporary for initial setup, remove after configuration
- **Database.sqlite**: Required for nginx-proxy-manager functionality
- **Workflow**: Setup → Configure → Remove Port 81 → Production Ready

---

**🎯 This approach ensures Digital Ocean compatibility while maintaining full functionality!**
