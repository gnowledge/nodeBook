const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs').promises;
const HyperGraph = require('./hyper-graph');
const graphManager = require('./graph-manager');
const schemaManager = require('./schema-manager');
const { diffCnl, getNodeOrderFromCnl } = require('./cnl-parser');
const { evaluate } = require('mathjs');
const { buildStaticSite } = require('./build-static-site');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

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
    const { name, author, email } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    try {
      const newGraph = await graphManager.createGraph(name, author, email);
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
  app.get('/api/schema/functions', async (req, res) => res.json(await schemaManager.getFunctionTypes()));
  app.post('/api/schema/functions', async (req, res) => {
    try {
      const newType = await schemaManager.addFunctionType(req.body);
      res.status(201).json(newType);
    } catch (error) {
      res.status(409).json({ error: error.message });
    }
  });
  app.put('/api/schema/functions/:name', async (req, res) => {
    try {
      const updatedType = await schemaManager.updateFunctionType(req.params.name, req.body);
      res.json(updatedType);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });
  app.delete('/api/schema/functions/:name', async (req, res) => {
    try {
      await schemaManager.deleteFunctionType(req.params.name);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });
  
  // --- Node Registry API ---
  app.get('/api/noderegistry', async (req, res) => res.json(await graphManager.getNodeRegistry()));


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

  app.put('/api/graphs/:graphId/nodes/:nodeId/publication', loadGraph, async (req, res) => {
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

  app.put('/api/graphs/:graphId/publish/all', loadGraph, async (req, res) => {
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

  app.get('/api/graphs/:graphId/key', loadGraph, (req, res) => {
    res.json({ key: req.graph.key });
  });

  app.get('/api/graphs/:graphId/graph', loadGraph, async (req, res) => {
    const graphId = req.params.graphId;
    const nodesFromDb = await req.graph.listAll('nodes');
    const relations = await req.graph.listAll('relations');
    const attributes = await req.graph.listAll('attributes');
    const transitions = await req.graph.listAll('transitions');
    const functions = await req.graph.listAll('functions');
    const functionTypes = await schemaManager.getFunctionTypes();
    
    const allNodesFromDb = [...nodesFromDb, ...transitions].filter(node => !node.isDeleted);
    
    // Get node order from CNL
    const cnl = await graphManager.getCnl(graphId);
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
    try {
      const cnl = await graphManager.getCnl(req.params.graphId);
      res.json({ cnl });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  app.get('/api/graphs/:graphId/nodes/:nodeId/cnl', async (req, res) => {
    try {
      const cnl = await graphManager.getNodeCnl(req.params.graphId, req.params.nodeId);
      res.json({ cnl });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  app.post('/api/graphs/:graphId/cnl', loadGraph, async (req, res) => {
    const { cnlText } = req.body;
    const graph = req.graph;
    const graphId = req.params.graphId;

    const { operations, errors } = await diffCnl(await graphManager.getCnl(graphId), cnlText);
    
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
                await graphManager.addNodeToRegistry({ id: op.payload.options.id, ...op.payload });
              }
              await graphManager.registerNodeInGraph(op.payload.options.id, graphId);
              break;
            case 'addRelation':
              const targetNode = await graph.getNode(op.payload.target);
              if (!targetNode) {
                await graph.addNode(op.payload.target, { id: op.payload.target });
                await graphManager.addNodeToRegistry({ id: op.payload.target, base_name: op.payload.target });
              }
              await graphManager.registerNodeInGraph(op.payload.target, graphId);
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
            await graphManager.updateGraphMetadata(graphId, { description: op.payload.description });
        }
      }
    }
    
    await graphManager.saveCnl(req.params.graphId, cnlText);
    res.status(200).json({ message: 'CNL processed successfully.' });
  });

  // --- Peer Management API ---
  app.get('/api/graphs/:graphId/peers', loadGraph, (req, res) => {
    const status = req.graph.getSwarmStatus();
    res.json(status);
  });

  app.post('/api/graphs/:graphId/peers/sync', loadGraph, async (req, res) => {
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