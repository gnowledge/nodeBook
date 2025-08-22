const fsp = require('fs').promises;
const path = require('path');

const DEBUG_LOG_FILE = '/tmp/nodebook-debug.log';

// Helper function for logging
const logDebug = (message) => {
    // Use fs.promises.appendFile for async logging
    fsp.appendFile(DEBUG_LOG_FILE, `[${new Date().toISOString()}] ${message}\n`).catch(console.error);
};

// Clear the log file at the start of the module load
fsp.writeFile(DEBUG_LOG_FILE, '').catch(console.error);
logDebug('GraphManager module loaded.');


// --- Helper Functions ---
async function readJsonFile(file) {
    try {
        const data = await fsp.readFile(file, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
}

async function writeJsonFile(file, data) {
    await fsp.writeFile(file, JSON.stringify(data, null, 2));
}

class GraphManager {
    constructor() {
        this.DATA_DIR = null;
        this.REGISTRY_FILE = null;
        this.NODE_REGISTRY_FILE = null;
        this.activeGraphs = new Map();
        logDebug('GraphManager instance created.');
    }

    async initialize(dataPath) {
        this.DATA_DIR = dataPath || path.join(__dirname, 'graphs');
        logDebug(`Initializing with DATA_DIR: ${this.DATA_DIR}`);
        this.REGISTRY_FILE = path.join(this.DATA_DIR, 'registry.json');
        this.NODE_REGISTRY_FILE = path.join(this.DATA_DIR, 'node_registry.json');

        await fsp.mkdir(this.DATA_DIR, { recursive: true });
        try {
            await fsp.access(this.REGISTRY_FILE);
        } catch {
            await writeJsonFile(this.REGISTRY_FILE, []);
        }
        try {
            await fsp.access(this.NODE_REGISTRY_FILE);
        } catch {
            await writeJsonFile(this.NODE_REGISTRY_FILE, {});
        }
    }

    async getGraphRegistry() {
        logDebug(`Getting graph registry from: ${this.REGISTRY_FILE}`);
        const registry = await readJsonFile(this.REGISTRY_FILE);
        return registry || [];
    }

    async saveGraphRegistry(registry) {
        logDebug(`Saving graph registry to: ${this.REGISTRY_FILE}`);
        logDebug(`Registry contents to be saved: ${JSON.stringify(registry, null, 2)}`);
        await writeJsonFile(this.REGISTRY_FILE, registry);
        logDebug(`Finished saving graph registry to: ${this.REGISTRY_FILE}`);
    }

    async updateGraphMetadata(graphId, metadata) {
        const registry = await this.getGraphRegistry();
        const graphIndex = registry.findIndex(g => g.id === graphId);
        if (graphIndex === -1) {
            throw new Error('Graph not found.');
        }
        registry[graphIndex] = { ...registry[graphIndex], ...metadata, updatedAt: new Date().toISOString() };
        await this.saveGraphRegistry(registry);
    }

    async getNodeRegistry() {
        const registry = await readJsonFile(this.NODE_REGISTRY_FILE);
        return registry || {};
    }

    async saveNodeRegistry(registry) {
        await writeJsonFile(this.NODE_REGISTRY_FILE, registry);
    }

    async addNodeToRegistry(node) {
        const registry = await this.getNodeRegistry();
        if (!registry[node.id]) {
            registry[node.id] = {
                base_name: node.base_name,
                description: node.description,
                graph_ids: [],
            };
        }
        await this.saveNodeRegistry(registry);
        return registry[node.id];
    }

    async registerNodeInGraph(nodeId, graphId) {
        const registry = await this.getNodeRegistry();
        if (registry[nodeId] && !registry[nodeId].graph_ids.includes(graphId)) {
            registry[nodeId].graph_ids.push(graphId);
            await this.saveNodeRegistry(registry);
        }
    }

    async unregisterGraphFromRegistry(graphId) {
        const registry = await this.getNodeRegistry();
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
            await this.saveNodeRegistry(registry);
        }
    }

    async createGraph(name, author = 'anonymous', email = '') {
        logDebug(`createGraph called. Current DATA_DIR: ${this.DATA_DIR}`);
        const registry = await this.getGraphRegistry();
        const id = name.toLowerCase().replace(/\s+/g, '-');
        if (registry.find(g => g.id === id)) {
            throw new Error('Graph with this name already exists.');
        }
        const graphDir = path.join(this.DATA_DIR, id);
        logDebug(`Creating new graph in: ${graphDir}`);
        await fsp.mkdir(graphDir, { recursive: true });
        
        // Create an empty graph.cnl file so getCnl() doesn't fail
        const cnlPath = path.join(graphDir, 'graph.cnl');
        await fsp.writeFile(cnlPath, '', 'utf-8');
        logDebug(`Created empty graph.cnl file at: ${cnlPath}`);
        
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
        await this.saveGraphRegistry(registry);
        return newGraphInfo;
    }

    async getGraph(id, HyperGraph) {
        if (this.activeGraphs.has(id)) {
            return this.activeGraphs.get(id);
        }
        const registry = await this.getGraphRegistry();
        const graphInfo = registry.find(g => g.id === id);
        if (!graphInfo) {
            throw new Error('Graph not found.');
        }
        const graph = await HyperGraph.create(graphInfo.path);
        await graph.joinSwarm();
        this.activeGraphs.set(id, graph);
        return graph;
    }

    async getCnl(graphId) {
        const registry = await this.getGraphRegistry();
        const graphInfo = registry.find(g => g.id === graphId);
        if (!graphInfo) throw new Error('Graph not found.');
        const cnlPath = path.join(graphInfo.path, 'graph.cnl');
        try {
            return await fsp.readFile(cnlPath, 'utf-8');
        } catch (error) {
            if (error.code === 'ENOENT') return '';
            throw error;
        }
    }

    async getNodeCnl(graphId, nodeId) {
        const cnl = await this.getCnl(graphId);
        const lines = cnl.split('\n');
        const nodeCnlLines = [];
        let inNodeBlock = false;
        const nodeRegistry = await this.getNodeRegistry();
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

    async saveCnl(graphId, cnlText) {
        const registry = await this.getGraphRegistry();
        const graphInfo = registry.find(g => g.id === graphId);
        if (!graphInfo) throw new Error('Graph not found.');
        const cnlPath = path.join(graphInfo.path, 'graph.cnl');
        await fsp.writeFile(cnlPath, cnlText);
        await this.updateGraphMetadata(graphId, {});
    }

    async deleteGraph(id) {
        const registry = await this.getGraphRegistry();
        const graphIndex = registry.findIndex(g => g.id === id);
        if (graphIndex === -1) {
            throw new Error('Graph not found.');
        }
        await this.unregisterGraphFromRegistry(id);
        const graphInfo = registry[graphIndex];
        await fsp.rm(graphInfo.path, { recursive: true, force: true });
        registry.splice(graphIndex, 1);
        await this.saveGraphRegistry(registry);
        if (this.activeGraphs.has(id)) {
            const graph = this.activeGraphs.get(id);
            await graph.leaveSwarm();
            this.activeGraphs.delete(id);
        }
    }
}

module.exports = GraphManager;
