const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs').promises;
const { HyperGraph } = require('./hyper-graph');
const { parseCnl, executeOperations } = require('./cnl-parser');

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
  const graph = await HyperGraph.create();
  await graph.joinSwarm();

  const broadcastUpdate = async () => {
    const graphData = await getFullGraph(graph);
    wss.clients.forEach(async (client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'graph', payload: graphData }));
      }
    });
  };

  graph.core.on('append', () => {
    console.log('Database changed, broadcasting update.');
    broadcastUpdate();
  });

  // WebSocket connection handler
  wss.on('connection', (ws) => {
    console.log('Frontend connected');
    ws.on('close', () => console.log('Frontend disconnected'));
    // Send the current graph state once on connection
    (async () => {
        const graphData = await getFullGraph(graph);
        ws.send(JSON.stringify({ type: 'graph', payload: graphData }));
    })();
  });

  // --- API Routes ---

  app.get('/api/key', (req, res) => res.json({ key: graph.key }));

  async function getFullGraph(graph) {
    const nodes = await graph.listAll('nodes');
    const relations = await graph.listAll('relations');
    const attributes = await graph.listAll('attributes');
    // Transitions and functions can be added here later
    return { nodes, relations, attributes, transitions: [], functions: [] };
  }

  app.get('/api/graph', async (req, res) => {
    const graphData = await getFullGraph(graph);
    res.json(graphData);
  });

  // --- Node CRUD ---
  app.post('/api/nodes', async (req, res) => {
    const { base_name, options } = req.body;
    if (!base_name) return res.status(400).json({ error: 'base_name is required' });
    const node = await graph.addNode(base_name, options);
    res.status(201).json(node);
    broadcastUpdate();
  });

  // --- Relation CRUD ---
  app.post('/api/relations', async (req, res) => {
    const { source, target, name, options } = req.body;
    if (!source || !target || !name) {
      return res.status(400).json({ error: 'source, target, and name are required' });
    }
    const relation = await graph.addRelation(source, target, name, options);
    res.status(201).json(relation);
    broadcastUpdate();
  });

  // --- Attribute CRUD ---
  app.post('/api/attributes', async (req, res) => {
    const { source, name, value, options } = req.body;
    if (!source || !name || value === undefined) {
      return res.status(400).json({ error: 'source, name, and value are required' });
    }
    const attribute = await graph.addAttribute(source, name, value, options);
    res.status(201).json(attribute);
    broadcastUpdate();
  });

  app.post('/api/cnl', async (req, res) => {
    const { cnlText } = req.body;
    if (!cnlText) return res.status(400).json({ error: 'cnlText is required' });
    
    const { operations, errors } = parseCnl(cnlText);

    if (operations.length > 0) {
        try {
            await executeOperations(graph, operations);
        } catch (error) {
            console.error('CNL Execution Error:', error);
            errors.push({ lineNumber: 'N/A', message: `Execution failed: ${error.message}` });
        }
    }
    
    if (errors.length > 0) {
        res.status(422).json({ errors });
    } else {
        res.status(200).json({ message: 'CNL parsed and executed successfully.' });
    }
    broadcastUpdate();
  });

  // --- Schema Routes ---
  app.get('/api/schema/relations', async (req, res) => {
    try {
      const relationTypesPath = path.join(__dirname, '../graph_data/global/relation_types.json');
      const data = await fs.readFile(relationTypesPath, 'utf8');
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(500).json({ error: 'Could not load relation types' });
    }
  });

  app.get('/api/schema/attributes', async (req, res) => {
    try {
      const attributeTypesPath = path.join(__dirname, '../graph_data/global/attribute_types.json');
      const data = await fs.readFile(attributeTypesPath, 'utf8');
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(500).json({ error: 'Could not load attribute types' });
    }
  });

  server.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);