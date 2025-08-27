const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

// Email configuration
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

// Database for password reset tokens
let db;

async function initializeEmailDatabase() {
  const dbPath = path.join(__dirname, 'email-tokens.db');
  
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // Create password reset tokens table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);
    
    // Create email verification tokens table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        verified BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);
    
    console.log('✅ Email database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize email database:', error);
    throw error;
  }
}

// Create email transporter
function createTransporter() {
  if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
    throw new Error('SMTP credentials not configured');
  }
  
  return nodemailer.createTransporter(EMAIL_CONFIG);
}

// Generate secure random token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Send password reset email
async function sendPasswordResetEmail(userEmail, resetToken, resetUrl) {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"NodeBook Support" <${EMAIL_CONFIG.auth.user}>`,
      to: userEmail,
      subject: 'Password Reset Request - NodeBook',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>We received a request to reset your password for your NodeBook account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}?token=${resetToken}" 
               style="background-color: #3498db; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>This link will expire in 1 hour for security reasons.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ecf0f1;">
          <p style="color: #7f8c8d; font-size: 12px;">
            This is an automated email from NodeBook. Please do not reply to this email.
          </p>
        </div>
      `,
      text: `
Password Reset Request - NodeBook

Hello,

We received a request to reset your password for your NodeBook account.

Click the link below to reset your password:
${resetUrl}?token=${resetToken}

If you didn't request this password reset, please ignore this email.

This link will expire in 1 hour for security reasons.

---
This is an automated email from NodeBook. Please do not reply to this email.
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${userEmail}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to send password reset email to ${userEmail}:`, error);
    throw error;
  }
}

// Send email verification email
async function sendEmailVerificationEmail(userEmail, verificationToken, verificationUrl) {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"NodeBook Support" <${EMAIL_CONFIG.auth.user}>`,
      to: userEmail,
      subject: 'Verify Your Email - NodeBook',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Verify Your Email Address</h2>
          <p>Hello,</p>
          <p>Welcome to NodeBook! Please verify your email address to complete your registration.</p>
          <p>Click the button below to verify your email:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}?token=${verificationToken}" 
               style="background-color: #27ae60; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p>If you didn't create a NodeBook account, please ignore this email.</p>
          <p>This link will expire in 24 hours.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ecf0f1;">
          <p style="color: #7f8c8d; font-size: 12px;">
            This is an automated email from NodeBook. Please do not reply to this email.
          </p>
        </div>
      `,
      text: `
Verify Your Email - NodeBook

Hello,

Welcome to NodeBook! Please verify your email address to complete your registration.

Click the link below to verify your email:
${verificationUrl}?token=${verificationToken}

If you didn't create a NodeBook account, please ignore this email.

This link will expire in 24 hours.

---
This is an automated email from NodeBook. Please do not reply to this email.
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email verification sent to ${userEmail}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to send email verification to ${userEmail}:`, error);
    throw error;
  }
}

// Create password reset token
async function createPasswordResetToken(userId) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  
  try {
    await db.run(`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `, [userId, token, expiresAt.toISOString()]);
    
    return token;
  } catch (error) {
    console.error('❌ Failed to create password reset token:', error);
    throw error;
  }
}

// Verify password reset token
async function verifyPasswordResetToken(token) {
  try {
    const result = await db.get(`
      SELECT pt.*, u.username, u.email 
      FROM password_reset_tokens pt
      JOIN users u ON pt.user_id = u.id
      WHERE pt.token = ? AND pt.expires_at > datetime('now') AND pt.used = 0
    `, [token]);
    
    return result;
  } catch (error) {
    console.error('❌ Failed to verify password reset token:', error);
    return null;
  }
}

// Mark password reset token as used
async function markPasswordResetTokenUsed(token) {
  try {
    await db.run(`
      UPDATE password_reset_tokens 
      SET used = 1 
      WHERE token = ?
    `, [token]);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to mark password reset token as used:', error);
    return false;
  }
}

// Create email verification token
async function createEmailVerificationToken(userId) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  try {
    await db.run(`
      INSERT INTO email_verification_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `, [userId, token, expiresAt.toISOString()]);
    
    return token;
  } catch (error) {
    console.error('❌ Failed to create email verification token:', error);
    throw error;
  }
}

// Verify email verification token
async function verifyEmailVerificationToken(token) {
  try {
    const result = await db.get(`
      SELECT vt.*, u.username, u.email 
      FROM email_verification_tokens vt
      JOIN users u ON vt.user_id = u.id
      WHERE vt.token = ? AND vt.expires_at > datetime('now') AND vt.verified = 0
    `, [token]);
    
    return result;
  } catch (error) {
    console.error('❌ Failed to verify email verification token:', error);
    return null;
  }
}

// Mark email as verified
async function markEmailVerified(token) {
  try {
    const tokenInfo = await verifyEmailVerificationToken(token);
    if (!tokenInfo) return false;
    
    // Mark token as verified
    await db.run(`
      UPDATE email_verification_tokens 
      SET verified = 1 
      WHERE token = ?
    `, [token]);
    
    // Update user email verification status
    await db.run(`
      UPDATE users 
      SET email_verified = 1 
      WHERE id = ?
    `, [tokenInfo.user_id]);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to mark email as verified:', error);
    return false;
  }
}

// Clean up expired tokens
async function cleanupExpiredTokens() {
  try {
    // Clean up expired password reset tokens
    await db.run(`
      DELETE FROM password_reset_tokens 
      WHERE expires_at < datetime('now')
    `);
    
    // Clean up expired email verification tokens
    await db.run(`
      DELETE FROM email_verification_tokens 
      WHERE expires_at < datetime('now')
    `);
    
    console.log('✅ Expired tokens cleaned up');
  } catch (error) {
    console.error('❌ Failed to cleanup expired tokens:', error);
  }
}

// Schedule cleanup every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

module.exports = {
  initializeEmailDatabase,
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  createPasswordResetToken,
  verifyPasswordResetToken,
  markPasswordResetTokenUsed,
  createEmailVerificationToken,
  verifyEmailVerificationToken,
  markEmailVerified,
  cleanupExpiredTokens
};
