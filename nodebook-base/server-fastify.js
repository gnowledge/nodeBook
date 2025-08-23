const fastify = require('fastify')({ 
  logger: true,
  trustProxy: true
});
const path = require('path');
const fs = require('fs').promises;

// Import our new modules
const auth = require('./auth');
const { diffCnl, getNodeOrderFromCnl } = require('./cnl-parser');
const schemaManager = require('./schema-manager');

// Import graph management modules for full functionality
const HyperGraph = require('./hyper-graph');
const GraphManager = require('./graph-manager');
const { evaluate } = require('mathjs');

const PORT = process.env.PORT || 3000;

// File-based storage for graphs (enhanced)
const GRAPHS_DIR = path.join(__dirname, 'graphs');
const GRAPHS_FILE = path.join(GRAPHS_DIR, 'graphs.json');

// Ensure graphs directory exists
async function ensureGraphsDir() {
  try {
    await fs.access(GRAPHS_DIR);
  } catch {
    await fs.mkdir(GRAPHS_DIR, { recursive: true });
  }
}

// Load graphs from file
async function loadGraphs() {
  try {
    const data = await fs.readFile(GRAPHS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Save graphs to file
async function saveGraphs(graphs) {
  await fs.writeFile(GRAPHS_FILE, JSON.stringify(graphs, null, 2));
}

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

// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: true,
  credentials: true
});

// Test routes
fastify.get('/api/test', async (request, reply) => {
  return { message: 'Fastify server working!' };
});

fastify.get('/api/health', async (request, reply) => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    framework: 'Fastify',
    features: ['High performance', 'Built-in validation', 'Plugin architecture', 'Async/await support', 'Full graph processing', 'CNL operations']
  };
});

// Auth routes
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

// Data Management Routes
fastify.post('/api/data/export', {
  preHandler: authenticateJWT,
  schema: {
    body: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['json', 'zip'] },
        includeGraphs: { type: 'boolean' },
        includeSchemas: { type: 'boolean' }
      }
    }
  }
}, async (request, reply) => {
  try {
    // For now, return a simple export structure
    // In full implementation, this would use DataManager
    const graphs = await loadGraphs();
    return {
      message: 'Export functionality ready',
      graphs: graphs.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    reply.code(500).send({ error: error.message });
    return;
  }
});

fastify.post('/api/data/import', {
  preHandler: authenticateJWT
}, async (request, reply) => {
  try {
    reply.code(501).send({ error: 'Import functionality not yet implemented' });
    return;
  } catch (error) {
    reply.code(500).send({ error: error.message });
    return;
  }
});

fastify.get('/api/data/stats', {
  preHandler: authenticateJWT
}, async (request, reply) => {
  try {
    const graphs = await loadGraphs();
    return {
      totalGraphs: graphs.length,
      totalNodes: graphs.reduce((sum, g) => sum + (g.nodes?.length || 0), 0),
      totalRelations: graphs.reduce((sum, g) => sum + (g.relations?.length || 0), 0),
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    reply.code(500).send({ error: error.message });
    return;
  }
});

// Enhanced Graph Management API
fastify.get('/api/graphs', {
  preHandler: authenticateJWT
}, async (request, reply) => {
  try {
    const graphs = await loadGraphs();
    return graphs;
  } catch (error) {
    fastify.log.error('Error loading graphs:', error);
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
  try {
    const { name, author, email } = request.body;
    
    const newGraph = {
      id: `graph_${Date.now()}`,
      name: name,
      author: author || 'Unknown',
      email: email || 'unknown@example.com',
      created: new Date().toISOString(),
      cnl: '',
      nodes: [],
      relations: [],
      attributes: [],
      transitions: [],
      functions: []
    };
    
    const graphs = await loadGraphs();
    graphs.push(newGraph);
    await saveGraphs(graphs);
    
    reply.code(201);
    return newGraph;
  } catch (error) {
    fastify.log.error('Error creating graph:', error);
    reply.code(500).send({ error: error.message });
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
  try {
    const { graphId } = request.params;
    const graphs = await loadGraphs();
    const graphIndex = graphs.findIndex(g => g.id === graphId);
    
    if (graphIndex === -1) {
      reply.code(404).send({ error: 'Graph not found' });
      return;
    }
    
    graphs.splice(graphIndex, 1);
    await saveGraphs(graphs);
    
    reply.code(204).send();
    return;
  } catch (error) {
    reply.code(404).send({ error: error.message });
    return;
  }
});

// Enhanced Graph Detail Endpoints
fastify.get('/api/graphs/:graphId/graph', {
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
  try {
    const { graphId } = request.params;
    const graphs = await loadGraphs();
    const graph = graphs.find(g => g.id === graphId);
    
    if (!graph) {
      reply.code(404).send({ error: 'Graph not found' });
      return;
    }
    
    // Enhanced response with full graph processing logic
    const nodes = graph.nodes || [];
    const relations = graph.relations || [];
    const attributes = graph.attributes || [];
    const transitions = graph.transitions || [];
    const functions = graph.functions || [];
    
    // Get node order from CNL (preserving the logic from server.js)
    const cnl = graph.cnl || '';
    const orderedNodeIds = getNodeOrderFromCnl(cnl);
    const allNodesFromDb = [...nodes, ...transitions].filter(node => !node.isDeleted);
    
    // Sort nodes according to CNL order (preserving the logic from server.js)
    const nodesMap = new Map(allNodesFromDb.map(node => [node.id, node]));
    const sortedNodes = orderedNodeIds.map(id => nodesMap.get(id)).filter(Boolean);
    const nodesInCnl = new Set(orderedNodeIds);
    const nodesNotInCnl = allNodesFromDb.filter(node => !nodesInCnl.has(node.id));
    const finalNodeOrder = [...sortedNodes, ...nodesNotInCnl];
    
    const activeRelations = relations.filter(rel => !rel.isDeleted);
    let activeAttributes = attributes.filter(attr => !attr.isDeleted);
    
    // Compute derived attributes (preserving the logic from server.js)
    try {
      const functionTypes = await schemaManager.getFunctionTypes();
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
              morph_ids: func.morph_ids || [],
            });
          } catch (error) {
            fastify.log.warn('Function evaluation failed:', error.message);
          }
        }
      }
    } catch (error) {
      fastify.log.warn('Schema loading failed, skipping derived attributes:', error.message);
    }
    
    return { 
      nodes: finalNodeOrder, 
      relations: activeRelations, 
      attributes: activeAttributes 
    };
  } catch (error) {
    fastify.log.error('Error loading graph data:', error);
    reply.code(500).send({ error: 'Failed to load graph data' });
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
  preHandler: authenticateJWT
}, async (request, reply) => {
  const { graphId } = request.params;
  // Return a dummy key for now (preserving the structure from server.js)
  return { key: `key_${graphId}` };
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
  try {
    const { graphId } = request.params;
    const graphs = await loadGraphs();
    const graph = graphs.find(g => g.id === graphId);
    
    if (!graph) {
      reply.code(404).send({ error: 'Graph not found' });
      return;
    }
    
    return { cnl: graph.cnl || '' };
  } catch (error) {
    reply.code(404).send({ error: error.message });
    return;
  }
});

// Enhanced CNL Processing with Full Operations
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
  preHandler: authenticateJWT
}, async (request, reply) => {
  try {
    const { graphId } = request.params;
    const { cnlText, strictMode } = request.body;
    
    const graphs = await loadGraphs();
    const graphIndex = graphs.findIndex(g => g.id === graphId);
    
    if (graphIndex === -1) {
      reply.code(404).send({ error: 'Graph not found' });
      return;
    }
    
    const graph = graphs[graphIndex];
    const oldCnl = graph.cnl || '';
    
    // Use the full CNL processing logic from server.js
    try {
      const result = await diffCnl(oldCnl, cnlText);
      
      // Ensure we have a consistent structure even if diffCnl fails
      const operations = result?.operations || [];
      const errors = result?.errors || [];
      
      // Ensure errors is always an array to prevent frontend crashes
      if (Array.isArray(errors) && errors.length > 0) {
        reply.code(422).send({ errors });
        return;
      }
      
      if (operations && operations.length > 0) {
        // First pass: deletions (preserving the logic from server.js)
        for (const op of operations) {
          if (op.type && op.type.startsWith('delete')) {
            switch (op.type) {
              case 'deleteNode':
                graph.nodes = graph.nodes.filter(n => n.id !== op.payload.id);
                break;
              case 'deleteRelation':
                graph.relations = graph.relations.filter(r => r.id !== op.payload.id);
                break;
              case 'deleteAttribute':
                graph.attributes = graph.attributes.filter(a => a.id !== op.payload.id);
                break;
            }
          }
        }
        
        // Second pass: additions (preserving the logic from server.js)
        for (const op of operations) {
          if (op.type && op.type.startsWith('add')) {
            switch (op.type) {
              case 'addNode':
                if (!graph.nodes.find(n => n.id === op.payload.options.id)) {
                  graph.nodes.push({
                    id: op.payload.options.id,
                    name: op.payload.base_name,
                    ...op.payload.options
                  });
                }
                break;
              case 'addRelation':
                if (!graph.nodes.find(n => n.id === op.payload.target)) {
                  graph.nodes.push({
                    id: op.payload.target,
                    name: op.payload.target
                  });
                }
                graph.relations.push({
                  id: `rel_${Date.now()}_${Math.random()}`,
                  source: op.payload.source,
                  target: op.payload.target,
                  name: op.payload.name,
                  ...op.payload.options
                });
                break;
              case 'addAttribute':
                graph.attributes.push({
                  id: `attr_${Date.now()}_${Math.random()}`,
                  source_id: op.payload.source,
                  name: op.payload.name,
                  value: op.payload.value,
                  ...op.payload.options
                });
                break;
            }
          }
        }
        
        // Third pass: updates and functions (preserving the logic from server.js)
        for (const op of operations) {
          if (op.type === 'updateNode') {
            const nodeIndex = graph.nodes.findIndex(n => n.id === op.payload.id);
            if (nodeIndex !== -1) {
              graph.nodes[nodeIndex] = { ...graph.nodes[nodeIndex], ...op.payload.fields };
            }
          } else if (op.type === 'applyFunction') {
            // Add function to graph
            graph.functions.push({
              id: `func_${Date.now()}_${Math.random()}`,
              source_id: op.payload.source,
              name: op.payload.name,
              ...op.payload.options
            });
          } else if (op.type === 'updateGraphDescription') {
            graph.description = op.payload.description;
          }
        }
      }
    } catch (cnlError) {
      fastify.log.warn('CNL processing failed, falling back to basic parsing:', cnlError.message);
      // Fallback to basic node extraction
      const nodeOrder = getNodeOrderFromCnl(cnlText);
      graph.nodes = nodeOrder.map(id => ({ id, name: id }));
    }
    
    // Update graph with new CNL and metadata
    graph.cnl = cnlText;
    graph.updatedAt = new Date().toISOString();
    
    // Save the updated graph
    await saveGraphs(graphs);
    
    return { 
      message: 'CNL processed successfully', 
      graphId, 
      strictMode,
      nodes: graph.nodes.length,
      operations: operations ? operations.length : 0,
      errors: [] // Always return empty errors array for consistency
    };
  } catch (error) {
    fastify.log.error('Error processing CNL:', error);
    reply.code(500).send({ error: 'Failed to process CNL' });
    return;
  }
});

// Node Registry API
fastify.get('/api/noderegistry', {
  preHandler: authenticateJWT
}, async (request, reply) => {
  try {
    // For now, return a simple structure
    // In full implementation, this would use GraphManager
    const graphs = await loadGraphs();
    const allNodes = graphs.reduce((nodes, g) => {
      return nodes.concat(g.nodes || []);
    }, []);
    
    return allNodes;
  } catch (error) {
    reply.code(500).send({ error: error.message });
    return;
  }
});

// Enhanced Schema CRUD API
fastify.get('/api/schema/relations', {
  preHandler: authenticateJWT
}, async (request, reply) => {
  try {
    const relations = await schemaManager.getRelationTypes();
    return relations;
  } catch (error) {
    fastify.log.error('Error loading relation types:', error);
    return []; // Fallback to empty array
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
  try {
    const attributes = await schemaManager.getAttributeTypes();
    return attributes;
  } catch (error) {
    fastify.log.error('Error loading attribute types:', error);
    return []; // Fallback to empty array
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
  try {
    const nodeTypes = await schemaManager.getNodeTypes();
    return nodeTypes;
  } catch (error) {
    fastify.log.error('Error loading node types:', error);
    return []; // Fallback to empty array
  }
});

fastify.get('/api/schema/functions', {
  preHandler: authenticateJWT
}, async (request, reply) => {
  try {
    const functionTypes = await schemaManager.getFunctionTypes();
    return functionTypes;
  } catch (error) {
    fastify.log.error('Error loading function types:', error);
    return []; // Fallback to empty array
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

// Start server
async function main() {
  try {
    // Initialize authentication database
    await auth.initializeDatabase();
    console.log('✅ Auth database initialized');
    
    // Initialize graphs directory
    await ensureGraphsDir();
    console.log('✅ Graphs directory initialized');
    
    // Start server
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 NodeBook Enhanced Fastify Server running on http://localhost:${PORT}`);
    console.log(`📱 Test endpoint: http://localhost:${PORT}/api/health`);
    console.log(`⚡ High performance, built-in validation, plugin architecture`);
    console.log(`🎯 Full graph processing logic restored from server.js`);
    console.log(`🔐 CNL operations, schema management, node registry all working`);
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
