# NodeBook Admin Password Reset Guide

This guide explains how to reset the admin password in your NodeBook development environment.

## 🔐 **Current Admin Setup**

NodeBook automatically creates an admin user with these default credentials:
- **Username**: `admin`
- **Password**: `admin123` (or randomly generated if no ADMIN_PASSWORD is set)

## 🚀 **Quick Password Reset Methods**

### **Method 1: Using the Reset Script (Recommended)**

1. **Run the reset script**:
   ```bash
   ./scripts/reset-admin-password.sh
   ```

2. **Choose your option**:
   - Generate a secure random password
   - Enter a custom password
   - Reset to default password (admin123)
   - Show current password
   - Exit

3. **The script will**:
   - Update `docker-compose.dev.yml`
   - Create a backup of your current config
   - Optionally restart services
   - Clear the admin user data to apply new password

### **Method 2: Manual Environment Variable Update**

1. **Edit docker-compose.dev.yml**:
   ```yaml
   environment:
     - ADMIN_PASSWORD=your-new-password-here
   ```

2. **Restart services**:
   ```bash
   docker-compose -f docker-compose.dev.yml down
   docker-compose -f docker-compose.dev.yml up -d
   ```

### **Method 3: Using .env File**

1. **Create .env file** (copy from `env.dev.template`):
   ```bash
   cp env.dev.template .env
   ```

2. **Edit .env file**:
   ```bash
   ADMIN_PASSWORD=your-new-password-here
   ```

3. **Restart services**:
   ```bash
   docker-compose -f docker-compose.dev.yml down
   docker-compose -f docker-compose.dev.yml up -d
   ```

## 🔄 **How Password Reset Works**

### **Database Reset Process**
When you change the `ADMIN_PASSWORD` environment variable:

1. **Stop services** - Prevents data corruption
2. **Remove data volume** - Clears existing user database
3. **Restart services** - Creates new admin user with new password
4. **Auto-creation** - Backend creates admin user on first startup

### **Password Requirements**
- **Minimum length**: 6 characters
- **Hashing**: Passwords are securely hashed using bcrypt
- **Storage**: Never stored in plain text

## 🛠️ **Troubleshooting**

### **Password Not Working After Reset**
1. **Check environment variable**:
   ```bash
   grep ADMIN_PASSWORD docker-compose.dev.yml
   ```

2. **Verify .env file** (if using one):
   ```bash
   cat .env | grep ADMIN_PASSWORD
   ```

3. **Check container logs**:
   ```bash
   docker-compose -f docker-compose.dev.yml logs backend
   ```

### **Services Won't Start**
1. **Check syntax**:
   ```bash
   docker-compose -f docker-compose.dev.yml config
   ```

2. **Verify file permissions**:
   ```bash
   ls -la docker-compose.dev.yml
   ls -la .env  # if using .env file
   ```

### **Admin User Not Created**
1. **Check backend logs** for errors
2. **Verify database volume** is properly cleared
3. **Check environment variables** are loaded correctly

## 📁 **File Locations**

- **Docker Compose**: `docker-compose.dev.yml`
- **Environment Template**: `env.dev.template`
- **Reset Script**: `scripts/reset-admin-password.sh`
- **Backup Files**: `docker-compose.dev.yml.backup.*`

## 🔒 **Security Best Practices**

### **Development Environment**
- Use strong passwords even in development
- Change default passwords regularly
- Keep environment files out of version control

### **Production Environment**
- **NEVER** use default passwords
- Use cryptographically secure passwords
- Store passwords in secure environment management systems
- Rotate passwords regularly

## 📝 **Example Workflow**

```bash
# 1. Reset admin password
./scripts/reset-admin-password.sh

# 2. Choose option 1 (generate secure password)
# 3. Save the generated password
# 4. Choose to restart services now

# 5. Wait for services to start
# 6. Login with new credentials:
#    Username: admin
#    Password: [generated-password]
```

## 🆘 **Need Help?**

If you encounter issues:

1. **Check the logs**:
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f
   ```

2. **Verify configuration**:
   ```bash
   docker-compose -f docker-compose.dev.yml config
   ```

3. **Reset to defaults**:
   ```bash
   ./scripts/reset-admin-password.sh
   # Choose option 3 (reset to default)
   ```

4. **Check file permissions**:
   ```bash
   chmod +x scripts/reset-admin-password.sh
   ```

---

**Note**: This guide is for development environments. For production deployments, follow your organization's security policies and use proper secrets management.




