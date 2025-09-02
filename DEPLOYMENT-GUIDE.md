# 🚀 NodeBook Production Deployment Guide

This guide helps you deploy NodeBook to a production server with HTTPS, domain, and email functionality.

## 📋 Prerequisites

- **Server**: Ubuntu 20.04+ or similar Linux distribution
- **Domain**: A registered domain name pointing to your server
- **Docker**: Docker and Docker Compose installed
- **Ports**: 80, 443 (open in firewall)
- **Mailgun Account**: For sending emails

## 📧 Mailgun Setup

Before deploying, set up your Mailgun account:

1. **Create Mailgun Account**: Go to [mailgun.com](https://mailgun.com)
2. **Add Domain**: Add your domain (e.g., `mg.yourdomain.com`)
3. **Verify Domain**: Add DNS records as instructed by Mailgun
4. **Get Credentials**:
   - API Key (for programmatic sending)
   - SMTP Username: `postmaster@mg.yourdomain.com`
   - SMTP Password (from Mailgun dashboard)

## 🔧 Setup Steps

### 1. **Server Preparation**

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

# Logout and login to apply docker group changes
```

### 2. **Clone and Configure**

```bash
# Clone NodeBook
git clone <your-repo-url> nodebook
cd nodebook

# Copy environment template
cp env.deploy.template .env.deploy

# Edit environment variables
nano .env.deploy
```

### 3. **Environment Configuration**

Edit `.env.deploy` with your actual values:

```bash
# Required: Replace with your actual domain
DOMAIN_NAME=yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# Required: Set secure passwords
KEYCLOAK_ADMIN_PASSWORD=your-secure-admin-password
KEYCLOAK_CLIENT_SECRET=your-secure-client-secret

# Mailgun Configuration
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-mailgun-domain.com
MAILGUN_FROM_EMAIL=noreply@yourdomain.com
KEYCLOAK_SMTP_USERNAME=postmaster@your-mailgun-domain.com
KEYCLOAK_SMTP_PASSWORD=your-mailgun-smtp-password
```

### 4. **DNS Configuration**

Point your domain to your server:
- **A Record**: `yourdomain.com` → `YOUR_SERVER_IP`
- **A Record**: `www.yourdomain.com` → `YOUR_SERVER_IP`

### 5. **Deploy**

```bash
# Start services
docker-compose -f docker-compose-deploy.yml --env-file .env.deploy up -d

# Check status
docker-compose -f docker-compose-deploy.yml ps
```

### 6. **SSL Certificate Setup**

1. **Access Nginx Proxy Manager**: `http://yourdomain.com:81`
2. **Login**: `admin@example.com` / `changeme`
3. **Change admin password**
4. **Add Proxy Host**:
   - Domain: `yourdomain.com`
   - Forward Hostname/IP: `frontend`
   - Forward Port: `5173`
   - Enable SSL: ✅
   - Force SSL: ✅
   - HTTP/2 Support: ✅

5. **Add Keycloak Proxy Host**:
   - Domain: `yourdomain.com`
   - Forward Hostname/IP: `keycloak`
   - Forward Port: `8080`
   - Enable SSL: ✅

### 7. **Keycloak Configuration**

1. **Access Keycloak**: `https://yourdomain.com/auth`
2. **Login**: Use admin credentials from `.env.deploy`
3. **Configure SMTP (Mailgun)**:
   - Go to Realm Settings → Email
   - Host: `smtp.mailgun.org`
   - Port: `587`
   - From: `noreply@yourdomain.com`
   - From Display Name: `NodeBook`
   - Authentication: Enable
   - Username: `postmaster@your-mailgun-domain.com`
   - Password: Your Mailgun SMTP password

4. **Update Client Settings**:
   - Go to Clients → nodebook-frontend
   - Valid Redirect URIs: `https://yourdomain.com/*`
   - Web Origins: `https://yourdomain.com`

## 🔐 Security Checklist

- [ ] Strong passwords in `.env.deploy`
- [ ] Firewall configured (only necessary ports open)
- [ ] SSL certificates working
- [ ] Email functionality tested
- [ ] Keycloak SMTP configured
- [ ] Regular backups scheduled

## 📧 Email Testing

1. **Test via Keycloak Admin Console**:
   - Go to Realm Settings → Email
   - Click "Test connection" button
   - Send test email to verify Mailgun integration

2. **Test User Registration**:
   - Register a new user account
   - Check email for verification link
   - Verify password reset functionality

## 🔄 Updates and Maintenance

```bash
# Update NodeBook
git pull
docker-compose -f docker-compose-deploy.yml --env-file .env.deploy up -d --build

# View logs
docker-compose -f docker-compose-deploy.yml logs -f

# Backup data
docker run --rm -v nodebook_keycloak-data:/data -v $(pwd):/backup alpine tar czf /backup/keycloak-backup.tar.gz -C /data .
```

## 🆘 Troubleshooting

### SSL Issues
- Check DNS propagation: `nslookup yourdomain.com`
- Verify ports 80/443 are open
- Check Nginx Proxy Manager logs

### Email Issues
- Check Mailgun dashboard for delivery status
- Verify Mailgun API key and domain configuration
- Test SMTP connection in Keycloak admin console

### Keycloak Issues
- Check Keycloak logs: `docker logs nodebook-keycloak-p2p-dev`
- Verify environment variables
- Check proxy configuration

## 📞 Support

For issues and feedback:
- Check logs: `docker-compose -f docker-compose-deploy.yml logs`
- Review this guide
- Contact: [your-contact-info]

---

**🎉 Your NodeBook instance is now ready for production use!**