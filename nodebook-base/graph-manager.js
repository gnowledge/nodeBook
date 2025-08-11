const fs = require('fs').promises;
const path = require('path');

const GRAPHS_DIR = path.join(__dirname, 'graphs');
const REGISTRY_FILE = path.join(GRAPHS_DIR, 'registry.json');
const NODE_REGISTRY_FILE = path.join(GRAPHS_DIR, 'node_registry.json');

let activeGraphs = new Map();

async function readJsonFile(file) {
    try {
        const data = await fs.readFile(file, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
}

async function writeJsonFile(file, data) {
    await fs.writeFile(file, JSON.stringify(data, null, 2));
}

async function initialize() {
    await fs.mkdir(GRAPHS_DIR, { recursive: true });
    try {
        await fs.access(REGISTRY_FILE);
    } catch {
        await fs.writeFile(REGISTRY_FILE, JSON.stringify([]));
    }
    try {
        await fs.access(NODE_REGISTRY_FILE);
    } catch {
        await fs.writeFile(NODE_REGISTRY_FILE, JSON.stringify({}));
    }
}

async function getGraphRegistry() {
    const registry = await readJsonFile(REGISTRY_FILE);
    return registry || [];
}

async function saveGraphRegistry(registry) {
    await writeJsonFile(REGISTRY_FILE, registry);
}

async function updateGraphMetadata(graphId, metadata) {
    const registry = await getGraphRegistry();
    const graphIndex = registry.findIndex(g => g.id === graphId);
    if (graphIndex === -1) {
        throw new Error('Graph not found.');
    }
    registry[graphIndex] = { ...registry[graphIndex], ...metadata, updatedAt: new Date().toISOString() };
    await saveGraphRegistry(registry);
}

async function getNodeRegistry() {
    const registry = await readJsonFile(NODE_REGISTRY_FILE);
    return registry || {};
}

async function saveNodeRegistry(registry) {
    await writeJsonFile(NODE_REGISTRY_FILE, registry);
}

async function addNodeToRegistry(node) {
    const registry = await getNodeRegistry();
    if (!registry[node.id]) {
        registry[node.id] = {
            base_name: node.base_name,
            description: node.description,
            graph_ids: [],
        };
    }
    await saveNodeRegistry(registry);
    return registry[node.id];
}

async function registerNodeInGraph(nodeId, graphId) {
    const registry = await getNodeRegistry();
    if (registry[nodeId] && !registry[nodeId].graph_ids.includes(graphId)) {
        registry[nodeId].graph_ids.push(graphId);
        await saveNodeRegistry(registry);
    }
}

async function unregisterGraphFromRegistry(graphId) {
    const registry = await getNodeRegistry();
    let modified = false;

    for (const nodeId in registry) {
        const node = registry[nodeId];
        const initialLength = node.graph_ids.length;
        node.graph_ids = node.graph_ids.filter(id => id !== graphId);

        if (node.graph_ids.length < initialLength) {
            modified = true;
        }

        if (node.graph_ids.length === 0) {
            delete registry[nodeId];
        }
    }

    if (modified) {
        await saveNodeRegistry(registry);
    }
}

async function createGraph(name, author = 'anonymous', email = '') {
    const registry = await getGraphRegistry();
    const id = name.toLowerCase().replace(/\s+/g, '-');
    if (registry.find(g => g.id === id)) {
        throw new Error('Graph with this name already exists.');
    }

    const graphDir = path.join(GRAPHS_DIR, id);
    await fs.mkdir(graphDir, { recursive: true });

    const now = new Date().toISOString();
    const newGraphInfo = { 
        id, 
        name, 
        path: graphDir, 
        description: '',
        author,
        email,
        createdAt: now,
        updatedAt: now,
    };
    registry.push(newGraphInfo);
    await saveGraphRegistry(registry);

    return newGraphInfo;
}

async function getGraph(id, HyperGraph) {
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
        if (error.code === 'ENOENT') return '';
        throw error;
    }
}

async function getNodeCnl(graphId, nodeId) {
    const cnl = await getCnl(graphId);
    const lines = cnl.split('\n');
    const nodeCnlLines = [];
    let inNodeBlock = false;

    const nodeRegistry = await getNodeRegistry();
    const nodeInfo = nodeRegistry[nodeId];
    if (!nodeInfo) return '';

    const nodeName = nodeInfo.base_name;
    const nodeNameRegex = new RegExp(`^# ${nodeName}`);

    for (const line of lines) {
        const isTopLevelHeader = line.startsWith('# ');

        if (inNodeBlock) {
            if (isTopLevelHeader) {
                break;
            }
            nodeCnlLines.push(line);
        } else {
            if (isTopLevelHeader) {
                if (nodeNameRegex.test(line)) {
                    inNodeBlock = true;
                    nodeCnlLines.push(line);
                }
            }
        }
    }

    return nodeCnlLines.join('\n');
}

async function saveCnl(graphId, cnlText) {
    const registry = await getGraphRegistry();
    const graphInfo = registry.find(g => g.id === graphId);
    if (!graphInfo) throw new Error('Graph not found.');

    const cnlPath = path.join(graphInfo.path, 'graph.cnl');
    await fs.writeFile(cnlPath, cnlText);
    await updateGraphMetadata(graphId, {}); // Touch the graph to update the updatedAt timestamp
}

async function deleteGraph(id) {
    const registry = await getGraphRegistry();
    const graphIndex = registry.findIndex(g => g.id === id);
    if (graphIndex === -1) {
        throw new Error('Graph not found.');
    }

    await unregisterGraphFromRegistry(id);

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
    getNodeCnl,
    getNodeRegistry,
    addNodeToRegistry,
    registerNodeInGraph,
    unregisterGraphFromRegistry,
    updateGraphMetadata,
};
