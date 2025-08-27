const fastify = require('fastify')({ 
    logger: true,
    trustProxy: true
  });
const WebSocket = require('ws');
  const path = require('path');
  const fs = require('fs').promises;
const HyperGraph = require('./hyper-graph');
const GraphManager = require('./graph-manager'); // Import the class
const schemaManager = require('./schema-manager');
const ThumbnailGenerator = require('./thumbnail-generator');
const { diffCnl, getNodeOrderFromCnl } = require('./cnl-parser');
const { evaluate } = require('mathjs');
const { buildStaticSite } = require('./build-static-site');
const auth = require('./auth');
const ScientificLibraryManager = require('./scientific-library-manager');
  
  const PORT = process.env.PORT || 3000;
  
// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: true,
  credentials: true
});

// Register multipart for file uploads
fastify.register(require('@fastify/multipart'), {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Max 10 files per request
  }
});
  
  // Custom authentication hook
  async function authenticateJWT(request, reply) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'No token provided' });
      return reply;
    }
    
    const token = authHeader.substring(7);
    try {
      const payload = auth.verifyToken(token);
      if (!payload || !payload.username) {
        reply.code(401).send({ error: 'Invalid token payload' });
        return reply;
      }
      
      // Get the full user object from the database using the username
      const user = await auth.findUser(payload.username);
      if (!user) {
        reply.code(401).send({ error: 'User not found' });
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
    const gm = fastify.graphManager;
    const graphId = request.params.graphId;
    const userId = request.user.id;
    
    try {
      console.log(`[loadGraph] Loading graph: ${graphId} for user: ${userId}`);
      const graph = await gm.getGraph(userId, graphId, HyperGraph);
      if (!graph) {
        console.log(`[loadGraph] Graph not found: ${graphId}`);
        reply.code(404).send({ error: 'Graph not found' });
        return;
      }
      
      // Wait for Hypercore to be ready (fixes race condition)
      if (graph.core && typeof graph.core.ready === 'function') {
        await graph.core.ready();
        console.log(`[loadGraph] Hypercore ready for graph: ${graphId}`);
      }
      
      console.log(`[loadGraph] Successfully loaded graph: ${graphId}`);
      request.graph = graph;
    } catch (error) {
      console.error(`[loadGraph] Error loading graph ${graphId}:`, error);
      reply.code(500).send({ error: 'Failed to load graph', details: error.message });
      return;
    }
  }
  
async function main() {
  // Initialize authentication database
  await auth.initializeDatabase();
  console.log('✅ Auth database initialized');
  
  // Create a single instance of the GraphManager
  const graphManager = new GraphManager();
  
  // The first command-line argument (index 2) is our data path.
  const dataPath = process.argv[2] || './user_data';
  console.log('🔧 Using dataPath:', dataPath);
  // Initialize the instance with the correct path.
  await graphManager.initialize(dataPath);

  // Attach the initialized instance to the fastify object
  fastify.decorate('graphManager', graphManager);
  
  // Initialize ThumbnailGenerator
  const thumbnailGenerator = new ThumbnailGenerator(graphManager.BASE_DATA_DIR);
  fastify.decorate('thumbnailGenerator', thumbnailGenerator);
  
  // Initialize MediaManager
  let mediaManager = null;
  try {
    const MediaManager = require('./media-manager');
    mediaManager = new MediaManager(graphManager.BASE_DATA_DIR);
    fastify.decorate('mediaManager', mediaManager);
    console.log('✅ MediaManager initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize MediaManager:', error);
    console.log('⚠️ Continuing without MediaManager - media features will be disabled');
    // Don't throw error - let server start without MediaManager
  }
  
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
      
      // Use our auth module
      const user = await auth.findUser(username);
      if (!user || !(await auth.validateUser(username, password))) {
        reply.code(401).send({ error: 'Invalid credentials' });
        return;
      }
      
      const token = auth.generateToken(user);
      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          isAdmin: user.is_admin,
          email: user.email
        }
      };
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
  
      const user = await auth.createUser(username, email, password);
      const token = auth.generateToken(user);
      
      reply.code(201);
      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          isAdmin: user.isAdmin,
          email: user.email
        }
      };
    } catch (error) {
      reply.code(400).send({ error: error.message });
      return;
    }
  });
  
  fastify.get('/api/auth/me', {
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT,
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
    preHandler: authenticateJWT
  }, async (request, reply) => {
    const gm = fastify.graphManager; // Get instance from fastify
    const userId = request.user.id;
    console.log(`[GET /api/graphs] User ID: ${userId}, Type: ${typeof userId}`);
    try {
      const graphs = await gm.getGraphRegistry(userId);
      // Add publication state if not present (for backward compatibility)
      const graphsWithPublicationState = graphs.map(graph => ({
        ...graph,
        publication_state: graph.publication_state || 'Private'
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
            enum: ['mindmap', 'richgraph'],
            default: 'richgraph'
          }
        }
      }
    },
    preHandler: authenticateJWT
  }, async (request, reply) => {
    const gm = fastify.graphManager; // Get instance from fastify
    const userId = request.user.id;
    const { name, author, email, mode = 'richgraph' } = request.body;
    console.log(`[POST /api/graphs] User ID: ${userId}, Type: ${typeof userId}, Name: ${name}, Mode: ${mode}`);
    if (!name) {
      reply.code(400).send({ error: 'name is required' });
      return;
    }
    try {
      const newGraph = await gm.createGraph(userId, name, author, email, mode);
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
    preHandler: authenticateJWT
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

  // --- Public Thumbnail Endpoint (No Authentication Required) ---
  fastify.get('/api/public/graphs/:graphId/thumbnail', async (request, reply) => {
    const gm = fastify.graphManager;
    const graphId = request.params.graphId;
    
    try {
      // For public graphs, check if thumbnail exists in the public graphs directory
              const thumbnailPath = path.join(gm.BASE_DATA_DIR, 'graphs', graphId, 'thumbnail.png');
      
      // Check if thumbnail exists
      try {
        await fs.access(thumbnailPath);
        // Set proper headers for PNG image
        reply.header('Content-Type', 'image/png');
        reply.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        return reply.sendFile(thumbnailPath);
      } catch (accessError) {
        // Thumbnail doesn't exist, return 404
        reply.code(404).send({ error: 'Thumbnail not found' });
        return;
      }
    } catch (error) {
      console.error(`[getPublicThumbnail] Error getting thumbnail for public graph ${graphId}:`, error);
      reply.code(500).send({ error: 'Failed to get thumbnail' });
      return;
    }
  });

  // --- Schema CRUD API ---
  fastify.get('/api/schema/relations', {
    preHandler: authenticateJWT
  }, async (request, reply) => {
    return await schemaManager.getRelationTypes();
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
  }, async (request, reply) => {
    return await schemaManager.getAttributeTypes();
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
  }, async (request, reply) => {
    return await schemaManager.getNodeTypes();
  });

  fastify.get('/api/schema/functions', {
    preHandler: authenticateJWT
  }, async (request, reply) => {
    return await schemaManager.getFunctionTypes();
  });

  // --- Scientific Library API ---
  fastify.get('/api/scientific/libraries', {
    preHandler: authenticateJWT
  }, async (request, reply) => {
    const scientificManager = new ScientificLibraryManager();
    return scientificManager.getAvailableLibraries();
  });

  fastify.get('/api/scientific/libraries/:library', {
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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
    const nodes = await graph.listAll('nodes');
    const relations = await graph.listAll('relations');
    const attributes = await graph.listAll('attributes');
    
    return {
      nodes: nodes.filter(node => !node.isDeleted),
      relations: relations.filter(rel => !rel.isDeleted),
      attributes: attributes.filter(attr => !attr.isDeleted)
    };
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
    preHandler: [authenticateJWT, loadGraph]
  }, async (request, reply) => {
    const gm = fastify.graphManager;
    const userId = request.user.id;
    const graphId = request.params.graphId;
    try {
      console.log(`[getCnl] Getting CNL for graph: ${graphId}, user: ${userId}`);
      const cnl = await gm.getCnl(userId, graphId);
      console.log(`[getCnl] Successfully got CNL for graph: ${graphId}, length: ${cnl.length}`);
      return { cnl };
    } catch (error) {
      console.error(`[getCnl] Error getting CNL for graph ${graphId}:`, error);
      reply.code(500).send({ error: error.message });
      return;
    }
  });

  // --- Thumbnail Endpoint ---
  fastify.get('/api/graphs/:graphId/thumbnail', {
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
    const gm = fastify.graphManager;
    const userId = request.user.id;
    const graphId = request.params.graphId;
    
    try {
      // Construct the thumbnail path
              const thumbnailPath = path.join(gm.BASE_DATA_DIR, 'graphs', 'users', userId.toString(), graphId, 'thumbnail.png');
      
      // Check if thumbnail exists
      try {
        await fs.access(thumbnailPath);
        // Set proper headers for PNG image
        reply.header('Content-Type', 'image/png');
        reply.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        return reply.sendFile(thumbnailPath);
      } catch (accessError) {
        // Thumbnail doesn't exist, return 404
        reply.code(404).send({ error: 'Thumbnail not found' });
        return;
      }
    } catch (error) {
      console.error(`[getThumbnail] Error getting thumbnail for graph ${graphId}:`, error);
      reply.code(500).send({ error: 'Failed to get thumbnail' });
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
    const gm = fastify.graphManager;
    const userId = request.user.id;
    const graphId = request.params.graphId;
    const { cnlText, strictMode = true } = request.body;
    
    try {
      // Get the current CNL text and graph info to determine mode
      const currentCnl = await gm.getCnl(userId, graphId);
      const graphRegistry = await gm.getGraphRegistry(userId);
      const graphInfo = graphRegistry.find(g => g.id === graphId);
      const mode = graphInfo?.mode || 'richgraph';
      
      console.log(`[POST /api/graphs/:graphId/cnl] Processing CNL in mode: ${mode}`);
      
      const result = await diffCnl(currentCnl, cnlText, mode);
      const operations = result.operations || [];
      
      if (operations.length > 0) {
        // First pass: deletions
        for (const op of operations) {
          if (op.type.startsWith('delete')) {
            switch (op.type) {
              case 'deleteNode':
                await request.graph.deleteNode(op.payload.id);
                break;
              case 'deleteRelation':
                await request.graph.deleteRelation(op.payload.id);
                break;
              case 'deleteAttribute':
                await request.graph.deleteAttribute(op.payload.id);
                break;
            }
          }
        }
        // Second pass: additions
        for (const op of operations) {
          if (op.type.startsWith('add')) {
            switch (op.type) {
              case 'addNode':
                const existingNode = await request.graph.getNode(op.payload.options.id);
                if (!existingNode) {
                  await request.graph.addNode(op.payload.base_name, op.payload.options);
                  await gm.addNodeToRegistry(userId, { id: op.payload.options.id, ...op.payload });
                }
                await gm.registerNodeInGraph(userId, op.payload.options.id, graphId);
                break;
              case 'addRelation':
                const targetNode = await request.graph.getNode(op.payload.target);
                if (!targetNode) {
                  await request.graph.addNode(op.payload.target, { id: op.payload.target });
                  await gm.addNodeToRegistry(userId, { id: op.payload.target, base_name: op.payload.target });
                }
                await gm.registerNodeInGraph(userId, op.payload.target, graphId);
                await request.graph.addRelation(op.payload.source, op.payload.target, op.payload.name, op.payload.options);
                break;
              case 'addAttribute':
                await request.graph.addAttribute(op.payload.source, op.payload.name, op.payload.value, op.payload.options);
                break;
            }
          }
        }
        // Third pass: updates and functions
        for (const op of operations) {
          if (op.type === 'updateNode') {
            await request.graph.updateNode(op.payload.id, op.payload.fields);
          } else if (op.type === 'applyFunction') {
            const functionTypes = await schemaManager.getFunctionTypes();
            const funcType = functionTypes.find(ft => ft.name === op.payload.name);
            if (funcType) {
              await request.graph.applyFunction(op.payload.source, op.payload.name, funcType.expression, op.payload.options);
            }
          } else if (op.type === 'updateGraphDescription') {
            await gm.updateGraphMetadata(userId, graphId, { description: op.payload.description });
          }
        }
      }
      
      // Check for validation errors
      if (result.errors && result.errors.length > 0) {
        reply.code(422).send({ errors: result.errors });
        return;
      }
      
      console.log(`[CNL Processing] Saving CNL for graph ${graphId}, user ${userId}`);
      await gm.saveCnl(userId, request.params.graphId, cnlText);
      console.log(`[CNL Processing] CNL saved successfully for graph ${graphId}`);
      
      // Generate thumbnail for the updated graph
      try {
        const graphData = {
          nodes: await request.graph.listAll('nodes'),
          relations: await request.graph.listAll('relations'),
          attributes: await request.graph.listAll('attributes')
        };
        
        // Filter out deleted items
        const activeNodes = graphData.nodes.filter(node => !node.isDeleted);
        const activeRelations = graphData.relations.filter(rel => !rel.isDeleted);
        const activeAttributes = graphData.attributes.filter(attr => !attr.isDeleted);
        
        const cleanGraphData = {
          nodes: activeNodes,
          relations: activeRelations,
          attributes: activeAttributes
        };
        
        await fastify.thumbnailGenerator.generateUserGraphThumbnail(userId, graphId, cleanGraphData);
        console.log(`[CNL Processing] Thumbnail generated for graph ${graphId}`);
      } catch (thumbnailError) {
        console.error(`[CNL Processing] Failed to generate thumbnail for graph ${graphId}:`, thumbnailError);
        // Don't fail the CNL update if thumbnail generation fails
      }
      
      return { message: 'CNL processed successfully.' };
    } catch (error) {
      console.error(`[CNL Processing] Error for graph ${graphId}:`, error);
      reply.code(400).send({ errors: [{ message: error.message }] });
      return;
    }
  });

  // --- Peer Management API ---
  fastify.get('/api/graphs/:graphId/peers', {
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
    const status = request.graph.getSwarmStatus();
    return status;
  });

  fastify.post('/api/graphs/:graphId/peers/sync', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['remoteKey'],
        properties: {
          remoteKey: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT, loadGraph]
  }, async (request, reply) => {
    const { remoteKey } = request.body;
    if (!remoteKey) {
      reply.code(400).send({ error: 'remoteKey is required' });
      return;
    }
    try {
      await request.graph.syncWithPeer(remoteKey);
      return { message: 'Sync initiated.' };
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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

  // DELETE route for graphs - must come AFTER more specific routes to avoid conflicts
  fastify.delete('/api/graphs/:graphId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' }
        }
      }
    },
    preHandler: authenticateJWT
  }, async (request, reply) => {
    const gm = fastify.graphManager; // Get instance from fastify
    const userId = request.user.id;
    try {
      await gm.deleteGraph(userId, request.params.graphId);
      reply.code(204).send();
      return;
    } catch (error) {
      reply.code(404).send({ error: error.message });
      return;
    }
  });

  // --- Media Management API ---
  if (mediaManager) {
    console.log('🔧 Registering media routes...');
    
    console.log('🔧 Registering media upload route: POST /api/media/upload');
  fastify.post('/api/media/upload', {
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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
    preHandler: authenticateJWT
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

  // --- WebSocket for real-time communication ---
  const wss = new WebSocket.Server({ server: fastify.server });
  
  wss.on('connection', (ws) => {
    console.log('Frontend connected via WebSocket');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'start-publish') {
          const progressCallback = (progressCallback) => {
            ws.send(JSON.stringify({ type: 'publish-progress', message: progressCallback }));
          };

          try {
            await buildStaticSite(progressCallback);
            ws.send(JSON.stringify({ type: 'publish-complete', message: 'Static site generated successfully.' }));
          } catch (error) {
            console.error('Error generating static site:', error);
            ws.send(JSON.stringify({ type: 'publish-error', message: `Failed to generate static site: ${error.message}` }));
          }
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
  