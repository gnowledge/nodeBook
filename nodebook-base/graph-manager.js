const fs = require('fs').promises;
const path = require('path');

const GRAPHS_DIR = path.join(__dirname, 'graphs');
const REGISTRY_FILE = path.join(GRAPHS_DIR, 'registry.json');

let activeGraphs = new Map();

async function initialize() {
    await fs.mkdir(GRAPHS_DIR, { recursive: true });
    try {
        await fs.access(REGISTRY_FILE);
    } catch {
        await fs.writeFile(REGISTRY_FILE, JSON.stringify([]));
    }
}

async function getGraphRegistry() {
    const registryData = await fs.readFile(REGISTRY_FILE, 'utf-8');
    return JSON.parse(registryData);
}

async function saveGraphRegistry(registry) {
    await fs.writeFile(REGISTRY_FILE, JSON.stringify(registry, null, 2));
}

async function createGraph(name) {
    const registry = await getGraphRegistry();
    const id = name.toLowerCase().replace(/\s+/g, '-');
    if (registry.find(g => g.id === id)) {
        throw new Error('Graph with this name already exists.');
    }

    const graphDir = path.join(GRAPHS_DIR, id);
    await fs.mkdir(graphDir, { recursive: true });

    const newGraphInfo = { id, name, path: graphDir };
    registry.push(newGraphInfo);
    await saveGraphRegistry(registry);

    return newGraphInfo;
}

async function getGraph(id, HyperGraph) { // HyperGraph is now passed as an argument
    if (activeGraphs.has(id)) {
        return activeGraphs.get(id);
    }

    const registry = await getGraphRegistry();
    const graphInfo = registry.find(g => g.id === id);
    if (!graphInfo) {
        throw new Error('Graph not found.');
    }

    const graph = await HyperGraph.create(graphInfo.path);
    await graph.joinSwarm();
    activeGraphs.set(id, graph);
    return graph;
}

async function getCnl(graphId) {
    const registry = await getGraphRegistry();
    const graphInfo = registry.find(g => g.id === graphId);
    if (!graphInfo) throw new Error('Graph not found.');

    const cnlPath = path.join(graphInfo.path, 'graph.cnl');
    try {
        return await fs.readFile(cnlPath, 'utf-8');
    } catch (error) {
        if (error.code === 'ENOENT') return ''; // Return empty string if file doesn't exist
        throw error;
    }
}

async function saveCnl(graphId, cnlText) {
    const registry = await getGraphRegistry();
    const graphInfo = registry.find(g => g.id === graphId);
    if (!graphInfo) throw new Error('Graph not found.');

    const cnlPath = path.join(graphInfo.path, 'graph.cnl');
    await fs.writeFile(cnlPath, cnlText);
}

async function deleteGraph(id) {
    const registry = await getGraphRegistry();
    const graphIndex = registry.findIndex(g => g.id === id);
    if (graphIndex === -1) {
        throw new Error('Graph not found.');
    }

    const graphInfo = registry[graphIndex];
    await fs.rm(graphInfo.path, { recursive: true, force: true });

    registry.splice(graphIndex, 1);
    await saveGraphRegistry(registry);

    if (activeGraphs.has(id)) {
        const graph = activeGraphs.get(id);
        await graph.leaveSwarm();
        activeGraphs.delete(id);
    }
}

module.exports = {
    initialize,
    getGraphRegistry,
    createGraph,
    getGraph,
    deleteGraph,
    getCnl,
    saveCnl,
};