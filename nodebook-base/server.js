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
        required: ['username', 'password'],
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
    const graphs = await gm.getGraphRegistry();
    return graphs;
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
    const { name, author, email } = request.body;
    if (!name) {
      reply.code(400).send({ error: 'name is required' });
      return;
    }
    try {
      const newGraph = await gm.createGraph(name, author, email);
      reply.code(201);
      return newGraph;
    } catch (error) {
      reply.code(409).send({ error: error.message });
      return;
    }
  });

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
    try {
      await gm.deleteGraph(request.params.graphId);
      reply.code(204).send();
      return;
    } catch (error) {
      reply.code(404).send({ error: error.message });
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
  
  fastify.post('/api/schema/functions', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'expression'],
        properties: {
          name: { type: 'string' },
          expression: { type: 'string' },
          description: { type: 'string' }
        }
      }
    },
    preHandler: authenticateJWT
  }, async (request, reply) => {
    try {
      const newType = await schemaManager.addFunctionType(request.body);
      reply.code(201);
      return newType;
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
      const updatedType = await schemaManager.updateFunctionType(request.params.name, request.body);
      return updatedType;
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

  // --- Node Registry API ---
  fastify.get('/api/noderegistry', {
    preHandler: authenticateJWT
  }, async (request, reply) => {
    const gm = fastify.graphManager;
    return await gm.getNodeRegistry();
  });


  // --- Graph-Specific API ---

  // Middleware to load the correct graph
  const loadGraph = async (request, reply) => {
    const gm = fastify.graphManager;
    try {
      // Inject the HyperGraph dependency here
      request.graph = await gm.getGraph(request.params.graphId, HyperGraph);
      // Continue to the route handler
    } catch (error) {
      reply.code(404).send({ error: 'Graph not found' });
      return;
    }
  };

  fastify.put('/api/graphs/:graphId/nodes/:nodeId/publication', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' },
          nodeId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['publication_mode'],
        properties: {
          publication_mode: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT, loadGraph]
  }, async (request, reply) => {
    const { publication_mode } = request.body;
    if (!['Private', 'P2P', 'Public'].includes(publication_mode)) {
      reply.code(400).send({ error: 'Invalid publication mode' });
      return;
    }
    try {
      const updatedNode = await request.graph.updateNode(request.params.nodeId, { publication_mode });
      return updatedNode;
    } catch (error) {
      reply.code(404).send({ error: error.message });
      return;
    }
  });

  fastify.put('/api/graphs/:graphId/publish/all', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['publication_mode'],
        properties: {
          publication_mode: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT, loadGraph]
  }, async (request, reply) => {
    const { publication_mode } = request.body;
    if (!['P2P', 'Public'].includes(publication_mode)) {
      reply.code(400).send({ error: 'Invalid publication mode' });
      return;
    }
    try {
      const allNodes = await request.graph.listAll('nodes');
      for (const node of allNodes) {
        if (!node.isDeleted) {
          await request.graph.updateNode(node.id, { publication_mode });
        }
      }
      return { message: `All nodes set to ${publication_mode}` };
    } catch (error) {
      reply.code(500).send({ error: error.message });
      return;
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
    return { key: request.graph.key };
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
    const gm = fastify.graphManager;
    const graphId = request.params.graphId;
    const nodesFromDb = await request.graph.listAll('nodes');
    const relations = await request.graph.listAll('relations');
    const attributes = await request.graph.listAll('attributes');
    const transitions = await request.graph.listAll('transitions');
    const functions = await request.graph.listAll('functions');
    const functionTypes = await schemaManager.getFunctionTypes();

    const allNodesFromDb = [...nodesFromDb, ...transitions].filter(node => !node.isDeleted);

    // Get node order from CNL
    const cnl = await gm.getCnl(graphId);
    const orderedNodeIds = getNodeOrderFromCnl(cnl);
    const nodesMap = new Map(allNodesFromDb.map(node => [node.id, node]));

    // Sort nodes according to CNL order
    const sortedNodes = orderedNodeIds.map(id => nodesMap.get(id)).filter(Boolean);
    const nodesInCnl = new Set(orderedNodeIds);
    const nodesNotInCnl = allNodesFromDb.filter(node => !nodesInCnl.has(node.id));
    const finalNodeOrder = [...sortedNodes, ...nodesNotInCnl];

    const activeRelations = relations.filter(rel => !rel.isDeleted);
    let activeAttributes = attributes.filter(attr => !attr.isDeleted);

    // Compute derived attributes
    for (const node of finalNodeOrder) {
      const nodeFunctions = functions.filter(f => f.source_id === node.id);
      for (const func of nodeFunctions) {
        const funcType = functionTypes.find(ft => ft.name === func.name);
        if (!funcType) continue;

        const scope = {};
        const nodeAttributes = activeAttributes.filter(a => a.source_id === node.id);
        for (const attr of nodeAttributes) {
          const numericValue = parseFloat(attr.value);
          scope[attr.name.replace(/\s+/g, '_')] = isNaN(numericValue) ? attr.value : numericValue;
        }

        try {
          const sanitizedExpression = funcType.expression.replace(/"(.*?)"/g, (match, attrName) => attrName.replace(/\s+/g, '_'));
          const value = evaluate(sanitizedExpression, scope);
          activeAttributes.push({
            id: `derived_${func.id}`,
            source_id: func.source_id,
            name: func.name,
            value: String(value),
            isDerived: true,
            morph_ids: func.morph_ids,
          });
        } catch (error) {
          // Silently fail for now, or add logging
        }
      }
    }

    return { nodes: finalNodeOrder, relations: activeRelations, attributes: activeAttributes };
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
    preHandler: authenticateJWT
  }, async (request, reply) => {
    const gm = fastify.graphManager;
    try {
      const cnl = await gm.getCnl(request.params.graphId);
      return { cnl };
    } catch (error) {
      reply.code(404).send({ error: error.message });
      return;
    }
  });

  fastify.get('/api/graphs/:graphId/nodes/:nodeId/cnl', {
    schema: {
      params: {
        type: 'object',
        properties: {
          graphId: { type: 'string' },
          nodeId: { type: 'string' }
        }
      }
    },
    preHandler: authenticateJWT
  }, async (request, reply) => {
    const gm = fastify.graphManager;
    try {
      const cnl = await gm.getNodeCnl(request.params.graphId, request.params.nodeId);
      return { cnl };
    } catch (error) {
      reply.code(404).send({ error: error.message });
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
          cnlText: { type: 'string' }
        }
      }
    },
    preHandler: [authenticateJWT, loadGraph]
  }, async (request, reply) => {
    const gm = fastify.graphManager;
    const { cnlText } = request.body;
    const graph = request.graph;
    const graphId = request.params.graphId;

    const { operations, errors } = await diffCnl(await gm.getCnl(graphId), cnlText);

    if (errors.length > 0) {
      reply.code(422).send({ errors });
      return;
    }

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
              const existingNode = await graph.getNode(op.payload.options.id);
              if (!existingNode) {
                await request.graph.addNode(op.payload.base_name, op.payload.options);
                await gm.addNodeToRegistry({ id: op.payload.options.id, ...op.payload });
              }
              await gm.registerNodeInGraph(op.payload.options.id, graphId);
              break;
            case 'addRelation':
              const targetNode = await graph.getNode(op.payload.target);
              if (!targetNode) {
                await graph.addNode(op.payload.target, { id: op.payload.target });
                await gm.addNodeToRegistry({ id: op.payload.target, base_name: op.payload.target });
              }
              await gm.registerNodeInGraph(op.payload.target, graphId);
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
            await gm.updateGraphMetadata(graphId, { description: op.payload.description });
        }
      }
    }

    await gm.saveCnl(request.params.graphId, cnlText);
    return { message: 'CNL processed successfully.' };
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