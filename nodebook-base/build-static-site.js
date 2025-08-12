const fs = require('fs').promises;
const path = require('path');
// const { createCanvas, Image } = require('canvas');
const cytoscape = require('cytoscape');
const dagre = require('cytoscape-dagre');
const graphManager = require('./graph-manager');
const HyperGraph = require('./hyper-graph');
const { generateNodeCard } = require('./StaticNodeCard');

cytoscape.use(dagre);

// Server-side graph rendering function
async function renderGraphToPng(nodes, edges, progressCallback = () => {}) {
  const width = 800;
  const height = 600;

  const cy = cytoscape({
    headless: true,
    styleEnabled: true,
    container: null, // Use null for true headless operation
    elements: {
      nodes: nodes.map(n => ({ data: { id: n.id, label: n.name } })),
      edges: edges.map(r => ({ data: { source: r.source_id, target: r.target_id, label: r.name } })),
    },
    style: [ // Using the same styles as the frontend for consistency
      {
        selector: 'node',
        style: {
          'label': 'data(label)', 'text-valign': 'center', 'text-halign': 'center',
          'background-color': '#f3f4f6', 'color': '#2563eb', 'text-outline-width': 0,
          'font-size': 14, 'border-width': 0.5, 'border-color': '#2563eb',
          'shape': 'roundrectangle', 'width': (ele) => ele.data('label').length * 8 + 20, 'height': 35
        }
      },
      {
        selector: 'edge',
        style: {
          'label': 'data(label)', 'curve-style': 'bezier', 'target-arrow-shape': 'triangle',
          'width': 1, 'line-color': '#ccc', 'target-arrow-color': '#ccc', 'font-size': 9,
          'text-background-color': '#fff', 'text-background-opacity': 1, 'text-background-padding': '2px'
        }
      }
    ],
    layout: {
      name: 'dagre',
      rankDir: 'LR',
      fit: true,
      padding: 30
    },
  });

  // Run layout asynchronously
  progressCallback('  - Running layout algorithm...');
  const layout = cy.layout({ name: 'dagre' });
  const onLayoutStop = layout.promiseOn('layoutstop');
  layout.run();
  await onLayoutStop;
  progressCallback('  - Layout complete.');
  
  // Get the JPG buffer from Cytoscape, which is better supported in headless mode
  const jpgBuffer = cy.jpg({ output: 'blob', full: true, bg: 'white', scale: 2 });
  return jpgBuffer;
}

async function buildStaticSite(progressCallback = () => {}) {
  progressCallback('Starting static site build...');
  const publicHtmlDir = path.join(__dirname, '..', 'public_html');
  const graphsDir = path.join(publicHtmlDir, 'graphs');
  
  progressCallback('Cleaning up old files...');
  await fs.rm(publicHtmlDir, { recursive: true, force: true });
  await fs.mkdir(graphsDir, { recursive: true });

  // --- Data Fetching & Filtering ---
  progressCallback('Fetching public graphs and nodes...');
  const allGraphs = await graphManager.getGraphRegistry();
  const publicGraphs = [];

  for (const graphInfo of allGraphs) {
    const graph = await graphManager.getGraph(graphInfo.id, HyperGraph);
    const allNodes = await graph.listAll('nodes');
    const publicNodes = allNodes.filter(node => node.publication_mode === 'Public' && !node.isDeleted);

    if (publicNodes.length > 0) {
      const relations = await graph.listAll('relations');
      publicGraphs.push({ ...graphInfo, nodes: publicNodes, relations });
    }
  }
  progressCallback(`Found ${publicGraphs.length} public graph(s).`);

  // --- graphs.json Creation ---
  const graphsJson = publicGraphs.map(g => ({ id: g.id, name: g.name, description: g.description }));
  await fs.writeFile(path.join(publicHtmlDir, 'graphs.json'), JSON.stringify(graphsJson, null, 2));

  // --- Individual Graph Pages ---
  for (const graph of publicGraphs) {
    progressCallback(`Processing graph: ${graph.name}`);
    const graphDir = path.join(graphsDir, graph.id);
    const graphImagesDir = path.join(graphDir, 'images');
    await fs.mkdir(graphImagesDir, { recursive: true });

    const publicNodeIds = new Set(graph.nodes.map(n => n.id));
    const publicRelations = graph.relations.filter(r => publicNodeIds.has(r.source_id) && publicNodeIds.has(r.target_id));

    progressCallback(`  - Generating main graph image...`);
    const mainGraphImageBuffer = await renderGraphToPng(graph.nodes, publicRelations, progressCallback);
    await fs.writeFile(path.join(graphDir, 'graph.jpg'), mainGraphImageBuffer);

    let nodeCardsHtml = '';
    for (const node of graph.nodes) {
      progressCallback(`  - Generating image for node: ${node.name}`);
      const subgraphNodesRaw = [node];
      const subgraphRelationsRaw = graph.relations.filter(r => r.source_id === node.id || r.target_id === node.id);
      
      for (const rel of subgraphRelationsRaw) {
        const otherNodeId = rel.source_id === node.id ? rel.target_id : rel.source_id;
        if (!subgraphNodesRaw.find(n => n.id === otherNodeId)) {
          const otherNode = graph.nodes.find(n => n.id === otherNodeId);
          if (otherNode) subgraphNodesRaw.push(otherNode);
        }
      }
      
      const subgraphNodeIds = new Set(subgraphNodesRaw.map(n => n.id));
      const subgraphRelations = subgraphRelationsRaw.filter(r => subgraphNodeIds.has(r.source_id) && subgraphNodeIds.has(r.target_id));

      const nodeImageBuffer = await renderGraphToPng(subgraphNodesRaw, subgraphRelations);
      await fs.writeFile(path.join(graphImagesDir, `${node.id}.jpg`), nodeImageBuffer);
      nodeCardsHtml += generateNodeCard(node);
    }

    progressCallback(`  - Generating HTML page...`);
    const graphHtmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${graph.name}</title>
        <link rel="stylesheet" href="../style.css">
      </head>
      <body>
        <div class="container">
          <h1>${graph.name}</h1>
          <p>${graph.description || ''}</p>
          <div class="graph-image">
            <img src="graph.jpg" alt="Main graph visualization">
          </div>
          <div class="node-cards">
            ${nodeCardsHtml}
          </div>
        </div>
      </body>
      </html>
    `;
    await fs.writeFile(path.join(graphDir, 'index.html'), graphHtmlContent);
  }

  // --- Main Index Page ---
  progressCallback('Generating main index page...');
  const indexPath = path.join(publicHtmlDir, 'index.html');
  const indexContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NodeBook</title>
      <link rel="stylesheet" href="style.css">
    </head>
    <body>
      <div class="container">
        <h1>Public Graphs</h1>
        <ul>
          ${publicGraphs.map(g => `<li><a href="graphs/${g.id}/index.html">${g.name}</a></li>`).join('')}
        </ul>
      </div>
    </body>
    </html>
  `;
  await fs.writeFile(indexPath, indexContent);
  progressCallback('Build complete.');
}

module.exports = { buildStaticSite };
