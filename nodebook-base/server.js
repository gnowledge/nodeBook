import Fastify from 'fastify';
import { WebSocketServer } from 'ws';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';
import archiver from 'archiver';
import extract from 'extract-zip';
import { pipeline } from 'stream/promises';
import crypto from 'crypto';
import GraphManager from './graph-manager.js';
import * as schemaManager from './schema-manager.js';
import { diffCnl, getNodeOrderFromCnl, getOperationsFromCnl, validateOperations } from './cnl-parser.js';
import { evaluate } from 'mathjs';
import ScientificLibraryManager from './scientific-library-manager.js';
import MediaManager from './media-manager.js';
import { createDataStore } from './data-store.js';
import CNLSuggestionService from './cnl-suggestion-service.js';

// Keycloak authentication integration
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'nodebook';
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'nodebook-frontend';
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET || 'nodebook-frontend-secret';
const DISABLE_AUTH = process.env.DISABLE_AUTH === 'true';

const auth = {
  async verifyToken(token) {
    try {
      // Verify JWT token with Keycloak
      const response = await fetch(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/userinfo`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.warn(`Keycloak token verification failed: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const userInfo = await response.json();
      
      return {
        id: userInfo.sub,
        username: userInfo.preferred_username || userInfo.email,
        email: userInfo.email,
        isAdmin: userInfo.realm_access?.roles?.includes('admin') || false
      };
    } catch (error) {
      console.error('Keycloak token verification error:', error);
      // In development, if Keycloak is not available, we could fall back to a dev mode
      // For now, return null to maintain security
      return null;
    }
  },
  
  async findUser(username) {
    // Keycloak handles user management - we don't need this for JWT validation
    return null;
  },
  
  async validateUser(username, password) {
    // Keycloak handles authentication - we don't need this for JWT validation
    return false;
  },
  
  async generateToken(user) {
    // Keycloak generates tokens - we don't need this
    return null;
  },
  
  async createUser(username, email, password) {
    // Keycloak handles user creation - we don't need this
    throw new Error('User creation handled by Keycloak');
  },
  
  initializeDatabase: async () => console.log('✅ Keycloak authentication integration initialized'),
  requestPasswordReset: async (email) => ({ success: true }),
  resetPassword: async (token, newPassword) => ({ success: true }),
  verifyEmail: async (token) => ({ success: true }),
  resendVerificationEmail: async (username) => ({ success: true })
};

const fastify = Fastify({ 
    logger: true,
    trustProxy: true
  });
  
  const PORT = process.env.PORT || 3000;
  
// Register CORS
fastify.register(import('@fastify/cors'), {
  origin: true,
  credentials: true
});

// Register multipart for file uploads
fastify.register(import('@fastify/multipart'), {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Max 10 files per request
  }
});
  
  // Custom authentication hook
  async function authenticateJWT(request, reply) {
    if (DISABLE_AUTH) {
      request.user = {
        id: 'dev-user-id',
        username: 'dev-user',
        email: 'dev@example.com',
        isAdmin: true
      };
      return;
    }
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'No token provided' });
      return reply;
    }
    
    const token = authHeader.substring(7);
    try {
      // Verify token with Keycloak
      const user = await auth.verifyToken(token);
      if (!user || !user.username) {
        reply.code(401).send({ error: 'Invalid token' });
        return reply;
      }
      
      request.user = user;
    } catch (error) {
      reply.code(401).send({ error: 'Invalid token' });
      return reply;
    }
  }
  
  // Load graph middleware
  async function loadGraph(request, reply) {
    const dataStore = fastify.dataStore;
    const graphId = request.params.graphId;
    const userId = request.user.id;
    
    try {
      console.log(`[loadGraph] Loading graph: ${graphId} for user: ${userId}`);
      
      // Use DataStore to create a graph object with methods
      const graph = await dataStore.createGraphObject(userId, graphId);
      if (!graph) {
        console.log(`[loadGraph] Graph not found: ${graphId}`);
        reply.code(404).send({ error: 'Graph not found' });
        return;
      }
      
      // Graph loaded from file-system storage via DataStore
      console.log(`[loadGraph] Graph loaded from file-system: ${graphId}`);
      
      console.log(`[loadGraph] Successfully loaded graph: ${graphId}`);
      request.graph = graph;
    } catch (error) {
      console.error(`[loadGraph] Error loading graph ${graphId}:`, error);
      reply.code(500).send({ error: 'Failed to load graph', details: error.message });
      return;
    }
  }
  
async function main() {
  // Auth is handled by separate auth-service container
  console.log('✅ Auth database initialization skipped - handled by auth-service');
  
  // Initialize DataStore
  const dataPath = process.env.DATA_PATH || './user_data';
  const dataStore = createDataStore('file-system', { dataPath });
  await dataStore.initialize();
  console.log(`✅ DataStore initialized with path: ${dataPath}`);
  
  // Create a single instance of the GraphManager
  const graphManager = new GraphManager();
  
  // Initialize the instance with the correct path.
  await graphManager.initialize(dataPath);

  // Attach the initialized instance to the fastify object
  fastify.decorate('graphManager', graphManager);
  fastify.decorate('dataStore', dataStore);
  
  // Thumbnails deprecated — previews are user-selected SVGs via media-backend
  
  // Initialize MediaManager
  // Temporarily suspended - will be re-enabled in Phase 2
  /*
  let mediaManager = null;
  try {
    // MediaManager is already imported at the top
    mediaManager = new MediaManager(graphManager.BASE_DATA_DIR);
    fastify.decorate('mediaManager', mediaManager);
    console.log('✅ MediaManager initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize MediaManager:', error);
    console.log('⚠️ Continuing without MediaManager - media features will be disabled');
    // Don't throw error - let server start without MediaManager
  }
  */
  
  // --- Health Check Route ---
  fastify.get('/api/health', async (request, reply) => {
    return { status: 'ok', message: 'NodeBook Backend is running', timestamp: new Date().toISOString() };
  });

  // --- MindMap Templates API ---
  fastify.get('/api/mindmap/templates', async (request, reply) => {
    const templates = {
      'contains': {
        name: 'Contains/Part-Whole',
        description: 'Use for hierarchical structures where parts belong to wholes',
        relation: 'contains',
        example: `<! MindMap Mode: contains>
\`\`\`graph-description
A hierarchical structure showing how parts relate to wholes.
\`\`\`
# Main Topic
\`\`\`description
The central concept or whole entity
\`\`\`
## Subtopic 1
\`\`\`description
A component or part of the main topic
\`\`\`
### Detail 1.1
### Detail 1.2
## Subtopic 2
\`\`\`description
Another component or part
\`\`\`
### Detail 2.1
### Detail 2.2`
      },
      'subtype': {
        name: 'Subtype/Classification',
        description: 'Use for categorizing and classifying concepts',
        relation: 'subtype',
        example: `<! MindMap Mode: subtype>
\`\`\`graph-description
A classification system showing types and subtypes.
\`\`\`
# Main Category
\`\`\`description
The broadest classification
\`\`\`
## Type A
\`\`\`description
A specific type within the main category
\`\`\`
### Subtype A1
### Subtype A2
## Type B
\`\`\`description
Another specific type
\`\`\`
### Subtype B1
### Subtype B2`
      },
      'provides': {
        name: 'Provides/Function',
        description: 'Use for showing what functions or services are provided',
        relation: 'provides',
        example: `<! MindMap Mode: provides>
\`\`\`graph-description
A system showing what functions or services are provided.
\`\`\`
# Main System
\`\`\`description
The primary system or entity
\`\`\`
## Service 1
\`\`\`description
A specific service or function provided
\`\`\`
### Feature 1.1
### Feature 1.2
## Service 2
\`\`\`description
Another service or function
\`\`\`
### Feature 2.1
### Feature 2.2`
      }
    };
    
    return templates;
  });

  // --- Authentication Routes ---
  fastify.post('/api/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { username, password } = request.body;
      
      // Forward to Keycloak
      const response = await fetch(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        reply.code(response.status).send({ error: errorData.error || 'Login failed' });
        return;
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      fastify.log.error('Login error:', error);
      reply.code(500).send({ error: 'Login failed' });
      return;
    }
  });
  
  fastify.post('/api/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string' },
          email: { type: 'string' },
          password: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { username, email, password } = request.body;
      
      if (!username || !password) {
        reply.code(400).send({ error: 'Username and password are required' });
        return;
      }
  
      // Forward to Keycloak
      const response = await fetch(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        reply.code(response.status).send({ error: errorData.error || 'Registration failed' });
        return;
      }
      
      const data = await response.json();
      reply.code(201);
      return data;
    } catch (error) {
      reply.code(400).send({ error: error.message });
      return;
    }
  });
  
  // OAuth callback - exchange authorization code for token
  fastify.post('/api/auth/callback', {
    schema: {
      body: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string' },
          redirect_uri: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code, redirect_uri } = request.body;
      const finalRedirect = redirect_uri || (process.env.DOMAIN_NAME ? `https://${process.env.DOMAIN_NAME}` : 'http://localhost:5173');

      const tokenResponse = await fetch(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: KEYCLOAK_CLIENT_ID,
          client_secret: KEYCLOAK_CLIENT_SECRET,
          code: code,
          redirect_uri: finalRedirect
        })
      });

      if (!tokenResponse.ok) {
        const text = await tokenResponse.text();
        request.log.error({ text }, 'Keycloak token exchange failed');
        reply.code(400).send({ error: 'Token exchange failed' });
        return;
      }

      const tokenData = await tokenResponse.json();

      // Get user info
      const userInfoRes = await fetch(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/userinfo`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      if (!userInfoRes.ok) {
        reply.code(400).send({ error: 'Failed to fetch user info' });
        return;
      }
      const userInfo = await userInfoRes.json();

      reply.send({
        token: tokenData.access_token,
        user: {
          id: userInfo.sub,
          username: userInfo.preferred_username || userInfo.email,
          email: userInfo.email,
          isAdmin: userInfo.realm_access?.roles?.includes('admin') || false
        }
      });
    } catch (err) {
      request.log.error(err, 'OAuth callback error');
      reply.code(500).send({ error: 'OAuth callback error' });
    }
  });
  
  fastify.get('/api/auth/me', {
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const user = request.user;
    return {
      id: user.id,
      username: user.username,
      isAdmin: user.is_admin,
      email: user.email,
      emailVerified: user.email_verified
    };
  });

  // Password reset request
  fastify.post('/api/auth/forgot-password', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { email } = request.body;
      
      if (process.env.EMAIL_FEATURES_ENABLED !== 'true') {
        reply.code(400).send({ error: 'Password reset is not enabled' });
        return;
      }
      
      const result = await auth.requestPasswordReset(email);
      reply.code(200).send(result);
    } catch (error) {
      fastify.log.error('Password reset request error:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  // Password reset with token
  fastify.post('/api/auth/reset-password', {
    schema: {
      body: {
        type: 'object',
        required: ['token', 'newPassword'],
        properties: {
          token: { type: 'string' },
          newPassword: { type: 'string', minLength: 6 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { token, newPassword } = request.body;
      
      if (process.env.EMAIL_FEATURES_ENABLED !== 'true') {
        reply.code(400).send({ error: 'Password reset is not enabled' });
        return;
      }
      
      const result = await auth.resetPassword(token, newPassword);
      reply.code(200).send(result);
    } catch (error) {
      fastify.log.error('Password reset error:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  // Email verification
  fastify.post('/api/auth/verify-email', {
    schema: {
      body: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { token } = request.body;
      
      if (process.env.EMAIL_FEATURES_ENABLED !== 'true') {
        reply.code(400).send({ error: 'Email verification is not enabled' });
        return;
      }
      
      const result = await auth.verifyEmail(token);
      reply.code(200).send(result);
    } catch (error) {
      fastify.log.error('Email verification error:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  // Resend verification email
  fastify.post('/api/auth/resend-verification', {
    preHandler: [authenticateJWT],
    schema: {
      body: {
        type: 'object',
        required: ['username'],
        properties: {
          username: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { username } = request.body;
      
      if (process.env.EMAIL_FEATURES_ENABLED !== 'true') {
        reply.code(400).send({ error: 'Email verification is not enabled' });
        return;
      }
      
      const result = await auth.resendVerificationEmail(username);
      reply.code(200).send(result);
    } catch (error) {
      fastify.log.error('Resend verification error:', error);
      reply.code(400).send({ error: error.message });
    }
  });
  
  // --- Graph Management API ---
  fastify.get('/api/graphs', {
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const dataStore = fastify.dataStore; // Get instance from fastify
    const userId = request.user.id;
    console.log(`[GET /api/graphs] User ID: ${userId}, Type: ${typeof userId}`);
    try {
      const graphs = await dataStore.getGraphRegistry(userId);
      // Add publication state if not present (for backward compatibility)
      // Also normalize date field names to camelCase for frontend consistency
      const graphsWithPublicationState = graphs.map(graph => ({
        ...graph,
        publication_state: graph.publication_state || 'Private',
        description: graph.description || null,
        preview_url: graph.preview_url || null,
        // Map snake_case date fields to camelCase for frontend consistency
        createdAt: graph.createdAt || graph.created_at,
        updatedAt: graph.updatedAt || graph.updated_at
      }));
      return graphsWithPublicationState;
    } catch (error) {
      console.error(`[GET /api/graphs] Error:`, error);
      reply.code(500).send({ error: error.message });
      return;
    }
  });

  fastify.post('/api/graphs', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          author: { type: 'string' },
          email: { type: 'string' },
          mode: { 
            type: 'string', 
            enum: ['markdown', 'mindmap', 'richgraph', 'strictgraph'],
            default: 'richgraph'
          }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const dataStore = fastify.dataStore; // Get instance from fastify
    const userId = request.user.id;
    const { name, author, email, mode = 'richgraph' } = request.body;
    console.log(`[POST /api/graphs] User ID: ${userId}, Type: ${typeof userId}, Name: ${name}, Mode: ${mode}`);
    if (!name) {
      reply.code(400).send({ error: error.message });
      return;
    }
    try {
      // Create new graph using DataStore
      const graphId = crypto.randomUUID();
      const newGraph = {
        id: graphId,
        name,
        author,
        email,
        mode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: [],
        relations: [],
        attributes: [],
        functions: []
      };
      
      // Create initial manifest
      const userInfo = { username: author || 'Unknown', email: email || 'unknown@example.com' };
      await dataStore.createManifest(userId, graphId, { name, mode }, userInfo);
      
      // Save graph data and update registry
      await dataStore.saveGraph(userId, graphId, newGraph);
      
      // Initialize version control for the new graph
      await dataStore.initializeVersionControl(userId, graphId, author || 'Unknown', email || 'unknown@example.com');
      
      await dataStore.updateGraphRegistry(userId, graphId, {
        name,
        author,
        email,
        mode,
        createdAt: newGraph.createdAt,
        updatedAt: newGraph.updatedAt
      });
      
      reply.code(201);
      return newGraph;
    } catch (error) {
      console.error(`[POST /api/graphs] Error:`, error);
      reply.code(409).send({ error: error.message });
      return;
    }
  });



  // --- Node Registry API ---
  fastify.get('/api/noderegistry', {
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const gm = fastify.graphManager;
    const userId = request.user.id;
    try {
      const nodeRegistry = await gm.getNodeRegistry(userId);
      return nodeRegistry;
    } catch (error) {
      reply.code(500).send({ error: error.message });
      return;
    }
  });

  // --- Public Graph API (No Authentication Required) ---
  fastify.get('/api/public/graphs', async (request, reply) => {
    const gm = fastify.graphManager;
    try {
      const publicGraphs = await gm.getPublicGraphs();
      return publicGraphs;
    } catch (error) {
      reply.code(500).send({ error: error.message });
      return;
    }
  });

  fastify.get('/api/public/graphs/:graphId', async (request, reply) => {
    const gm = fastify.graphManager;
    const graphId = request.params.graphId;
    try {
      const publicGraph = await gm.getPublicGraph(graphId);
      return publicGraph;
    } catch (error) {
      reply.code(404).send({ error: error.message });
      return;
    }
  });

  fastify.get('/api/public/graphs/:graphId/cnl', async (request, reply) => {
    const gm = fastify.graphManager;
    const graphId = request.params.graphId;
    try {
      const publicGraph = await gm.getPublicGraph(graphId);
      return {
        cnl: publicGraph.cnl,
        nodes: publicGraph.nodes || [],
        relations: publicGraph.relations || [],
        attributes: publicGraph.attributes || []
      };
    } catch (error) {
      reply.code(404).send({ error: error.message });
      return;
    }
  });

  // Thumbnails removed; previews handled via media-backed preview_url

  // --- Schema CRUD API ---
  fastify.get('/api/schema/relations', {
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    return await schemaManager.getRelationTypes();
  });

  fastify.get('/api/schema/relations/:name', {
    schema: {
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    try {
      const relationTypes = await schemaManager.getRelationTypes();
      const relationType = relationTypes.find(t => t.name === request.params.name);
      if (!relationType) {
        reply.code(404).send({ error: 'Relation type not found' });
        return;
      }
      return relationType;
    } catch (error) {
      reply.code(500).send({ error: error.message });
      return;
    }
  });
  
  fastify.post('/api/schema/relations', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    try {
      const newType = await schemaManager.addRelationType(request.body);
      reply.code(201);
      return newType;
    } catch (error) {
      reply.code(409).send({ error: error.message });
      return;
    }
  });
  
  fastify.put('/api/schema/relations/:name', {
    schema: {
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    try {
      const updatedType = await schemaManager.updateRelationType(request.params.name, request.body);
      return updatedType;
    } catch (error) {
      reply.code(404).send({ error: error.message });
      return;
    }
  });
  
  fastify.delete('/api/schema/relations/:name', {
    schema: {
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    try {
      await schemaManager.deleteRelationType(request.params.name);
      reply.code(204).send();
      return;
    } catch (error) {
      reply.code(404).send({ error: error.message });
      return;
    }
  });

  fastify.get('/api/schema/attributes', {
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    return await schemaManager.getAttributeTypes();
  });

  fastify.get('/api/schema/attributes/:name', {
    schema: {
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    try {
      const attributeTypes = await schemaManager.getAttributeTypes();
      const attributeType = attributeTypes.find(t => t.name === request.params.name);
      if (!attributeType) {
        reply.code(404).send({ error: 'Attribute type not found' });
        return;
      }
      return attributeType;
    } catch (error) {
      reply.code(500).send({ error: error.message });
      return;
    }
  });
  
  fastify.post('/api/schema/attributes', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    try {
      const newType = await schemaManager.addAttributeType(request.body);
      reply.code(201);
      return newType;
    } catch (error) {
      reply.code(409).send({ error: error.message });
      return;
    }
  });
  
  fastify.put('/api/schema/attributes/:name', {
    schema: {
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    try {
      const updatedType = await schemaManager.updateAttributeType(request.params.name, request.body);
      return updatedType;
    } catch (error) {
      reply.code(404).send({ error: error.message });
      return;
    }
  });
  
  fastify.delete('/api/schema/attributes/:name', {
    schema: {
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    try {
      await schemaManager.deleteAttributeType(request.params.name);
      reply.code(204).send();
      return;
    } catch (error) {
      reply.code(404).send({ error: error.message });
      return;
    }
  });

  fastify.get('/api/schema/nodetypes', {
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    return await schemaManager.getNodeTypes();
  });

  fastify.get('/api/schema/nodetypes/:name', {
    schema: {
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    try {
      const nodeTypes = await schemaManager.getNodeTypes();
      const nodeType = nodeTypes.find(t => t.name === request.params.name);
      if (!nodeType) {
        reply.code(404).send({ error: 'Node type not found' });
        return;
      }
      return nodeType;
    } catch (error) {
      reply.code(500).send({ error: error.message });
      return;
    }
  });

  fastify.get('/api/schema/functions', {
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    return await schemaManager.getFunctionTypes();
  });

  fastify.get('/api/schema/functions/:name', {
    schema: {
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    try {
      const functionTypes = await schemaManager.getFunctionTypes();
      const functionType = functionTypes.find(t => t.name === request.params.name);
      if (!functionType) {
        reply.code(404).send({ error: 'Function type not found' });
        return;
      }
      return functionType;
    } catch (error) {
      reply.code(500).send({ error: error.message });
      return;
    }
  });

  // --- Scientific Library API ---
  fastify.get('/api/scientific/libraries', {
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const scientificManager = new ScientificLibraryManager();
    return scientificManager.getAvailableLibraries();
  });

  fastify.get('/api/scientific/libraries/:library', {
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const scientificManager = new ScientificLibraryManager();
    const library = request.params.library;
    const info = scientificManager.getLibraryInfo(library);
    if (!info) {
      reply.code(404).send({ error: 'Library not found' });
      return;
    }
    return info;
  });

  fastify.get('/api/scientific/functions', {
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const scientificManager = new ScientificLibraryManager();
    const { library, category, search } = request.query;
    
    if (library) {
      return scientificManager.getFunctionsByLibrary(library);
    } else if (category) {
      return scientificManager.getFunctionsByCategory(category);
    } else if (search) {
      return scientificManager.searchFunctions(search);
    } else {
      return scientificManager.getAllFunctions();
    }
  });

  fastify.get('/api/scientific/functions/:library/:name', {
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const scientificManager = new ScientificLibraryManager();
    const { library, name } = request.params;
    const info = scientificManager.getFunctionInfo(library, name);
    if (!info) {
      reply.code(404).send({ error: 'Function not found' });
      return;
    }
    return info;
  });

  fastify.post('/api/scientific/validate', {
    schema: {
      body: {
        type: 'object',
        required: ['expression'],
        properties: {
          expression: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const scientificManager = new ScientificLibraryManager();
    const { expression } = request.body;
    const result = scientificManager.validateExpression(expression);
    return result;
  });

  fastify.post('/api/scientific/evaluate', {
    schema: {
      body: {
        type: 'object',
        required: ['expression'],
        properties: {
          expression: { type: 'string' },
          scope: { type: 'object' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const scientificManager = new ScientificLibraryManager();
    const { expression, scope = {} } = request.body;
    try {
      const result = scientificManager.executeExpression(expression, scope);
      return { result, expression, scope };
    } catch (error) {
      reply.code(400).send({ error: error.message });
      return;
    }
  });

  fastify.post('/api/schema/functions', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'expression'],
        properties: {
          name: { type: 'string' },
          expression: { type: 'string' },
          scope: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' },
          required_attributes: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    try {
      const newFunctionType = await schemaManager.addFunctionType(request.body);
      reply.code(201);
      return newFunctionType;
    } catch (error) {
      reply.code(409).send({ error: error.message });
      return;
    }
  });

  fastify.put('/api/schema/functions/:name', {
    schema: {
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    try {
      const updatedFunctionType = await schemaManager.updateFunctionType(request.params.name, request.body);
      return updatedFunctionType;
    } catch (error) {
      reply.code(404).send({ error: error.message });
      return;
    }
  });

  fastify.delete('/api/schema/functions/:name', {
    schema: {
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    try {
      await schemaManager.deleteFunctionType(request.params.name);
      reply.code(204).send();
      return;
    } catch (error) {
      reply.code(404).send({ error: error.message });
      return;
    }
  });
  
  fastify.post('/api/schema/nodetypes', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    try {
      const newType = await schemaManager.addNodeType(request.body);
      reply.code(201);
      return newType;
    } catch (error) {
      reply.code(409).send({ error: error.message });
      return;
    }
  });
  
  fastify.put('/api/schema/nodetypes/:name', {
    schema: {
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    try {
      const updatedType = await schemaManager.updateNodeType(request.params.name, request.body);
      return updatedType;
    } catch (error) {
      reply.code(404).send({ error: error.message });
      return;
    }
  });
  
  fastify.delete('/api/schema/nodetypes/:name', {
    schema: {
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    try {
      await schemaManager.deleteNodeType(request.params.name);
      reply.code(204).send();
      return;
    } catch (error) {
      reply.code(404).send({ error: error.message });
      return;
    }
  });

  // --- Graph Operations API ---
  // Collaboration: create invite (owner issues a view/edit token)
  fastify.post('/api/collab/:graphId/invite', {
    schema: {
      params: { type: 'object', properties: { graphId: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['view', 'edit'] },
          expiresAt: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const dataStore = fastify.dataStore;
    const ownerId = request.user.id;
    const graphId = request.params.graphId;
    const { role, expiresAt } = request.body;
    try {
      // Ensure owner actually owns the graph
      const registry = await dataStore.getGraphRegistry(ownerId);
      const graphInfo = registry.find(g => g.id === graphId);
      if (!graphInfo) {
        reply.code(404).send({ error: 'Graph not found' });
        return;
      }
      const invite = await dataStore.addCollabInvite(ownerId, graphId, role, expiresAt || null);
      reply.code(201).send({ token: invite.token, role: invite.role });
    } catch (e) {
      reply.code(400).send({ error: e.message });
    }
  });

  // Collaboration: resolve invite token to owner/graph/role (no auth)
  fastify.get('/api/collab/resolve/:token', async (request, reply) => {
    const dataStore = fastify.dataStore;
    const { token } = request.params;
    const result = await dataStore.findCollabByToken(token);
    if (!result) {
      reply.code(404).send({ error: 'Invalid or expired invite' });
      return;
    }
    reply.send(result);
  });

  // Collaboration: read graph via invite (no auth; token-scoped)
  fastify.get('/api/collab/:token/graphs/:graphId/graph', async (request, reply) => {
    const dataStore = fastify.dataStore;
    const { token, graphId } = request.params;
    const resolved = await dataStore.findCollabByToken(token);
    if (!resolved || resolved.graphId !== graphId) {
      reply.code(403).send({ error: 'Invalid invite' });
      return;
    }
    const { ownerId } = resolved;
    // Return graph JSON using owner’s storage
    const graph = await dataStore.getGraph(ownerId, graphId);
    if (!graph) {
      reply.code(404).send({ error: 'Graph not found' });
      return;
    }
    // Include mode for frontend
    const manifest = await dataStore.getManifest(ownerId, graphId);
    const mode = manifest?.mode || 'richgraph';
    const name = manifest?.name || graph.name || graphId;
    const description = manifest?.description || graph.description || null;
    reply.send({
      nodes: (graph.nodes || []).filter(n => !n.isDeleted),
      relations: (graph.relations || []).filter(r => !r.isDeleted),
      attributes: (graph.attributes || []).filter(a => !a.isDeleted),
      mode,
      name,
      description
    });
  });

  // Collaboration: read CNL via invite (no auth; token-scoped)
  fastify.get('/api/collab/:token/graphs/:graphId/cnl', async (request, reply) => {
    const dataStore = fastify.dataStore;
    const { token, graphId } = request.params;
    const resolved = await dataStore.findCollabByToken(token);
    if (!resolved || resolved.graphId !== graphId) {
      reply.code(403).send({ error: 'Invalid invite' });
      return;
    }
    const { ownerId } = resolved;
    const cnl = await dataStore.getCnl(ownerId, graphId).catch(() => '');
    reply.send({ cnl });
  });

  // Collaboration: submit CNL via invite (edit role required)
  fastify.post('/api/collab/:token/graphs/:graphId/cnl', {
    schema: {
      params: { type: 'object', properties: { token: { type: 'string' }, graphId: { type: 'string' } } },
      body: { type: 'object', required: ['cnlText'], properties: { cnlText: { type: 'string' } } }
    }
  }, async (request, reply) => {
    const dataStore = fastify.dataStore;
    const { token, graphId } = request.params;
    const { cnlText } = request.body;
    const resolved = await dataStore.findCollabByToken(token);
    if (!resolved || resolved.graphId !== graphId) {
      reply.code(403).send({ error: 'Invalid invite' });
      return;
    }
    if (resolved.role !== 'edit') {
      reply.code(403).send({ error: 'Invite is view-only' });
      return;
    }
    const ownerId = resolved.ownerId;
    try {
      // StrictGraph validation if needed
      const manifest = await dataStore.getManifest(ownerId, graphId);
      const mode = manifest?.mode || 'richgraph';
      if (mode === 'strictgraph') {
        const operations = getOperationsFromCnl(cnlText, mode);
        const errors = await validateOperations(operations);
        if (errors.length > 0) {
          reply.code(400).send({ errors });
          return;
        }
      }
      // Regenerate and save under owner
      const newGraphData = await dataStore.regenerateGraphFromCnl(ownerId, graphId, cnlText);
      await dataStore.saveCnl(ownerId, graphId, cnlText);
      reply.send({ message: 'CNL processed successfully.' });
    } catch (e) {
      reply.code(400).send({ errors: [{ message: e.message }] });
    }
  });
  fastify.get('/api/graphs/:graphId/graph', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT, loadGraph]
  }, async (request, reply) => {
    const graph = request.graph;
    const dataStore = fastify.dataStore;
    const userId = request.user.id;
    const graphId = request.params.graphId;
    
    const nodes = await graph.listAll('nodes');
    const relations = await graph.listAll('relations');
    const attributes = await graph.listAll('attributes');
    
    // Use morph registry for efficient filtering
    let filteredRelations = relations.filter(rel => !rel.isDeleted);
    let filteredAttributes = attributes.filter(attr => !attr.isDeleted);
    
    // Filter by active morphs using the morph registry
    const activeMorphs = new Set();
    nodes.forEach(node => {
      if (node.nbh) {
        activeMorphs.add(node.nbh);
      }
    });
    
    if (activeMorphs.size > 0) {
      // Filter relations and attributes using morph registry
      filteredRelations = dataStore.getFilteredRelations(relations, Array.from(activeMorphs));
      filteredAttributes = dataStore.getFilteredAttributes(attributes, Array.from(activeMorphs));
    }
    
    // Get the graph mode from the manifest
    const manifest = await dataStore.getManifest(userId, graphId);
    const mode = manifest?.mode || 'richgraph';
    
    // Debug: Log the JSON being sent to Cytoscape
    const responseData = {
      nodes: nodes.filter(node => !node.isDeleted),
      relations: filteredRelations,
      attributes: filteredAttributes,
      mode: mode
    };
    
    console.log(`\n=== CYTOSCAPE JSON FOR GRAPH ${graphId} ===`);
    console.log('Total nodes:', responseData.nodes.length);
    console.log('Total relations:', responseData.relations.length);
    console.log('Total attributes:', responseData.attributes.length);
    console.log('Filtered relations:', filteredRelations.length);
    console.log('Filtered attributes:', filteredAttributes.length);
    
    // Log each node with its morph info
    responseData.nodes.forEach(node => {
      console.log(`\nNode: ${node.name} (${node.id})`);
      console.log(`  Active morph (nbh): ${node.nbh}`);
      console.log(`  Morphs:`, node.morphs?.map(m => ({
        name: m.name,
        morph_id: m.morph_id,
        relationCount: m.relationNode_ids?.length || 0,
        attributeCount: m.attributeNode_ids?.length || 0
      })));
      
      // Show which relations belong to this node
      const nodeRelations = responseData.relations.filter(r => r.source_id === node.id || r.target_id === node.id);
      console.log(`  Relations (${nodeRelations.length}):`, nodeRelations.map(r => r.name));
      
      // Show which attributes belong to this node
      const nodeAttributes = responseData.attributes.filter(a => a.source_id === node.id);
      console.log(`  Attributes (${nodeAttributes.length}):`, nodeAttributes.map(a => `${a.name}: ${a.value}`));
    });
    
    console.log('=== END CYTOSCAPE JSON ===\n');
    
    return responseData;
  });

  // Endpoint to get complete, unfiltered graph data by reading graph.json directly
  fastify.get('/api/graphs/:graphId/raw', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const userId = request.user.id;
    const graphId = request.params.graphId;
    
    try {
      // Read graph.json directly from the file system
      const graphPath = path.join(fastify.dataStore.getGraphDataDir(userId, graphId), 'graph.json');
      const graphData = await fs.readFile(graphPath, 'utf-8');
      const parsedData = JSON.parse(graphData);
      
      // Get the graph mode from the manifest
      const manifest = await fastify.dataStore.getManifest(userId, graphId);
      const mode = manifest?.mode || 'richgraph';
      
      // Return data in the same format as the original /graph endpoint
      const responseData = {
        nodes: parsedData.nodes || [],
        relations: parsedData.relations || [],
        attributes: parsedData.attributes || [],
        mode: mode
      };
      
      console.log(`\n=== RAW GRAPH DATA FOR ${graphId} ===`);
      console.log('Total nodes:', responseData.nodes.length);
      console.log('Total relations:', responseData.relations.length);
      console.log('Total attributes:', responseData.attributes.length);
      console.log('Mode:', responseData.mode);
      console.log('=====================================\n');
      
      return responseData;
    } catch (error) {
      console.error('Error reading raw graph data:', error);
      reply.code(404).send({ error: 'Graph not found or could not be read' });
    }
  });

  fastify.get('/api/graphs/:graphId/key', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT, loadGraph]
  }, async (request, reply) => {
    const graph = request.graph;
    return { key: graph.key };
  });

  fastify.get('/api/graphs/:graphId/cnl', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const dataStore = fastify.dataStore;
    const userId = request.user.id;
    const graphId = request.params.graphId;
    try {
      console.log(`[getCnl] Getting CNL for graph: ${graphId}, user: ${userId}`);
      const cnl = await dataStore.getCnl(userId, graphId);
      console.log(`[getCnl] Successfully got CNL for graph: ${graphId}, length: ${cnl.length}`);
      return { cnl };
    } catch (error) {
      console.error(`[getCnl] Error getting CNL for graph ${graphId}:`, error);
      reply.code(500).send({ error: error.message });
      return;
    }
  });

  // Thumbnails removed; previews handled via media-backed preview_url

  // --- CNL Save API (without processing) ---
  fastify.put('/api/graphs/:graphId/cnl', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['cnlText'],
        properties: {
          cnlText: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const dataStore = fastify.dataStore;
    const userId = request.user.id;
    const graphId = request.params.graphId;
    const { cnlText } = request.body;
    
    try {
      console.log(`[CNL Save] Saving CNL for graph ${graphId} by user ${userId}`);
      
      // Just save the CNL text without processing
      await dataStore.saveCnl(userId, graphId, cnlText);
      
      console.log(`[CNL Save] CNL saved successfully for graph ${graphId}`);
      return { message: 'CNL saved successfully.' };
      
    } catch (error) {
      console.error(`[CNL Save] Error for graph ${graphId}:`, error);
      reply.code(400).send({ errors: [{ message: error.message }] });
      return;
    }
  });

  fastify.post('/api/graphs/:graphId/cnl', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['cnlText'],
        properties: {
          cnlText: { type: 'string' },
          strictMode: { type: 'boolean' }
        }
      }
    },
    preHandler: [authenticateJWT, loadGraph]
  }, async (request, reply) => {
    const dataStore = fastify.dataStore;
    const userId = request.user.id;
    const graphId = request.params.graphId;
    const { cnlText } = request.body;
    
    try {
      // Get the current CNL text and graph info to determine mode
      const currentCnl = await dataStore.getCnl(userId, graphId);
      const graphRegistry = await dataStore.getGraphRegistry(userId);
      const graphInfo = graphRegistry.find(g => g.id === graphId);
      const mode = graphInfo?.mode || 'richgraph';
      
      console.log(`[POST /api/graphs/:graphId/cnl] Processing CNL in mode: ${mode}`);

      // StrictGraph mode: validate against schema definitions before processing
      if (mode === 'strictgraph') {
        const operations = getOperationsFromCnl(cnlText, mode);
        const errors = await validateOperations(operations);
        if (errors.length > 0) {
          reply.code(400).send({ errors });
          return;
        }
      }
      
      // Complete replacement approach: regenerate graph from CNL
      console.log(`[CNL Processing] Regenerating graph completely from CNL for graph ${graphId}, user ${userId}`);
      
      // Use user info from JWT token (already validated by Keycloak)
      const userInfo = {
        username: request.user.username,
        email: request.user.email,
        id: request.user.id
      };
      
      // Regenerate the entire graph from the new CNL
      const newGraphData = await dataStore.regenerateGraphFromCnl(userId, graphId, cnlText);
      
      // Update the manifest with new version and commit info
      const updatedManifest = await dataStore.updateManifest(userId, graphId, userInfo);
      
      console.log(`[CNL Processing] Graph regenerated successfully. New version: ${updatedManifest.version}`);
      
      // Save the new CNL as the source of truth
      await dataStore.saveCnl(userId, graphId, cnlText);
      
      // Generate thumbnail for the updated graph
      try {
        await fastify.thumbnailGenerator.generateUserGraphThumbnail(userId, graphId, newGraphData);
        console.log(`[CNL Processing] Thumbnail generated for graph ${graphId}`);
      } catch (thumbnailError) {
        console.error(`[CNL Processing] Failed to generate thumbnail for graph ${graphId}:`, thumbnailError);
        // Don't fail the CNL update if thumbnail generation fails
      }
      
      // Update registry with latest description for Dashboard cards
      try {
        const latestGraph = await dataStore.getGraph(userId, graphId);
        const latestDescription = latestGraph?.description || null;
        await dataStore.updateGraphRegistry(userId, graphId, { description: latestDescription });
      } catch (regErr) {
        console.warn(`[CNL Processing] Failed to update registry description for graph ${graphId}:`, regErr);
      }
      
      return { message: 'CNL processed successfully.' };
    } catch (error) {
      console.error(`[CNL Processing] Error for graph ${graphId}:`, error);
      reply.code(400).send({ errors: [{ message: error.message }] });
      return;
    }
  });

  // --- CNL Suggestion API ---
  fastify.post('/api/cnl/suggest', {
    schema: {
      body: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string' },
          userId: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const { text } = request.body;
    const userId = request.user.id;
    
    try {
      console.log(`[CNL Suggestion] Generating suggestions for user ${userId}: "${text}"`);
      
      // Initialize CNL Suggestion Service
      const cnlSuggestionService = new CNLSuggestionService();
      
      // Generate CNL suggestions
      const suggestions = await cnlSuggestionService.generateSuggestions(text);
      
      console.log(`[CNL Suggestion] Generated ${suggestions.suggestions?.length || 0} suggestions`);
      
      return suggestions;
      
    } catch (error) {
      console.error(`[CNL Suggestion] Error:`, error);
      reply.code(500).send({ 
        success: false, 
        error: 'Failed to generate CNL suggestions',
        details: error.message 
      });
      return;
    }
  });

  // --- CNL Validation API ---
  fastify.post('/api/cnl/validate', {
    schema: {
      body: {
        type: 'object',
        required: ['cnlText'],
        properties: {
          cnlText: { type: 'string' },
          userId: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const { cnlText } = request.body;
    const userId = request.user.id;
    
    try {
      console.log(`[CNL Validation] Validating CNL for user ${userId}`);
      
      // Initialize CNL Suggestion Service
      const cnlSuggestionService = new CNLSuggestionService();
      
      // Analyze the CNL text for quality assessment
      const nlpAnalysis = await cnlSuggestionService.analyzeWithNLP(cnlText);
      
      // Generate quality score and recommendations
      const qualityScore = cnlSuggestionService.assessQuality([], nlpAnalysis);
      const recommendations = cnlSuggestionService.generateRecommendations([], qualityScore);
      
      return {
        success: true,
        cnlText: cnlText,
        qualityScore: qualityScore,
        recommendations: recommendations,
        nlpAnalysis: nlpAnalysis
      };
      
    } catch (error) {
      console.error(`[CNL Validation] Error:`, error);
      reply.code(500).send({ 
        success: false, 
        error: 'Failed to validate CNL',
        details: error.message 
      });
      return;
    }
  });

  // --- Peer Management API ---
  // Legacy hypercore endpoints removed - will be reimplemented with libp2p in Phase 2
  // fastify.get('/api/graphs/:graphId/peers' - removed
  // fastify.post('/api/graphs/:graphId/peers/sync' - removed

  // Get graph publication state
  fastify.get('/api/graphs/:graphId/publication', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const gm = fastify.graphManager;
    const userId = request.user.id;
    const graphId = request.params.graphId;
    
    try {
      const graphRegistry = await gm.getGraphRegistry(userId);
      const graphInfo = graphRegistry.find(g => g.id === graphId);
      if (!graphInfo) {
        reply.code(404).send({ error: 'Graph not found' });
        return;
      }
      return { publication_state: graphInfo.publication_state || 'Private' };
    } catch (error) {
      reply.code(500).send({ error: error.message });
      return;
    }
  });

  // Update graph publication state
  fastify.put('/api/graphs/:graphId/publication', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['publication_state'],
        properties: {
          publication_state: { 
            type: 'string', 
            enum: ['Private', 'P2P', 'Public'] 
          }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const gm = fastify.graphManager;
    const userId = request.user.id;
    const graphId = request.params.graphId;
    const { publication_state } = request.body;
    
    try {
      const updatedGraph = await gm.updatePublicationState(userId, graphId, publication_state);
      return updatedGraph;
    } catch (error) {
      reply.code(400).send({ error: error.message });
      return;
    }
  });

  // Update graph mode
  fastify.put('/api/graphs/:graphId/mode', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['mode'],
        properties: {
          mode: {
            type: 'string',
            enum: ['markdown', 'mindmap', 'richgraph', 'strictgraph']
          }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const dataStore = fastify.dataStore;
    const userId = request.user.id;
    const graphId = request.params.graphId;
    const { mode } = request.body;
    try {
      const updatedRegistry = await dataStore.updateGraphRegistry(userId, graphId, { mode });
      const updated = updatedRegistry.find(g => g.id === graphId);
      return updated || { id: graphId, mode };
    } catch (error) {
      reply.code(400).send({ error: error.message });
      return;
    }
  });

  // Set graph preview (URL to SVG/PNG hosted via media backend)
  fastify.put('/api/graphs/:graphId/preview', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['preview_url'],
        properties: {
          preview_url: { type: 'string' },
          node_id: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const dataStore = fastify.dataStore;
    const userId = request.user.id;
    const graphId = request.params.graphId;
    const { preview_url, node_id } = request.body;
    try {
      const updates = { preview_url };
      if (node_id) Object.assign(updates, { preview_node_id: node_id });
      const updated = await dataStore.updateGraphRegistry(userId, graphId, updates);
      const info = updated.find(g => g.id === graphId) || { id: graphId, preview_url };
      reply.code(200).send(info);
    } catch (error) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Publish graph (export to public folder)
  fastify.post('/api/graphs/:graphId/publish', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const gm = fastify.graphManager;
    const userId = request.user.id;
    const graphId = request.params.graphId;
    
    try {
      const result = await gm.publishGraph(userId, graphId);
      return { message: 'Graph published successfully', publishedAt: result.publishedAt };
    } catch (error) {
      reply.code(400).send({ error: error.message });
      return;
    }
  });

  // --- Graph Export (NDF) ---
  // Creates a zip containing the graph folder contents, including .git, with a magic header file
  fastify.get('/api/graphs/:graphId/export', {
    schema: {
      params: {
        type: 'object',
        properties: { graphId: { type: 'string' } }
      },
      querystring: {
        type: 'object',
        properties: { name: { type: 'string' } }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const userId = request.user.id;
    const graphId = request.params.graphId;
    const name = (request.query.name || 'graph').toString().replace(/[^a-zA-Z0-9-_\.]/g, '_');
    const ds = fastify.dataStore;
    try {
      const graphDir = ds.getGraphDataDir(userId, graphId);
      // Verify graph exists
      await fs.access(graphDir);

      // Ensure manifest.description is present by hydrating from registry or graph.json
      try {
        const manifestPath = path.join(graphDir, 'manifest.json');
        let manifest = {};
        try {
          const m = await fs.readFile(manifestPath, 'utf-8');
          manifest = JSON.parse(m || '{}');
        } catch {}
        if (!manifest.description || String(manifest.description).trim() === '') {
          let description = '';
          try {
            const registry = await ds.getGraphRegistry(userId);
            const entry = Array.isArray(registry) ? registry.find(g => g && g.id === graphId) : null;
            if (entry && entry.description) description = entry.description;
          } catch {}
          if (!description) {
            try {
              const gjson = await fs.readFile(path.join(graphDir, 'graph.json'), 'utf-8');
              const parsed = JSON.parse(gjson || '{}');
              if (parsed && parsed.description) description = parsed.description;
            } catch {}
          }
          if (description) {
            manifest.description = description;
            await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
          }
        }
      } catch (e) {
        request.log.warn({ err: e }, 'Failed to hydrate manifest description before export');
      }

      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ndf-'));
      const outPath = path.join(tmpDir, `${name}.ndf.zip`);
      const output = (await import('fs')).createWriteStream(outPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('error', (err) => { throw err; });
      archive.pipe(output);

      // Add magic file (clearly states it's a ZIP container)
      archive.append('NodeBook NDF v1 (ZIP)\n', { name: 'NDF.MAGIC' });

      // Add thumbnail/preview for OS file managers
      try {
        let previewBuffer = null;
        let thumbName = 'thumbnail.svg';
        // Check registry for preview_url
        try {
          const registry = await ds.getGraphRegistry(userId);
          const entry = Array.isArray(registry) ? registry.find(g => g && g.id === graphId) : null;
          const previewUrl = entry?.preview_url;
          if (previewUrl) {
            const headers = {};
            const authHeader = request.headers['authorization'];
            if (authHeader) headers['Authorization'] = authHeader;
            // If preview URL points to localhost from a container, rewrite to internal media host
            let fetchUrl = previewUrl;
            try {
              const u = new URL(previewUrl);
              if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
                const internalMedia = process.env.MEDIA_BACKEND_INTERNAL_URL || 'http://media-backend:3001';
                const iu = new URL(internalMedia);
                u.protocol = iu.protocol;
                u.hostname = iu.hostname;
                u.port = iu.port;
                fetchUrl = u.toString();
              }
            } catch {}
            const resp = await fetch(fetchUrl, { headers });
            if (resp.ok) {
              const ct = resp.headers.get('content-type') || '';
              if (ct.includes('svg')) thumbName = 'thumbnail.svg';
              else if (ct.includes('png')) thumbName = 'thumbnail.png';
              else if (ct.includes('jpeg') || ct.includes('jpg')) thumbName = 'thumbnail.jpg';
              previewBuffer = Buffer.from(await resp.arrayBuffer());
            }
          }
        } catch {}
        // Fallback simple SVG
        if (!previewBuffer) {
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="100%" height="100%" fill="#eef2ff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1e3a8a">NodeBook Graph Preview</text></svg>`;
          previewBuffer = Buffer.from(svg, 'utf-8');
          thumbName = 'thumbnail.svg';
        }
        // Add at root
        archive.append(previewBuffer, { name: thumbName });
        // Also include inside the graph folder for portability
        archive.append(previewBuffer, { name: `graph/${thumbName}` });
      } catch (e) {
        request.log.warn({ err: e }, 'Failed to add thumbnail to NDF');
      }
      // Add graph folder recursively, including .git
      archive.directory(graphDir, 'graph');

      // If strictgraph, include global schemas directory
      try {
        const manifest = await ds.getManifest(userId, graphId);
        const mode = manifest?.mode || 'richgraph';
        if (mode === 'strictgraph') {
          const dataPath = process.env.DATA_PATH || './user_data';
          const schemasDir = path.join(dataPath, 'schemas');
          await fs.access(schemasDir).then(() => {
            archive.directory(schemasDir, 'schemas');
          }).catch(() => {});
        }
      } catch {}

      await archive.finalize();

      // Stream file to client
      reply.header('Content-Type', 'application/zip');
      reply.header('Content-Disposition', `attachment; filename="${name}.ndf.zip"`);
      const readStream = (await import('fs')).createReadStream(outPath);
      return reply.send(readStream);
    } catch (error) {
      console.error(`[GET /api/graphs/${graphId}/export] Error:`, error);
      reply.code(400).send({ error: error.message });
    }
  });

  // --- Graph Import (NDF) ---
  // Accepts multipart upload of an NDF zip, extracts into a new graph folder, returns new graph id
  fastify.post('/api/graphs/import', {
    schema: {
      consumes: ['multipart/form-data']
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const userId = request.user.id;
    const ds = fastify.dataStore;
    try {
      const data = await request.file();
      if (!data) {
        reply.code(400).send({ error: 'No file uploaded' });
        return;
      }
      // Write upload to temp file
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ndf-imp-'));
      const uploadPath = path.join(tmpDir, data.filename || 'graph.ndf.zip');
      const writeStream = (await import('fs')).createWriteStream(uploadPath);
      await pipeline(data.file, writeStream);

      // Verify magic
      // extract to temp folder first to read magic
      const extractDir = path.join(tmpDir, 'extracted');
      await extract(uploadPath, { dir: extractDir });
      const magicPath = path.join(extractDir, 'NDF.MAGIC');
      const magic = await fs.readFile(magicPath, 'utf-8').catch(() => '');
      if (!magic.startsWith('NodeBook NDF')) {
        reply.code(400).send({ error: 'Invalid NDF package' });
        return;
      }

      // Determine new graph id and optional name
      const graphId = crypto.randomUUID();
      const providedName = data.fields?.name?.value || 'Imported Graph';
      const graphFolder = path.join(extractDir, 'graph');

      // Move extracted graph to user graphs directory under new id
      const destDir = ds.getGraphDataDir(userId, graphId);
      await fs.mkdir(path.dirname(destDir), { recursive: true });
      // Use rename; if cross-device (EXDEV), fallback to copy+remove
      try {
        await fs.rename(graphFolder, destDir);
      } catch (err) {
        if (err && err.code === 'EXDEV') {
          // Cross-device: copy recursively then remove source
          if (typeof fs.cp === 'function') {
            await fs.cp(graphFolder, destDir, { recursive: true });
          } else {
            // Fallback simple copy via archiver/extract: zip then unzip to dest
            // Create a temp zip
            const tmpZip = path.join(tmpDir, 'graph-copy.zip');
            const zipOut = (await import('fs')).createWriteStream(tmpZip);
            const zip = archiver('zip', { zlib: { level: 9 } });
            await new Promise((resolve, reject) => {
              zip.on('error', reject);
              zip.pipe(zipOut);
              zip.directory(graphFolder, false);
              zip.finalize();
              zipOut.on('close', resolve);
              zipOut.on('error', reject);
            });
            await extract(tmpZip, { dir: destDir });
          }
          // Remove source folder
          await fs.rm(graphFolder, { recursive: true, force: true });
        } else {
          throw err;
        }
      }

      // Update manifest with new id/name
      const manifestPath = path.join(destDir, 'manifest.json');
      let manifest = {};
      try {
        const m = await fs.readFile(manifestPath, 'utf-8');
        manifest = JSON.parse(m);
      } catch {}
      manifest.id = graphId;
      manifest.name = providedName;
      manifest.modified_at = new Date().toISOString();
      manifest.modified_by = request.user.username || 'Unknown';
      manifest.modified_by_id = userId;
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

      // Ensure registry entry
      await ds.updateGraphRegistry(userId, graphId, {
        id: graphId,
        name: providedName,
        author: manifest.author || request.user.username || 'Unknown',
        email: manifest.email || request.user.email || '',
        mode: manifest.mode || 'richgraph',
        createdAt: manifest.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      reply.code(201).send({ id: graphId, name: providedName });
    } catch (error) {
      console.error('[POST /api/graphs/import] Error:', error);
      reply.code(400).send({ error: error.message });
    }
  });


  // --- Media Management API ---
  // Temporarily suspended - will be re-enabled in Phase 2
  /*
  if (mediaManager) {
    console.log('🔧 Registering media routes...');
    
    console.log('🔧 Registering media upload route: POST /api/media/upload');
    fastify.post('/api/media/upload', {
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const userId = request.user.id;
    
    try {
      const data = await request.file();
      if (!data) {
        reply.code(400).send({ error: 'No file uploaded' });
        return;
      }
      
      const buffer = await data.toBuffer();
      const fileName = data.filename;
      const mimeType = data.mimetype;
      
      // Get form fields from multipart data
      const description = data.fields.description?.value || '';
      const tags = data.fields.tags?.value ? data.fields.tags.value.split(',').map(t => t.trim()) : [];
      const graphId = data.fields.graphId?.value || null;
      const nodeId = data.fields.nodeId?.value || null;
      
      // Additional metadata
      const metadata = {
        description,
        tags,
        graphId,
        nodeId
      };
      
      const fileInfo = await fastify.mediaManager.uploadFile(
        userId, 
        buffer, 
        fileName, 
        mimeType, 
        metadata
      );
      
      reply.code(201);
      return fileInfo;
      
    } catch (error) {
      console.error(`[POST /api/media/upload] Error:`, error);
      reply.code(500).send({ error: error.message });
      return;
    }
  });

  console.log('🔧 Registering media files route: GET /api/media/files');
  fastify.get('/api/media/files', {
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const userId = request.user.id;
    const { type, search, limit, offset } = request.query;
    
    try {
      const files = await fastify.mediaManager.listFiles(userId, {
        type,
        search,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined
      });
      
      return files;
      
    } catch (error) {
      console.error(`[GET /api/media/files] Error:`, error);
      reply.code(500).send({ error: error.message });
      return;
    }
  });

  fastify.get('/api/media/files/:fileId', {
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const userId = request.user.id;
    const fileId = request.params.fileId;
    
    try {
      const file = await fastify.mediaManager.getFile(userId, fileId);
      
      // Set appropriate headers
      reply.header('Content-Type', file.metadata.mimeType);
      reply.header('Content-Disposition', `inline; filename="${file.metadata.name}"`);
      reply.header('Cache-Control', 'public, max-age=3600');
      
      return file.content;
      
    } catch (error) {
      console.error(`[GET /api/media/files/:fileId] Error:`, error);
      reply.code(404).send({ error: 'File not found' });
      return;
    }
  });

  fastify.delete('/api/media/files/:fileId', {
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const userId = request.user.id;
    const fileId = request.params.fileId;
    
    try {
      await fastify.mediaManager.deleteFile(userId, fileId);
      reply.code(204).send();
      return;
      
    } catch (error) {
      console.error(`[DELETE /api/media/files/:fileId] Error:`, error);
      reply.code(404).send({ error: error.message });
      return;
    }
  });

  fastify.put('/api/media/files/:fileId/metadata', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const userId = request.user.id;
    const fileId = request.params.fileId;
    const updates = request.body;
    
    try {
      const updatedMetadata = await fastify.mediaManager.updateFileMetadata(userId, fileId, updates);
      return updatedMetadata;
      
    } catch (error) {
      console.error(`[PUT /api/media/files/:fileId/metadata] Error:`, error);
      reply.code(404).send({ error: error.message });
      return;
    }
  });

  fastify.get('/api/media/stats', {
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const userId = request.user.id;
    
    try {
      const stats = await fastify.mediaManager.getStorageStats(userId);
      return stats;
      
    } catch (error) {
      console.error(`[GET /api/media/stats] Error:`, error);
      reply.code(500).send({ error: error.message });
      return;
    }
  });

  } // End of if (mediaManager) block
  */

  // --- Version Control API ---
  fastify.get('/api/graphs/:graphId/versions', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const dataStore = fastify.dataStore;
    const userId = request.user.id;
    const graphId = request.params.graphId;
    const limit = request.query.limit || 50;
    
    try {
      console.log(`[GET /api/graphs/${graphId}/versions] Getting version history for user ${userId}`);
      const history = await dataStore.getVersionHistory(userId, graphId, limit);
      return { versions: history };
    } catch (error) {
      console.error(`[GET /api/graphs/${graphId}/versions] Error:`, error);
      reply.code(500).send({ error: error.message });
      return;
    }
  });

  fastify.get('/api/graphs/:graphId/versions/:commitId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' },
          commitId: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const dataStore = fastify.dataStore;
    const userId = request.user.id;
    const graphId = request.params.graphId;
    const commitId = request.params.commitId;
    
    try {
      console.log(`[GET /api/graphs/${graphId}/versions/${commitId}] Getting version for user ${userId}`);
      const version = await dataStore.getVersion(userId, graphId, commitId);
      if (!version) {
        reply.code(404).send({ error: 'Version not found' });
        return;
      }
      return version;
    } catch (error) {
      console.error(`[GET /api/graphs/${graphId}/versions/${commitId}] Error:`, error);
      reply.code(500).send({ error: error.message });
      return;
    }
  });

  fastify.post('/api/graphs/:graphId/versions/:commitId/revert', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' },
          commitId: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const dataStore = fastify.dataStore;
    const userId = request.user.id;
    const graphId = request.params.graphId;
    const commitId = request.params.commitId;
    
    try {
      console.log(`[POST /api/graphs/${graphId}/versions/${commitId}/revert] Reverting for user ${userId}`);
      const result = await dataStore.revertToVersion(userId, graphId, commitId);
      if (!result.success) {
        reply.code(400).send({ error: result.error });
        return;
      }
      return result;
    } catch (error) {
      console.error(`[POST /api/graphs/${graphId}/versions/${commitId}/revert] Error:`, error);
      reply.code(500).send({ error: error.message });
      return;
    }
  });

  fastify.post('/api/graphs/:graphId/versions/commit', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string' },
          author: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const dataStore = fastify.dataStore;
    const userId = request.user.id;
    const graphId = request.params.graphId;
    const { message, author } = request.body;
    
    try {
      console.log(`[POST /api/graphs/${graphId}/versions/commit] Committing version for user ${userId}`);
      
      // Get user info for Git configuration
      const userName = request.user.name || request.user.username || 'Unknown';
      const userEmail = request.user.email || 'unknown@example.com';
      
      // Initialize version control if not already done
      await dataStore.initializeVersionControl(userId, graphId, userName, userEmail);
      
      const result = await dataStore.commitVersion(userId, graphId, message, author, userName, userEmail);
      return result;
    } catch (error) {
      console.error(`[POST /api/graphs/${graphId}/versions/commit] Error:`, error);
      reply.code(500).send({ error: error.message });
      return;
    }
  });

  fastify.get('/api/graphs/:graphId/versions/compare', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        required: ['commit1', 'commit2'],
        properties: {
          commit1: { type: 'string' },
          commit2: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const dataStore = fastify.dataStore;
    const userId = request.user.id;
    const graphId = request.params.graphId;
    const { commit1, commit2 } = request.query;
    
    try {
      console.log(`[GET /api/graphs/${graphId}/versions/compare] Comparing versions for user ${userId}`);
      const result = await dataStore.compareVersions(userId, graphId, commit1, commit2);
      return result;
    } catch (error) {
      console.error(`[GET /api/graphs/${graphId}/versions/compare] Error:`, error);
      reply.code(500).send({ error: error.message });
      return;
    }
  });

  // DELETE route for graphs - must come AFTER all other graph routes to avoid conflicts
  fastify.delete('/api/graphs/:graphId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT]
  }, async (request, reply) => {
    const dataStore = fastify.dataStore;
    const userId = request.user.id;
    const graphId = request.params.graphId;
    
    try {
      console.log(`[DELETE /api/graphs/${graphId}] Deleting graph for user ${userId}`);
      await dataStore.deleteGraph(userId, graphId);
      reply.code(204).send();
      return;
    } catch (error) {
      console.error(`[DELETE /api/graphs/${graphId}] Error:`, error);
      reply.code(500).send({ error: error.message });
      return;
    }
  });

  // --- Morph Management ---
  fastify.post('/api/graphs/:graphId/nodes/:nodeId/morph', {
    preHandler: DISABLE_AUTH ? [] : [authenticateJWT],
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' },
          nodeId: { type: 'string' }
        },
        required: ['graphId', 'nodeId']
      },
      body: {
        type: 'object',
        properties: {
          morphId: { type: 'string' }
        },
        required: ['morphId']
      }
    }
  }, async (request, reply) => {
    const { graphId, nodeId } = request.params;
    const { morphId } = request.body;
    
    // In dev mode, use a default user ID; otherwise use authenticated user
    const userId = DISABLE_AUTH ? 'dev-user-id' : request.user?.sub;

    if (!userId) {
      reply.code(401).send({ error: 'Authentication required' });
      return;
    }

    try {
      console.log(`[POST /api/graphs/${graphId}/nodes/${nodeId}/morph] Changing morph for user ${userId}`);
      const result = await dataStore.changeMorph(userId, graphId, nodeId, morphId);
      reply.code(200).send(result);
      return;
    } catch (error) {
      console.error(`[POST /api/graphs/${graphId}/nodes/${nodeId}/morph] Error:`, error);
      reply.code(500).send({ error: error.message });
      return;
    }
  });

  // --- Debug endpoint for morph registry ---
  fastify.get('/api/debug/morph-registry', {
    preHandler: [authenticateJWT, loadGraph]
  }, async (request, reply) => {
    const dataStore = fastify.dataStore;
    const stats = dataStore.morphRegistry.getStats();
    const allMorphs = dataStore.morphRegistry.getAllMorphs();
    const hydrogenMorphs = dataStore.morphRegistry.getNodeMorphs('hydrogen');
    
    return {
      stats,
      totalMorphs: allMorphs.length,
      hydrogenMorphs: hydrogenMorphs.map(m => ({
        morphId: m.morphId,
        name: m.morphName,
        relations: m.relationIds.length,
        attributes: m.attributeIds.length
      }))
    };
  });

  // --- WebSocket for real-time communication ---
  const wss = new WebSocketServer({ server: fastify.server });
  
  wss.on('connection', (ws) => {
    console.log('Frontend connected via WebSocket');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'start-publish') {
          const progressCallback = (progressCallback) => {
            ws.send(JSON.stringify({ type: 'publish-progress', message: progressCallback }));
          };

          // Static site generation is deprecated
          ws.send(JSON.stringify({ type: 'publish-complete', message: 'Static site generation is deprecated.' }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => console.log('Frontend disconnected from WebSocket'));
  });
      
      // Start server
      await fastify.listen({ port: PORT, host: '0.0.0.0' });
      console.log(`🚀 NodeBook Enhanced Fastify Server running on http://localhost:${PORT}`);
      console.log(`📱 Test endpoint: http://localhost:${PORT}/api/health`);
      console.log(`⚡ High performance, built-in validation, plugin architecture`);
      console.log(`🎯 Full graph processing logic restored from server.js`);
      console.log(`🔐 CNL operations, schema management, node registry all working`);
  }
  
  main().catch(console.error);
  