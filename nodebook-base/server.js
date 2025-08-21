const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

// Import our new modules
const auth = require('./auth');
const DataManager = require('./data-manager');

// Import existing modules
const HyperGraph = require('./hyper-graph');
const GraphManager = require('./graph-manager');
const schemaManager = require('./schema-manager');
const { diffCnl, getNodeOrderFromCnl } = require('./cnl-parser');
const { evaluate } = require('mathjs');
const { buildStaticSite } = require('./build-static-site');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: './',
    table: 'sessions'
  }),
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(auth.passport.initialize());
app.use(auth.passport.session());

// Global variables
let dataManager = null;
let graphManager = null;

async function main() {
  // Initialize authentication database
  await auth.initializeDatabase();
  
  // Initialize data manager and graph manager based on environment
  if (process.env.NODE_ENV === 'desktop') {
    // Desktop mode - use local user data
    const localDataPath = path.join(__dirname, 'user_data', 'local');
    dataManager = new DataManager();
    await dataManager.initialize(localDataPath);
    
    graphManager = dataManager.graphManager;
  } else {
    // Server mode - will be initialized per user
    graphManager = new GraphManager();
    await graphManager.initialize();
  }

  // Attach instances to app
  app.set('dataManager', dataManager);
  app.set('graphManager', graphManager);

  // --- Authentication Routes ---
  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', { session: false }, (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = auth.generateToken(user);
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          isAdmin: user.is_admin,
          email: user.email
        }
      });
    })(req, res, next);
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const user = await auth.createUser(username, email, password);
      const token = auth.generateToken(user);
      
      res.status(201).json({
        token,
        user: {
          id: user.id,
          username: user.username,
          isAdmin: user.isAdmin,
          email: user.email
        }
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/auth/me', auth.authenticateJWT, (req, res) => {
    res.json({
      id: req.user.id,
      username: req.user.username,
      isAdmin: req.user.is_admin,
      email: req.user.email
    });
  });

  // --- Data Management Routes ---
  app.post('/api/data/export', auth.authenticateJWT, async (req, res) => {
    try {
      const userDataPath = req.user.data_directory;
      const userDataManager = new DataManager();
      await userDataManager.initialize(userDataPath);
      
      const exportResult = await userDataManager.exportUserData(req.body);
      res.json(exportResult);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/data/import', auth.authenticateJWT, async (req, res) => {
    try {
      const userDataPath = req.user.data_directory;
      const userDataManager = new DataManager();
      await userDataManager.initialize(userDataPath);
      
      // Handle file upload and import
      // This would need multer middleware for file handling
      res.status(501).json({ error: 'Import functionality not yet implemented' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/data/stats', auth.authenticateJWT, async (req, res) => {
    try {
      const userDataPath = req.user.data_directory;
      const userDataManager = new DataManager();
      await userDataManager.initialize(userDataPath);
      
      const stats = await userDataManager.getUserDataStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Graph Management API (Updated for user segregation) ---
  app.get('/api/graphs', auth.authenticateJWT, async (req, res) => {
    try {
      const userGraphManager = new GraphManager();
      await userGraphManager.initialize(req.user.data_directory);
      const graphs = await userGraphManager.getGraphRegistry();
      res.json(graphs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/graphs', auth.authenticateJWT, async (req, res) => {
    try {
      const userGraphManager = new GraphManager();
      await userGraphManager.initialize(req.user.data_directory);
      
      const { name, author, email } = req.body;
      if (!name) return res.status(400).json({ error: 'name is required' });
      
      const newGraph = await userGraphManager.createGraph(name, author || req.user.username, email || req.user.email);
      res.status(201).json(newGraph);
    } catch (error) {
      res.status(409).json({ error: error.message });
    }
  });

  app.delete('/api/graphs/:graphId', auth.authenticateJWT, async (req, res) => {
    try {
      const userGraphManager = new GraphManager();
      await userGraphManager.initialize(req.user.data_directory);
      await userGraphManager.deleteGraph(req.params.graphId);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  // --- Schema CRUD API ---
  app.get('/api/schema/relations', auth.authenticateJWT, async (req, res) => res.json(await schemaManager.getRelationTypes()));
  app.post('/api/schema/relations', auth.authenticateJWT, async (req, res) => {
    try {
      const newType = await schemaManager.addRelationType(req.body);
      res.status(201).json(newType);
    } catch (error) {
      res.status(409).json({ error: error.message });
    }
  });
  app.put('/api/schema/relations/:name', auth.authenticateJWT, async (req, res) => {
    try {
      const updatedType = await schemaManager.updateRelationType(req.params.name, req.body);
      res.json(updatedType);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });
  app.delete('/api/schema/relations/:name', auth.authenticateJWT, async (req, res) => {
    try {
      await schemaManager.deleteRelationType(req.params.name);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  app.get('/api/schema/attributes', auth.authenticateJWT, async (req, res) => res.json(await schemaManager.getAttributeTypes()));
  app.post('/api/schema/attributes', auth.authenticateJWT, async (req, res) => {
    try {
      const newType = await schemaManager.addAttributeType(req.body);
      res.status(201).json(newType);
    } catch (error) {
      res.status(409).json({ error: error.message });
    }
  });
  app.put('/api/schema/attributes/:name', auth.authenticateJWT, async (req, res) => {
    try {
      const updatedType = await schemaManager.updateAttributeType(req.params.name, req.body);
      res.json(updatedType);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });
  app.delete('/api/schema/attributes/:name', auth.authenticateJWT, async (req, res) => {
    try {
      await schemaManager.deleteAttributeType(req.params.name);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  app.get('/api/schema/nodetypes', auth.authenticateJWT, async (req, res) => res.json(await schemaManager.getNodeTypes()));
  app.get('/api/schema/functions', auth.authenticateJWT, async (req, res) => res.json(await schemaManager.getFunctionTypes()));
  app.post('/api/schema/functions', auth.authenticateJWT, async (req, res) => {
    try {
      const newType = await schemaManager.addFunctionType(req.body);
      res.status(201).json(newType);
    } catch (error) {
      res.status(409).json({ error: error.message });
    }
  });
  app.put('/api/schema/functions/:name', auth.authenticateJWT, async (req, res) => {
    try {
      const updatedType = await schemaManager.updateFunctionType(req.params.name, req.body);
      res.json(updatedType);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });
  app.delete('/api/schema/functions/:name', auth.authenticateJWT, async (req, res) => {
    try {
      await schemaManager.deleteFunctionType(req.params.name);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  // --- Node Registry API ---
  app.get('/api/noderegistry', auth.authenticateJWT, async (req, res) => {
      try {
        const userGraphManager = new GraphManager();
        await userGraphManager.initialize(req.user.data_directory);
        res.json(await userGraphManager.getNodeRegistry());
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });


  // --- Graph-Specific API ---

  // Middleware to load the correct graph for authenticated user
  const loadGraph = async (req, res, next) => {
    try {
      const userGraphManager = new GraphManager();
      await userGraphManager.initialize(req.user.data_directory);
      // Inject the HyperGraph dependency here
      req.graph = await userGraphManager.getGraph(req.params.graphId, HyperGraph);
      req.userGraphManager = userGraphManager;
      next();
    } catch (error) {
      res.status(404).json({ error: 'Graph not found' });
    }
  };

  app.put('/api/graphs/:graphId/nodes/:nodeId/publication', auth.authenticateJWT, loadGraph, async (req, res) => {
    const { publication_mode } = req.body;
    if (!['Private', 'P2P', 'Public'].includes(publication_mode)) {
      return res.status(400).json({ error: 'Invalid publication mode' });
    }
    try {
      const updatedNode = await req.graph.updateNode(req.params.nodeId, { publication_mode });
      res.json(updatedNode);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  app.put('/api/graphs/:graphId/publish/all', auth.authenticateJWT, loadGraph, async (req, res) => {
    const { publication_mode } = req.body;
    if (!['P2P', 'Public'].includes(publication_mode)) {
      return res.status(400).json({ error: 'Invalid publication mode' });
    }
    try {
      const allNodes = await req.graph.listAll('nodes');
      for (const node of allNodes) {
        if (!node.isDeleted) {
          await req.graph.updateNode(node.id, { publication_mode });
        }
      }
      res.status(200).json({ message: `All nodes set to ${publication_mode}` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/graphs/:graphId/key', auth.authenticateJWT, loadGraph, (req, res) => {
    res.json({ key: req.graph.key });
  });

  app.get('/api/graphs/:graphId/graph', auth.authenticateJWT, loadGraph, async (req, res) => {
    const graphId = req.params.graphId;
    const nodesFromDb = await req.graph.listAll('nodes');
    const relations = await req.graph.listAll('relations');
    const attributes = await req.graph.listAll('attributes');
    const transitions = await req.graph.listAll('transitions');
    const functions = await req.graph.listAll('functions');
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

    res.json({ nodes: finalNodeOrder, relations: activeRelations, attributes: activeAttributes });
  });

  app.get('/api/graphs/:graphId/cnl', async (req, res) => {
    const gm = req.app.get('graphManager');
    try {
      const cnl = await gm.getCnl(req.params.graphId);
      res.json({ cnl });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  app.get('/api/graphs/:graphId/nodes/:nodeId/cnl', async (req, res) => {
    const gm = req.app.get('graphManager');
    try {
      const cnl = await gm.getNodeCnl(req.params.graphId, req.params.nodeId);
      res.json({ cnl });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  app.post('/api/graphs/:graphId/cnl', auth.authenticateJWT, loadGraph, async (req, res) => {
    const gm = req.app.get('graphManager');
    const { cnlText } = req.body;
    const graph = req.graph;
    const graphId = req.params.graphId;

    const { operations, errors } = await diffCnl(await gm.getCnl(graphId), cnlText);

    if (errors.length > 0) {
      return res.status(422).json({ errors });
    }

    if (operations.length > 0) {
      // First pass: deletions
      for (const op of operations) {
        if (op.type.startsWith('delete')) {
          switch (op.type) {
            case 'deleteNode':
              await req.graph.deleteNode(op.payload.id);
              break;
            case 'deleteRelation':
              await req.graph.deleteRelation(op.payload.id);
              break;
            case 'deleteAttribute':
              await req.graph.deleteAttribute(op.payload.id);
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
                await req.graph.addNode(op.payload.base_name, op.payload.options);
                await req.userGraphManager.addNodeToRegistry({ id: op.payload.options.id, ...op.payload });
              }
              await req.userGraphManager.registerNodeInGraph(op.payload.options.id, graphId);
              break;
            case 'addRelation':
              const targetNode = await graph.getNode(op.payload.target);
              if (!targetNode) {
                await graph.addNode(op.payload.target, { id: op.payload.target });
                await req.userGraphManager.addNodeToRegistry({ id: op.payload.target, base_name: op.payload.target });
              }
              await req.userGraphManager.registerNodeInGraph(op.payload.target, graphId);
              await req.graph.addRelation(op.payload.source, op.payload.target, op.payload.name, op.payload.options);
              break;
            case 'addAttribute':
              await req.graph.addAttribute(op.payload.source, op.payload.name, op.payload.value, op.payload.options);
              break;
          }
        }
      }
      // Third pass: updates and functions
      for (const op of operations) {
        if (op.type === 'updateNode') {
          await req.graph.updateNode(op.payload.id, op.payload.fields);
        } else if (op.type === 'applyFunction') {
          const functionTypes = await schemaManager.getFunctionTypes();
          const funcType = functionTypes.find(ft => ft.name === op.payload.name);
          if (funcType) {
            await req.graph.applyFunction(op.payload.source, op.payload.name, funcType.expression, op.payload.options);
          }
        } else if (op.type === 'updateGraphDescription') {
            await req.userGraphManager.updateGraphMetadata(graphId, { description: op.payload.description });
        }
      }
    }

    await req.userGraphManager.saveCnl(req.params.graphId, cnlText);
    res.status(200).json({ message: 'CNL processed successfully.' });
  });

  // --- Peer Management API ---
  app.get('/api/graphs/:graphId/peers', auth.authenticateJWT, loadGraph, (req, res) => {
    const status = req.graph.getSwarmStatus();
    res.json(status);
  });

  app.post('/api/graphs/:graphId/peers/sync', auth.authenticateJWT, loadGraph, async (req, res) => {
    const { remoteKey } = req.body;
    if (!remoteKey) return res.status(400).json({ error: 'remoteKey is required' });
    try {
      await req.graph.syncWithPeer(remoteKey);
      res.status(200).json({ message: 'Sync initiated.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // WebSocket for real-time communication
  wss.on('connection', (ws) => {
    console.log('Frontend connected via WebSocket');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'start-publish') {
          const progressCallback = (progressMessage) => {
            ws.send(JSON.stringify({ type: 'publish-progress', message: progressMessage }));
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

  // Serve static files from frontend build
  app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

  // Catch-all route for SPA - serve index.html for any unmatched routes
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    // Serve the frontend app
    res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  });

  server.listen(PORT, () => {
    console.log(`🚀 NodeBook Federated Server running on http://localhost:${PORT}`);
    console.log(`📱 PWA accessible at http://localhost:${PORT}`);
    console.log(`🔐 Authentication: ${process.env.NODE_ENV === 'desktop' ? 'Desktop Mode (Auto-login)' : 'Server Mode (User Auth)'}`);
  });
}

main().catch(console.error);