# NodeBook Production Authentication Guide

This guide explains the authentication system for NodeBook production deployment, including the hybrid approach that combines local authentication with email-based features.

## 🏗️ **Authentication Architecture**

### **Hybrid Approach (Recommended)**
- **Local Authentication**: Username/password for all users
- **Email Verification**: Required for new registrations (except admin)
- **Password Reset**: Email-based password recovery
- **Admin Management**: Local admin users can manage user roles
- **Security Features**: JWT tokens, rate limiting, secure headers

### **Alternative: SSO + Local Admin**
- **SSO Authentication**: Google, GitHub for regular users
- **Local Admin**: Separate admin accounts for user management
- **Complexity**: Requires SSO provider configuration and role mapping

## 🔐 **Why Hybrid Approach is Better**

### **Advantages:**
1. **Full Control**: Complete user management within your system
2. **Admin Roles**: Easy role assignment and management
3. **Email Features**: Built-in password reset and verification
4. **Security**: No dependency on external SSO providers
5. **Simplicity**: Single authentication flow for all users

### **Disadvantages:**
1. **Email Dependency**: Requires SMTP configuration
2. **User Management**: Need to handle user registration manually
3. **Password Security**: Users must remember local passwords

## 📧 **Email Configuration**

### **Required Environment Variables:**
```bash
# Enable email features
EMAIL_FEATURES_ENABLED=true

# Frontend URL for email links
FRONTEND_URL=https://your-domain.com

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### **SMTP Provider Options:**

#### **Gmail (Recommended for testing)**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Use App Password, not regular password
```

#### **SendGrid**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### **Amazon SES**
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

## 🚀 **Setup Instructions**

### **1. Configure Email Settings**
```bash
# Edit production environment file
nano env.production

# Set your domain and email
DOMAIN=your-domain.com
EMAIL=your-email@domain.com

# Configure SMTP (example for Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### **2. Install Dependencies**
```bash
cd nodebook-base
npm install nodemailer@^6.9.7
```

### **3. Deploy with Email Features**
```bash
# Run production deployment
./init-production.sh
```

## 🔑 **Authentication Endpoints**

### **User Registration**
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "newuser",
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": 2,
    "username": "newuser",
    "email": "user@example.com",
    "isAdmin": false,
    "emailVerified": false
  }
}
```

**Note:** Verification email is automatically sent if email features are enabled.

### **User Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "newuser",
  "password": "securepassword123"
}
```

### **Password Reset Request**
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Password reset email sent"
}
```

### **Password Reset with Token**
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "newsecurepassword123"
}
```

### **Email Verification**
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email"
}
```

### **Resend Verification Email**
```http
POST /api/auth/resend-verification
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "username": "newuser"
}
```

## 👥 **User Management**

### **Admin Functions**
- **Create Users**: Admin can create users with specific roles
- **Assign Roles**: Set `is_admin` flag for administrative access
- **Email Verification**: Admin users are automatically verified
- **User Management**: View and manage all user accounts

### **User Roles**
- **Regular Users**: Can create graphs, access their data
- **Admin Users**: Can manage users, access system-wide data
- **Email Verification**: Required for regular users, optional for admins

### **Database Schema**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT 0,
  email_verified BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  data_directory TEXT NOT NULL
);
```

## 🔒 **Security Features**

### **Password Security**
- **Bcrypt Hashing**: Passwords are hashed with bcrypt (cost factor 10)
- **Minimum Length**: 6 characters required
- **Token Expiration**: Password reset tokens expire in 1 hour
- **Single Use**: Reset tokens can only be used once

### **Email Security**
- **Verification Required**: New users must verify email (except admin)
- **Token Expiration**: Verification tokens expire in 24 hours
- **Secure Links**: Tokens are cryptographically secure (32 bytes)
- **Rate Limiting**: API endpoints are rate-limited

### **JWT Security**
- **Configurable Expiration**: Default 24 hours, configurable
- **Secure Secret**: Environment variable for JWT secret
- **Bearer Token**: Standard Authorization header format

## 📱 **Frontend Integration**

### **Required Pages**
1. **Login Page**: Username/password authentication
2. **Registration Page**: User signup with email
3. **Email Verification Page**: Verify email with token
4. **Password Reset Page**: Reset password with token
5. **Forgot Password Page**: Request password reset

### **User Flow**
1. **Registration** → Email verification required
2. **Login** → JWT token issued
3. **Password Reset** → Email sent with reset link
4. **Email Verification** → Required for full access

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Email Not Sending**
```bash
# Check SMTP configuration
echo $SMTP_HOST
echo $SMTP_USER
echo $SMTP_PASS

# Check email service logs
docker-compose -f docker-compose.prod.yml logs nodebook-base | grep -i email
```

#### **Password Reset Not Working**
```bash
# Verify email features are enabled
echo $EMAIL_FEATURES_ENABLED

# Check token database
docker exec -it nodebook-base sqlite3 /app/nodebook-base/email-tokens.db \
  "SELECT * FROM password_reset_tokens;"
```

#### **Email Verification Failing**
```bash
# Check verification tokens
docker exec -it nodebook-base sqlite3 /app/nodebook-base/email-tokens.db \
  "SELECT * FROM email_verification_tokens;"

# Verify frontend URL configuration
echo $FRONTEND_URL
```

### **Testing Email Features**
```bash
# Test SMTP connection
docker exec -it nodebook-base node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.log('❌ SMTP Error:', error);
  } else {
    console.log('✅ SMTP Server is ready');
  }
});
"
```

## 🔄 **Migration from Development**

### **Enable Email Features**
```bash
# Development (no email)
EMAIL_FEATURES_ENABLED=false

# Production (with email)
EMAIL_FEATURES_ENABLED=true
```

### **Update User Accounts**
```bash
# Add email_verified column to existing users
docker exec -it nodebook-base sqlite3 /app/nodebook-base/users.db \
  "ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0;"

# Mark existing users as verified (optional)
docker exec -it nodebook-base sqlite3 /app/nodebook-base/users.db \
  "UPDATE users SET email_verified = 1 WHERE email_verified IS NULL;"
```

## 📚 **Best Practices**

### **Security**
1. **Strong Passwords**: Enforce minimum password requirements
2. **Rate Limiting**: Prevent brute force attacks
3. **Token Expiration**: Short-lived tokens for sensitive operations
4. **HTTPS Only**: All authentication over secure connections

### **User Experience**
1. **Clear Messages**: Informative error messages
2. **Email Templates**: Professional-looking email designs
3. **Quick Verification**: Streamlined email verification process
4. **Password Requirements**: Clear password guidelines

### **Maintenance**
1. **Regular Backups**: Backup user databases regularly
2. **Token Cleanup**: Automatic cleanup of expired tokens
3. **Log Monitoring**: Monitor authentication attempts
4. **Email Delivery**: Monitor email delivery rates

---

**Note**: This authentication system provides a robust, secure foundation for production deployment while maintaining simplicity and full control over user management.
