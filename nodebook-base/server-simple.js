const fastify = require('fastify')({ 
    logger: true,
    trustProxy: true
  });
const WebSocket = require('ws');
  const path = require('path');
  const fs = require('fs').promises;
const SimpleGraph = require('./simple-graph');
const SimpleGraphManager = require('./simple-graph-manager'); // Import the new class
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
  
  // Load graph middleware - Updated for SimpleGraph
  async function loadGraph(request, reply) {
    const gm = fastify.graphManager;
    const graphId = request.params.graphId;
    const userId = request.user.id;
    
    try {
      console.log(`[loadGraph] Loading graph: ${graphId} for user: ${userId}`);
      const graph = await gm.getGraph(userId, graphId, SimpleGraph);
      if (!graph) {
        console.log(`[loadGraph] Graph not found: ${graphId}`);
        reply.code(404).send({ error: 'Graph not found' });
        return;
      }
      
      // SimpleGraph is always ready (no async initialization needed)
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
  
  // Create a single instance of the SimpleGraphManager
  const graphManager = new SimpleGraphManager();
  
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
    return { status: 'ok', message: 'NodeBook Backend is running (SimpleGraph)', timestamp: new Date().toISOString() };
  });

  // --- Collaboration API Routes ---
  
  // Create collaboration session
  fastify.post('/api/collaboration/create', { preHandler: authenticateJWT }, async (request, reply) => {
    try {
      const { graphId, permissions } = request.body;
      const userId = request.user.id;
      
      const collaboration = await graphManager.createCollaborationSession(graphId, userId, permissions);
      
      reply.send({
        success: true,
        collaboration: collaboration
      });
    } catch (error) {
      console.error('Error creating collaboration session:', error);
      reply.code(500).send({ error: 'Failed to create collaboration session', details: error.message });
    }
  });

  // Join collaboration session
  fastify.post('/api/collaboration/join', { preHandler: authenticateJWT }, async (request, reply) => {
    try {
      const { shareId, permissions } = request.body;
      const userId = request.user.id;
      
      const result = await graphManager.joinCollaborationSession(shareId, userId, permissions);
      
      reply.send({
        success: true,
        result: result
      });
    } catch (error) {
      console.error('Error joining collaboration session:', error);
      reply.code(500).send({ error: 'Failed to join collaboration session', details: error.message });
    }
  });

  // Get collaboration status
  fastify.get('/api/collaboration/status/:graphId', { preHandler: authenticateJWT }, async (request, reply) => {
    try {
      const { graphId } = request.params;
      const status = await graphManager.getCollaborationStatus(graphId);
      
      if (!status) {
        reply.code(404).send({ error: 'Collaboration session not found' });
        return;
      }
      
      reply.send({
        success: true,
        status: status
      });
    } catch (error) {
      console.error('Error getting collaboration status:', error);
      reply.code(500).send({ error: 'Failed to get collaboration status', details: error.message });
    }
  });

  // Leave collaboration session
  fastify.post('/api/collaboration/leave', { preHandler: authenticateJWT }, async (request, reply) => {
    try {
      const { sessionId } = request.body;
      const userId = request.user.id;
      
      await graphManager.leaveCollaborationSession(sessionId, userId);
      
      reply.send({
        success: true,
        message: 'Successfully left collaboration session'
      });
    } catch (error) {
      console.error('Error leaving collaboration session:', error);
      reply.code(500).send({ error: 'Failed to leave collaboration session', details: error.message });
    }
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
Another specific service
\`\`\`
### Feature 2.1
### Feature 2.2`
      }
    };
    
    return templates;
  });

  // --- Graph Management API Routes ---
  
  // Create new graph
  fastify.post('/api/graphs', { preHandler: authenticateJWT }, async (request, reply) => {
    try {
      const { name, description, options } = request.body;
      const userId = request.user.id;
      
      const graph = await graphManager.createGraph(userId, name, { description, ...options });
      
      reply.send({
        success: true,
        graph: {
          id: graph.key,
          name: name,
          description: description,
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error creating graph:', error);
      reply.code(500).send({ error: 'Failed to create graph', details: error.message });
    }
  });

  // List user graphs
  fastify.get('/api/graphs', { preHandler: authenticateJWT }, async (request, reply) => {
    try {
      const userId = request.user.id;
      const graphs = await graphManager.listGraphs(userId);
      
      reply.send({
        success: true,
        graphs: graphs
      });
    } catch (error) {
      console.error('Error listing graphs:', error);
      reply.code(500).send({ error: 'Failed to list graphs', details: error.message });
    }
  });

  // Get specific graph
  fastify.get('/api/graphs/:graphId', { preHandler: authenticateJWT, preHandler: loadGraph }, async (request, reply) => {
    try {
      const graph = request.graph;
      
      // Get graph data
      const nodes = await graph.listAll('nodes');
      const relations = await graph.listAll('relations');
      const attributes = await graph.listAll('attributes');
      
      reply.send({
        success: true,
        graph: {
          id: graph.key,
          nodes: nodes,
          relations: relations,
          attributes: attributes
        }
      });
    } catch (error) {
      console.error('Error getting graph:', error);
      reply.code(500).send({ error: 'Failed to get graph', details: error.message });
    }
  });

  // Delete graph
  fastify.delete('/api/graphs/:graphId', { preHandler: authenticateJWT }, async (request, reply) => {
    try {
      const { graphId } = request.params;
      const userId = request.user.id;
      
      await graphManager.deleteGraph(userId, graphId);
      
      reply.send({
        success: true,
        message: 'Graph deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting graph:', error);
      reply.code(500).send({ error: 'Failed to delete graph', details: error.message });
    }
  });

  // --- Node Management API Routes ---
  
  // Add node
  fastify.post('/api/graphs/:graphId/nodes', { preHandler: authenticateJWT, preHandler: loadGraph }, async (request, reply) => {
    try {
      const graph = request.graph;
      const { base_name, options } = request.body;
      
      const node = await graph.addNode(base_name, options);
      
      reply.send({
        success: true,
        node: node
      });
    } catch (error) {
      console.error('Error adding node:', error);
      reply.code(500).send({ error: 'Failed to add node', details: error.message });
    }
  });

  // Update node
  fastify.put('/api/graphs/:graphId/nodes/:nodeId', { preHandler: authenticateJWT, preHandler: loadGraph }, async (request, reply) => {
    try {
      const graph = request.graph;
      const { nodeId } = request.params;
      const updates = request.body;
      
      const updatedNode = await graph.updateNode(nodeId, updates);
      
      reply.send({
        success: true,
        node: updatedNode
      });
    } catch (error) {
      console.error('Error updating node:', error);
      reply.code(500).send({ error: 'Failed to update node', details: error.message });
    }
  });

  // Delete node
  fastify.delete('/api/graphs/:graphId/nodes/:nodeId', { preHandler: authenticateJWT, preHandler: loadGraph }, async (request, reply) => {
    try {
      const graph = request.graph;
      const { nodeId } = request.params;
      
      await graph.deleteNode(nodeId);
      
      reply.send({
        success: true,
        message: 'Node deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting node:', error);
      reply.code(500).send({ error: 'Failed to delete node', details: error.message });
    }
  });

  // --- Relation Management API Routes ---
  
  // Add relation
  fastify.post('/api/graphs/:graphId/relations', { preHandler: authenticateJWT, preHandler: loadGraph }, async (request, reply) => {
    try {
      const graph = request.graph;
      const { source_id, target_id, name, options } = request.body;
      
      const relation = await graph.addRelation(source_id, target_id, name, options);
      
      reply.send({
        success: true,
        relation: relation
      });
    } catch (error) {
      console.error('Error adding relation:', error);
      reply.code(500).send({ error: 'Failed to add relation', details: error.message });
    }
  });

  // Delete relation
  fastify.delete('/api/graphs/:graphId/relations/:relationId', { preHandler: authenticateJWT, preHandler: loadGraph }, async (request, reply) => {
    try {
      const graph = request.graph;
      const { relationId } = request.params;
      
      await graph.deleteRelation(relationId);
      
      reply.send({
        success: true,
        message: 'Relation deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting relation:', error);
      reply.code(500).send({ error: 'Failed to delete relation', details: error.message });
    }
  });

  // --- Attribute Management API Routes ---
  
  // Add attribute
  fastify.post('/api/graphs/:graphId/attributes', { preHandler: authenticateJWT, preHandler: loadGraph }, async (request, reply) => {
    try {
      const graph = request.graph;
      const { source_id, attributeName, attributeValue, options } = request.body;
      
      const attribute = await graph.addAttribute(source_id, attributeName, attributeValue, options);
      
      reply.send({
        success: true,
        attribute: attribute
      });
    } catch (error) {
      console.error('Error adding attribute:', error);
      reply.code(500).send({ error: 'Failed to add attribute', details: error.message });
    }
  });

  // Delete attribute
  fastify.delete('/api/graphs/:graphId/attributes/:attributeId', { preHandler: authenticateJWT, preHandler: loadGraph }, async (request, reply) => {
    try {
      const graph = request.graph;
      const { attributeId } = request.params;
      
      await graph.deleteAttribute(attributeId);
      
      reply.send({
        success: true,
        message: 'Attribute deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting attribute:', error);
      reply.code(500).send({ error: 'Failed to delete attribute', details: error.message });
    }
  });

  // --- Function Application API Routes ---
  
  // Apply function
  fastify.post('/api/graphs/:graphId/functions', { preHandler: authenticateJWT, preHandler: loadGraph }, async (request, reply) => {
    try {
      const graph = request.graph;
      const { source_id, name, expression, options } = request.body;
      
      const func = await graph.applyFunction(source_id, name, expression, options);
      
      if (!func) {
        reply.code(400).send({ error: 'Failed to evaluate function' });
        return;
      }
      
      reply.send({
        success: true,
        function: func
      });
    } catch (error) {
      console.error('Error applying function:', error);
      reply.code(500).send({ error: 'Failed to apply function', details: error.message });
    }
  });

  // --- CNL Processing API Routes ---
  
  // Process CNL and build graph
  fastify.post('/api/graphs/:graphId/process-cnl', { preHandler: authenticateJWT, preHandler: loadGraph }, async (request, reply) => {
    try {
      const graph = request.graph;
      const { cnlText } = request.body;
      
      // This would integrate with your existing CNL parser
      // For now, we'll return a success message
      reply.send({
        success: true,
        message: 'CNL processing endpoint ready for integration',
        graphId: graph.key
      });
    } catch (error) {
      console.error('Error processing CNL:', error);
      reply.code(500).send({ error: 'Failed to process CNL', details: error.message });
    }
  });

  // --- Server Startup ---
  
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 NodeBook Backend (SimpleGraph) running on port ${PORT}`);
    console.log(`📁 Data directory: ${dataPath}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  try {
    if (fastify.graphManager) {
      await fastify.graphManager.cleanup();
      console.log('✅ Graph manager cleaned up');
    }
    
    await fastify.close();
    console.log('✅ Server closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
main().catch(console.error);
