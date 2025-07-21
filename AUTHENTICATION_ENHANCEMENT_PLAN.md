# NodeBook Authentication Enhancement Plan

## 🎯 Overview

This plan outlines the authentication enhancements needed for internet-facing deployment of nodeBook, focusing on password recovery and email functionality while maintaining the existing approval-based system.

## 🔍 Current State Analysis

### ✅ What We Have
- User registration with email and username
- Login with username or email
- JWT-based authentication with inactivity timeout (20 min)
- Admin approval system for new users
- Admin user management
- Password hashing with Argon2/bcrypt
- SQLite user database

### ❌ What We Need
- Password reset functionality
- Email sending capability
- Email verification (optional)
- Rate limiting for auth endpoints
- Better security headers

## 🚀 Recommended Implementation Strategy

### Option 1: Email-Based Password Reset (Recommended)

#### 1.1 Email Service Integration
```python
# Add to requirements.txt
fastapi-mail==1.4.1
python-multipart==0.0.6
```

#### 1.2 Email Configuration
```python
# backend/core/email_config.py
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
import os

class EmailConfig:
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "your-email@gmail.com")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "your-app-password")
    MAIL_FROM = os.getenv("MAIL_FROM", "noreply@nodebook.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_TLS = os.getenv("MAIL_TLS", "true").lower() == "true"
    MAIL_SSL = os.getenv("MAIL_SSL", "false").lower() == "true"

conf = ConnectionConfig(
    MAIL_USERNAME=EmailConfig.MAIL_USERNAME,
    MAIL_PASSWORD=EmailConfig.MAIL_PASSWORD,
    MAIL_FROM=EmailConfig.MAIL_FROM,
    MAIL_PORT=EmailConfig.MAIL_PORT,
    MAIL_SERVER=EmailConfig.MAIL_SERVER,
    MAIL_TLS=EmailConfig.MAIL_TLS,
    MAIL_SSL=EmailConfig.MAIL_SSL,
    USE_CREDENTIALS=True
)
```

#### 1.3 Password Reset Flow
```python
# New endpoints to add to users.py
@users_router.post("/forgot-password")
async def forgot_password(email: str):
    """Send password reset email"""
    # 1. Validate email exists
    # 2. Generate reset token
    # 3. Send email with reset link
    # 4. Store token with expiration

@users_router.post("/reset-password")
async def reset_password(token: str, new_password: str):
    """Reset password using token"""
    # 1. Validate token
    # 2. Update password
    # 3. Invalidate token
    # 4. Log the action
```

### Option 2: Admin-Only Password Reset (Simpler)

#### 2.1 Admin Password Reset Endpoint
```python
@users_router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_user_password(
    user_id: str,
    current_user: User = Depends(current_active_user)
):
    """Admin resets user password and sends temporary password"""
    # 1. Generate temporary password
    # 2. Update user password
    # 3. Send email with temporary password
    # 4. Force password change on next login
```

### Option 3: Hybrid Approach (Best for Production)

#### 3.1 Multiple Recovery Methods
1. **Email-based reset** (primary)
2. **Admin-assisted reset** (fallback)
3. **Security questions** (optional)

#### 3.2 Enhanced Security Features
- Rate limiting on auth endpoints
- Account lockout after failed attempts
- Password complexity requirements
- Session management improvements

## 📧 Email Templates

### Password Reset Email
```html
Subject: NodeBook Password Reset Request

Hello {username},

You requested a password reset for your NodeBook account.

Click the link below to reset your password:
{reset_link}

This link will expire in 1 hour.

If you didn't request this reset, please ignore this email.

Best regards,
NodeBook Team
```

### Admin Password Reset Email
```html
Subject: NodeBook Account Password Reset

Hello {username},

An administrator has reset your NodeBook account password.

Your temporary password is: {temp_password}

Please login and change your password immediately.

Best regards,
NodeBook Team
```

## 🔧 Implementation Steps

### Phase 1: Email Infrastructure
1. Add email dependencies
2. Create email configuration
3. Set up email templates
4. Test email sending

### Phase 2: Password Reset
1. Add password reset endpoints
2. Implement token generation/validation
3. Create reset email templates
4. Add rate limiting

### Phase 3: Security Enhancements
1. Add account lockout
2. Implement password complexity
3. Add security logging
4. Update frontend UI

### Phase 4: Testing & Deployment
1. Test all flows
2. Update documentation
3. Deploy to staging
4. Monitor and adjust

## 🛡️ Security Considerations

### Rate Limiting
```python
# Add to nginx.conf
location /api/auth/ {
    limit_req zone=auth burst=5 nodelay;
    # ... existing config
}
```

### Token Security
- Use cryptographically secure tokens
- Short expiration times (1 hour)
- One-time use tokens
- Secure token storage

### Email Security
- Use TLS/SSL for email
- Validate email addresses
- Prevent email enumeration
- Log all email activities

## 📋 Configuration Options

### Environment Variables
```bash
# Email Configuration
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@nodebook.com
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_TLS=true

# Security Configuration
PASSWORD_RESET_EXPIRY_HOURS=1
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_MINUTES=30
PASSWORD_MIN_LENGTH=8
```

### Docker Configuration
```yaml
# Add to docker-compose.server.yml
environment:
  - MAIL_USERNAME=${MAIL_USERNAME}
  - MAIL_PASSWORD=${MAIL_PASSWORD}
  - MAIL_FROM=${MAIL_FROM}
  - MAIL_SERVER=${MAIL_SERVER}
  - MAIL_PORT=${MAIL_PORT}
  - MAIL_TLS=${MAIL_TLS}
```

## 🎨 Frontend Updates

### Login Page Enhancements
```jsx
// Add to Login.jsx
const [showForgotPassword, setShowForgotPassword] = useState(false);

// Add forgot password form
{showForgotPassword && (
  <ForgotPasswordForm onClose={() => setShowForgotPassword(false)} />
)}

// Add link to forgot password
<button 
  type="button" 
  onClick={() => setShowForgotPassword(true)}
  className="text-blue-600 hover:underline"
>
  Forgot Password?
</button>
```

### Password Reset Pages
```jsx
// ForgotPasswordForm.jsx
// ResetPasswordForm.jsx
// ChangePasswordForm.jsx
```

## 📊 Monitoring & Logging

### Security Events to Log
- Password reset requests
- Password reset completions
- Failed login attempts
- Account lockouts
- Admin password resets

### Metrics to Track
- Password reset success rate
- Email delivery success rate
- Login attempt patterns
- Account lockout frequency

## 🚀 Deployment Considerations

### Email Service Options
1. **Gmail SMTP** (free, 500 emails/day)
2. **SendGrid** (paid, reliable)
3. **Mailgun** (paid, developer-friendly)
4. **AWS SES** (paid, scalable)

### Production Checklist
- [ ] Email service configured
- [ ] Rate limiting enabled
- [ ] Security headers set
- [ ] SSL certificates valid
- [ ] Monitoring configured
- [ ] Backup strategy in place

## 🔄 Migration Strategy

### For Existing Users
1. No immediate changes required
2. Password reset available on next login
3. Gradual rollout of new features
4. Admin notification of new capabilities

### Database Changes
```sql
-- Add to User model
ALTER TABLE user ADD COLUMN password_reset_token TEXT;
ALTER TABLE user ADD COLUMN password_reset_expires DATETIME;
ALTER TABLE user ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE user ADD COLUMN account_locked_until DATETIME;
```

## 📚 Documentation Updates

### User Documentation
- Password reset instructions
- Security best practices
- Troubleshooting guide

### Admin Documentation
- User management procedures
- Security monitoring
- Incident response

### Developer Documentation
- API endpoint documentation
- Email configuration guide
- Security implementation details

---

## 🎯 Recommendation

**Start with Option 1 (Email-Based Password Reset)** as it provides the best user experience while maintaining security. This can be implemented incrementally without disrupting the existing system.

**Timeline**: 2-3 weeks for complete implementation
**Priority**: High for internet-facing deployment
**Risk**: Low (incremental changes) 