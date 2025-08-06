const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs').promises;
const HyperGraph = require('./hyper-graph');
const graphManager = require('./graph-manager');
const schemaManager = require('./schema-manager');
const { parseCnl, executeOperations, validateOperations } = require('./cnl-parser');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;

app.use(express.json());

// Middleware to remove restrictive CSP headers
app.use((req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  next();
});

async function main() {
  await graphManager.initialize();

  // --- Graph Management API ---
  app.get('/api/graphs', async (req, res) => {
    const graphs = await graphManager.getGraphRegistry();
    res.json(graphs);
  });

  app.post('/api/graphs', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    try {
      const newGraph = await graphManager.createGraph(name);
      res.status(201).json(newGraph);
    } catch (error) {
      res.status(409).json({ error: error.message });
    }
  });

  app.delete('/api/graphs/:graphId', async (req, res) => {
    try {
      await graphManager.deleteGraph(req.params.graphId);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  // --- Schema CRUD API ---
  app.get('/api/schema/relations', async (req, res) => res.json(await schemaManager.getRelationTypes()));
  app.post('/api/schema/relations', async (req, res) => {
    try {
      const newType = await schemaManager.addRelationType(req.body);
      res.status(201).json(newType);
    } catch (error) {
      res.status(409).json({ error: error.message });
    }
  });
  app.put('/api/schema/relations/:name', async (req, res) => {
    try {
      const updatedType = await schemaManager.updateRelationType(req.params.name, req.body);
      res.json(updatedType);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });
  app.delete('/api/schema/relations/:name', async (req, res) => {
    try {
      await schemaManager.deleteRelationType(req.params.name);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  app.get('/api/schema/attributes', async (req, res) => res.json(await schemaManager.getAttributeTypes()));
  app.post('/api/schema/attributes', async (req, res) => {
    try {
      const newType = await schemaManager.addAttributeType(req.body);
      res.status(201).json(newType);
    } catch (error) {
      res.status(409).json({ error: error.message });
    }
  });
  app.put('/api/schema/attributes/:name', async (req, res) => {
    try {
      const updatedType = await schemaManager.updateAttributeType(req.params.name, req.body);
      res.json(updatedType);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });
  app.delete('/api/schema/attributes/:name', async (req, res) => {
    try {
      await schemaManager.deleteAttributeType(req.params.name);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  app.get('/api/schema/nodetypes', async (req, res) => res.json(await schemaManager.getNodeTypes()));

  // --- Graph-Specific API ---

  // Middleware to load the correct graph
  const loadGraph = async (req, res, next) => {
    try {
      // Inject the HyperGraph dependency here
      req.graph = await graphManager.getGraph(req.params.graphId, HyperGraph);
      next();
    } catch (error) {
      res.status(404).json({ error: 'Graph not found' });
    }
  };

  app.get('/api/graphs/:graphId/key', loadGraph, (req, res) => {
    res.json({ key: req.graph.key });
  });

  app.get('/api/graphs/:graphId/graph', loadGraph, async (req, res) => {
    const nodes = await req.graph.listAll('nodes');
    const relations = await req.graph.listAll('relations');
    const attributes = await req.graph.listAll('attributes');
    res.json({ nodes, relations, attributes, transitions: [], functions: [] });
  });

  app.get('/api/graphs/:graphId/cnl', async (req, res) => {
    try {
      const cnl = await graphManager.getCnl(req.params.graphId);
      res.json({ cnl });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  app.post('/api/graphs/:graphId/nodes', loadGraph, async (req, res) => {
    const { base_name, options } = req.body;
    const node = await req.graph.addNode(base_name, options);
    res.status(201).json(node);
    // broadcastUpdate should be graph-specific now
  });

  app.post('/api/graphs/:graphId/relations', loadGraph, async (req, res) => {
    const { source, target, name, options } = req.body;
    const relation = await req.graph.addRelation(source, target, name, options);
    res.status(201).json(relation);
  });

  app.post('/api/graphs/:graphId/attributes', loadGraph, async (req, res) => {
    const { source, name, value, options } = req.body;
    const attribute = await req.graph.addAttribute(source, name, value, options);
    res.status(201).json(attribute);
  });

  app.delete('/api/graphs/:graphId/nodes/:id', loadGraph, async (req, res) => {
    await req.graph.deleteNode(req.params.id);
    res.status(204).send();
  });

  app.delete('/api/graphs/:graphId/relations/:id', loadGraph, async (req, res) => {
    await req.graph.deleteRelation(req.params.id);
    res.status(204).send();
  });

  app.delete('/api/graphs/:graphId/attributes/:id', loadGraph, async (req, res) => {
    await req.graph.deleteAttribute(req.params.id);
    res.status(204).send();
  });

  app.post('/api/graphs/:graphId/cnl', loadGraph, async (req, res) => {
    const { cnlText, strictMode } = req.body;
    console.log('Strict Mode Flag Received:', strictMode); // DEBUGGING
    const { operations, errors } = await parseCnl(cnlText);
    
    if (strictMode) {
      const validationErrors = await validateOperations(operations);
      errors.push(...validationErrors);
    }

    if (errors.length > 0) {
      return res.status(422).json({ errors });
    }

    if (operations.length > 0) {
      for (const op of operations) {
        switch (op.type) {
          case 'addNode':
            const { base_name, options } = op.payload;
            const existingNode = await req.graph.getNode(options.id);
            if (!existingNode) {
              await req.graph.addNode(base_name, options);
            } else if (options.role && existingNode.role !== options.role) {
              await req.graph.updateNode(options.id, { role: options.role });
            }
            break;
          case 'updateNode':
            await req.graph.updateNode(op.payload.id, op.payload.fields);
            break;
          case 'addRelation':
            await req.graph.addRelation(op.payload.source, op.payload.target, op.payload.name, op.payload.options);
            break;
          case 'addAttribute':
            await req.graph.addAttribute(op.payload.source, op.payload.name, op.payload.value, op.payload.options);
            break;
        }
      }
    }
    
    // If successful, save the CNL text
    await graphManager.saveCnl(req.params.graphId, cnlText);

    res.status(200).json({ message: 'CNL parsed and executed successfully.' });
  });

  // WebSocket needs to be aware of graphs
  wss.on('connection', (ws, req) => {
    // This is a simplified approach. A robust implementation would
    // associate the ws connection with a specific graphId.
    console.log('Frontend connected');
    ws.on('close', () => console.log('Frontend disconnected'));
  });

  // Catch-all middleware for debugging unmatched routes
  app.use((req, res, next) => {
    console.log(`UNMATCHED ROUTE: ${req.method} ${req.originalUrl}`);
    res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
  });

  server.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
