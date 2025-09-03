#!/usr/bin/env node

const axios = require('axios');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'https://auth.nodebook.co.in';
const ADMIN_USER = process.env.KEYCLOAK_ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'Admin123';
const REALM_NAME = 'nodebook';

// Mailgun configuration from environment
const SMTP_HOST = process.env.KEYCLOAK_SMTP_HOST || 'smtp.mailgun.org';
const SMTP_PORT = process.env.KEYCLOAK_SMTP_PORT || '587';
const SMTP_USERNAME = process.env.KEYCLOAK_SMTP_USERNAME;
const SMTP_PASSWORD = process.env.KEYCLOAK_SMTP_PASSWORD;
const SMTP_FROM = process.env.KEYCLOAK_SMTP_FROM;
const SMTP_FROM_DISPLAY_NAME = process.env.KEYCLOAK_SMTP_FROM_DISPLAY_NAME || 'NodeBook';

async function configureMailgun() {
  try {
    console.log('📧 Configuring Mailgun SMTP in Keycloak...');
    
    // Get admin token
    console.log('📝 Getting admin token...');
    const tokenResponse = await axios.post(`${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, 
      new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: ADMIN_USER,
        password: ADMIN_PASSWORD
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const accessToken = tokenResponse.data.access_token;
    console.log('✅ Admin token obtained');
    
    // Configure SMTP settings
    console.log('📧 Configuring SMTP settings...');
    await axios.put(`${KEYCLOAK_URL}/admin/realms/${REALM_NAME}`, {
      realm: REALM_NAME,
      smtpServer: {
        host: SMTP_HOST,
        port: SMTP_PORT,
        ssl: false,
        starttls: true,
        auth: true,
        user: SMTP_USERNAME,
        password: SMTP_PASSWORD,
        from: SMTP_FROM,
        fromDisplayName: SMTP_FROM_DISPLAY_NAME,
        replyTo: SMTP_FROM,
        replyToDisplayName: SMTP_FROM_DISPLAY_NAME,
        envelopeFrom: SMTP_FROM
      }
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ SMTP settings configured');
    
    // Enable email verification and forgot password
    console.log('🔧 Enabling email features...');
    await axios.put(`${KEYCLOAK_URL}/admin/realms/${REALM_NAME}`, {
      realm: REALM_NAME,
      verifyEmail: true,
      loginWithEmailAllowed: true,
      resetPasswordAllowed: true,
      registrationEmailAsUsername: false,
      editUsernameAllowed: true,
      rememberMe: true
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Email features enabled');
    
    console.log('🎉 Mailgun configuration completed successfully!');
    console.log('📧 Email verification and password reset are now enabled');
    console.log('📋 Test by registering a new user or using forgot password');
    
  } catch (error) {
    console.error('❌ Error configuring Mailgun:', error.response?.data || error.message);
    process.exit(1);
  }
}

configureMailgun();
