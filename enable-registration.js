#!/usr/bin/env node

const axios = require('axios');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'https://auth.nodebook.co.in';
const ADMIN_USER = process.env.KEYCLOAK_ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'Admin123';
const REALM_NAME = 'nodebook';

async function enableRegistration() {
  try {
    console.log('🔐 Enabling user registration in Keycloak...');
    
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
    
    // Enable user registration
    console.log('👥 Enabling user registration...');
    await axios.put(`${KEYCLOAK_URL}/admin/realms/${REALM_NAME}`, {
      realm: REALM_NAME,
      registrationAllowed: true,
      registrationEmailAsUsername: false,
      editUsernameAllowed: true,
      resetPasswordAllowed: true,
      rememberMe: true,
      verifyEmail: false,
      loginWithEmailAllowed: true,
      duplicateEmailsAllowed: false
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ User registration enabled');
    
    console.log('🎉 Registration settings updated successfully!');
    console.log('📋 Users can now register at: https://auth.nodebook.co.in/realms/nodebook/account');
    
  } catch (error) {
    console.error('❌ Error enabling registration:', error.response?.data || error.message);
    process.exit(1);
  }
}

enableRegistration();
