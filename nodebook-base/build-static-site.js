const fs = require('fs').promises;
const path = require('path');
const graphManager = require('./graph-manager');
const HyperGraph = require('./hyper-graph');

async function buildStaticSite() {
  const publicHtmlDir = path.join(__dirname, '..', 'public_html');
  const graphsDir = path.join(publicHtmlDir, 'graphs');
  const imagesDir = path.join(publicHtmlDir, 'images');
  const templatesDir = path.join(__dirname, '..', 'scripts');

  await fs.rm(publicHtmlDir, { recursive: true, force: true });
  await fs.mkdir(graphsDir, { recursive: true });
  await fs.mkdir(imagesDir, { recursive: true });

  // --- Data Fetching & Filtering ---
  const allGraphs = await graphManager.getGraphRegistry();
  const publicGraphs = [];

  for (const graphInfo of allGraphs) {
    const graph = await graphManager.getGraph(graphInfo.id, HyperGraph);
    const allNodes = await graph.listAll('nodes');
    const publicNodes = allNodes.filter(node => node.publication_mode === 'Public' && !node.isDeleted);

    if (publicNodes.length > 0) {
      publicGraphs.push({ ...graphInfo, nodes: publicNodes });
    }
  }

  // --- graphs.json Creation ---
  const graphsJson = publicGraphs.map(g => ({ id: g.id, name: g.name, description: g.description }));
  const dataPath = path.join(publicHtmlDir, 'graphs.json');
  await fs.writeFile(dataPath, JSON.stringify(graphsJson, null, 2));

  // --- Individual Graph Pages ---
  for (const graph of publicGraphs) {
    const graphDir = path.join(graphsDir, graph.id);
    const graphImagesDir = path.join(graphDir, 'images');
    await fs.mkdir(graphImagesDir, { recursive: true });

    for (const node of graph.nodes) {
      const sourceImagePath = path.join(imagesDir, `${node.id}.png`);
      const destImagePath = path.join(graphImagesDir, `${node.id}.png`);
      try {
        await fs.copyFile(sourceImagePath, destImagePath);
      } catch (error) {
        // Ignore if image doesn't exist
      }
    }

    const graphData = {
      graph: { id: graph.id, name: graph.name, description: graph.description },
      nodes: graph.nodes.map(n => ({ ...n, image: `images/${n.id}.png` })),
    };
    await fs.writeFile(path.join(graphDir, 'data.json'), JSON.stringify(graphData, null, 2));

    const graphHtmlTemplatePath = path.join(templatesDir, 'graph.html.template');
    const graphHtmlContent = await fs.readFile(graphHtmlTemplatePath, 'utf-8');
    await fs.writeFile(path.join(graphDir, 'index.html'), graphHtmlContent);

    const graphJsTemplatePath = path.join(templatesDir, 'graph-main.js.template');
    const graphJsContent = await fs.readFile(graphJsTemplatePath, 'utf-8');
    await fs.writeFile(path.join(graphDir, 'main.js'), graphJsContent);
  }

  // --- Main Index Page ---
  const indexPath = path.join(publicHtmlDir, 'index.html');
  const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NodeBook</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app"></div>
  <script src="main.js"></script>
</body>
</html>`;
  await fs.writeFile(indexPath, indexContent);

  const styleTemplatePath = path.join(templatesDir, 'style.css.template');
  const styleContent = await fs.readFile(styleTemplatePath, 'utf-8');
  await fs.writeFile(path.join(publicHtmlDir, 'style.css'), styleContent);

  const mainJsTemplatePath = path.join(templatesDir, 'main.js.template');
  const mainJsContent = await fs.readFile(mainJsTemplatePath, 'utf-8');
  await fs.writeFile(path.join(publicHtmlDir, 'main.js'), mainJsContent);
}

module.exports = { buildStaticSite };