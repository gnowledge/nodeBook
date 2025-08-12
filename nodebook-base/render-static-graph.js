const React = require('react');
const ReactDOMServer = require('react-dom/server');
const { Visualization } = require('./frontend/src/Visualization.tsx');
const { NodeCard } = require('./frontend/src/NodeCard.tsx');
const graphManager = require('./graph-manager.js');
const HyperGraph = require('./hyper-graph.js');

async function renderStaticGraph(graphId) {
  const graph = await graphManager.getGraph(graphId, HyperGraph);
  const nodes = await graph.listAll('nodes');
  const relations = await graph.listAll('relations');
  const attributes = await graph.listAll('attributes');

  const publicNodes = nodes.filter(n => n.publication_mode === 'Public');
  const publicNodeIds = new Set(publicNodes.map(n => n.id));
  const publicRelations = relations.filter(r => publicNodeIds.has(r.source_id) && publicNodeIds.has(r.target_id));

  const visualizationHtml = ReactDOMServer.renderToString(
    React.createElement(Visualization, { 
      nodes: publicNodes, 
      relations: publicRelations, 
      attributes, 
      onNodeSelect: () => {} 
    })
  );

  const nodeCardsHtml = publicNodes.map(node => {
    return ReactDOMServer.renderToString(
      React.createElement(NodeCard, {
        node,
        allNodes: publicNodes,
        allRelations: publicRelations,
        attributes,
        isActive: false,
        onDelete: () => {},
        onSelectNode: () => {},
        onImportContext: () => {},
        nodeRegistry: {},
      })
    );
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${graph.name || graph.id}</title>
      <link rel="stylesheet" href="../style.css">
    </head>
    <body>
      <div class="container">
        <h1>${graph.name || graph.id}</h1>
        <p>${graph.description || ''}</p>
        <div id="visualization-container">${visualizationHtml}</div>
        <div class="node-cards">${nodeCardsHtml}</div>
      </div>
      <script>
        window.GRAPH_DATA = ${JSON.stringify({ nodes: publicNodes, relations: publicRelations, attributes })};
      </script>
      <script src="../main.js"></script>
    </body>
    </html>
  `;

  return html;
}

module.exports = { renderStaticGraph };
