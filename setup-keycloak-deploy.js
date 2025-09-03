#!/usr/bin/env node

const axios = require('axios');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'https://auth.your-domain.com';
const ADMIN_USER = process.env.KEYCLOAK_ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'Admin123';
const REALM_NAME = 'nodebook';
const CLIENT_ID = 'nodebook-frontend';
const CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET || 'your-client-secret';

async function setupKeycloak() {
  try {
    console.log('🔐 Setting up Keycloak for production...');
    
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
    
    // Create realm (or update if exists)
    console.log('🏗️ Creating/updating realm...');
    try {
      await axios.post(`${KEYCLOAK_URL}/admin/realms`, {
        realm: REALM_NAME,
        enabled: true,
        displayName: 'NodeBook',
        displayNameHtml: '<div class="kc-logo-text"><span>NodeBook</span></div>'
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Realm created');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('✅ Realm already exists, updating...');
        await axios.put(`${KEYCLOAK_URL}/admin/realms/${REALM_NAME}`, {
          realm: REALM_NAME,
          enabled: true,
          displayName: 'NodeBook',
          displayNameHtml: '<div class="kc-logo-text"><span>NodeBook</span></div>'
        }, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ Realm updated');
      } else {
        throw error;
      }
    }
    
    // Create client (or update if exists)
    console.log('🔧 Creating/updating client...');
    try {
      await axios.post(`${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients`, {
        clientId: CLIENT_ID,
        enabled: true,
        publicClient: false,
        clientAuthenticatorType: 'client-secret',
        secret: CLIENT_SECRET,
        redirectUris: [
          'https://nodebook.co.in/*',
          'https://auth.nodebook.co.in/*'
        ],
        webOrigins: [
          'https://nodebook.co.in',
          'https://auth.nodebook.co.in'
        ],
        defaultClientScopes: ['openid', 'profile', 'email'],
        protocol: 'openid-connect'
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Client created');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('✅ Client already exists, updating...');
        // Get existing client ID
        const clientsResponse = await axios.get(`${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients?clientId=${CLIENT_ID}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        const clientId = clientsResponse.data[0].id;
        
        // Update client
        await axios.put(`${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients/${clientId}`, {
          clientId: CLIENT_ID,
          enabled: true,
          publicClient: false,
          clientAuthenticatorType: 'client-secret',
          secret: CLIENT_SECRET,
          redirectUris: [
            'https://nodebook.co.in/*',
            'https://auth.nodebook.co.in/*'
          ],
          webOrigins: [
            'https://nodebook.co.in',
            'https://auth.nodebook.co.in'
          ],
          defaultClientScopes: ['openid', 'profile', 'email'],
          protocol: 'openid-connect'
        }, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ Client updated');
      } else {
        throw error;
      }
    }
    
    // Create roles (or skip if exists)
    console.log('👥 Creating roles...');
    const roles = ['admin', 'user', 'collaborator'];
    
    for (const roleName of roles) {
      try {
        await axios.post(`${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles`, {
          name: roleName,
          description: `${roleName} role for NodeBook`
        }, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`✅ Role ${roleName} created`);
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`✅ Role ${roleName} already exists`);
        } else {
          throw error;
        }
      }
    }
    console.log('✅ Roles setup completed');
    
    // Create admin user (or skip if exists)
    console.log('👤 Creating admin user...');
    try {
      await axios.post(`${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users`, {
        username: 'admin',
        email: 'admin@nodebook.co.in',
        firstName: 'Admin',
        lastName: 'User',
        enabled: true,
        emailVerified: true,
        credentials: [{
          type: 'password',
          value: 'Admin123',
          temporary: false
        }]
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Admin user created');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('✅ Admin user already exists');
      } else {
        throw error;
      }
    }
    
    // Assign admin role to admin user
    console.log('🔗 Assigning admin role...');
    const usersResponse = await axios.get(`${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users?username=admin`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!usersResponse.data || usersResponse.data.length === 0) {
      console.log('⚠️ Admin user not found, skipping role assignment');
    } else {
      const adminUser = usersResponse.data[0];
      console.log(`📋 Found admin user with ID: ${adminUser.id}`);
      
      const adminRoleResponse = await axios.get(`${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles/admin`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      await axios.post(`${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users/${adminUser.id}/role-mappings/realm`, [adminRoleResponse.data], {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Admin role assigned');
    }
    
    console.log('🎉 Keycloak setup completed successfully!');
    console.log(`📋 Admin Console: https://auth.nodebook.co.in/admin`);
    console.log(`🔑 Admin Login: admin / Admin123`);
    
  } catch (error) {
    console.error('❌ Error setting up Keycloak:', error.response?.data || error.message);
    process.exit(1);
  }
}

setupKeycloak();
