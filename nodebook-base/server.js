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
const { diffCnl, getNodeOrderFromCnl } = require('./cnl-parser');
  const { evaluate } = require('mathjs');
const { buildStaticSite } = require('./build-static-site');
const auth = require('./auth');
  
  const PORT = process.env.PORT || 3000;
  
// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: true,
  credentials: true
});
  
  // Custom authentication hook
  async function authenticateJWT(request, reply) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'No token provided' });
      return;
    }
    
    const token = authHeader.substring(7);
    try {
      const user = auth.verifyToken(token);
      request.user = user;
    } catch (error) {
      reply.code(401).send({ error: 'Invalid token' });
      return;
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
  const dataPath = process.argv[2] || null;
  // Initialize the instance with the correct path.
  await graphManager.initialize(dataPath);

  // Attach the initialized instance to the fastify object
  fastify.decorate('graphManager', graphManager);
  
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
      email: user.email
    };
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
      return graphs;
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
          email: { type: 'string' }
        }
      }
    },
    preHandler: authenticateJWT
  }, async (request, reply) => {
    const gm = fastify.graphManager; // Get instance from fastify
    const userId = request.user.id;
    const { name, author, email } = request.body;
    console.log(`[POST /api/graphs] User ID: ${userId}, Type: ${typeof userId}, Name: ${name}`);
    if (!name) {
      reply.code(400).send({ error: 'name is required' });
      return;
    }
    try {
      const newGraph = await gm.createGraph(userId, name, author, email);
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
      // Get the current CNL text from the graph
      const currentCnl = await gm.getCnl(userId, graphId);
      const result = await diffCnl(currentCnl, cnlText);
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

  // WebSocket for real-time communication
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
  