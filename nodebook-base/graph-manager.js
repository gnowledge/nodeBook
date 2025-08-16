const fs = require('fs').promises;
const path = require('path');

// Helper functions remain outside the class
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

class GraphManager {
    constructor() {
        this.DATA_DIR = null;
        this.REGISTRY_FILE = null;
        this.NODE_REGISTRY_FILE = null;
        this.activeGraphs = new Map();
    }

    async initialize(dataPath) {
        this.DATA_DIR = dataPath || path.join(__dirname, 'graphs');
        this.REGISTRY_FILE = path.join(this.DATA_DIR, 'registry.json');
        this.NODE_REGISTRY_FILE = path.join(this.DATA_DIR, 'node_registry.json');

        await fs.mkdir(this.DATA_DIR, { recursive: true });
        try {
            await fs.access(this.REGISTRY_FILE);
        } catch {
            await fs.writeFile(this.REGISTRY_FILE, JSON.stringify([]));
        }
        try {
            await fs.access(this.NODE_REGISTRY_FILE);
        } catch {
            await fs.writeFile(this.NODE_REGISTRY_FILE, JSON.stringify({}));
        }
    }

    async getGraphRegistry() {
        const registry = await readJsonFile(this.REGISTRY_FILE);
        return registry || [];
    }

    async saveGraphRegistry(registry) {
        await writeJsonFile(this.REGISTRY_FILE, registry);
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
        const registry = await this.getGraphRegistry();
        const id = name.toLowerCase().replace(/\s+/g, '-');
        if (registry.find(g => g.id === id)) {
            throw new Error('Graph with this name already exists.');
        }

        const graphDir = path.join(this.DATA_DIR, id);
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
            return await fs.readFile(cnlPath, 'utf-8');
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
        await fs.writeFile(cnlPath, cnlText);
        await this.updateGraphMetadata(graphId, {}); // Touch the graph to update the updatedAt timestamp
    }

    async deleteGraph(id) {
        const registry = await this.getGraphRegistry();
        const graphIndex = registry.findIndex(g => g.id === id);
        if (graphIndex === -1) {
            throw new Error('Graph not found.');
        }

        await this.unregisterGraphFromRegistry(id);

        const graphInfo = registry[graphIndex];
        await fs.rm(graphInfo.path, { recursive: true, force: true });

        registry.splice(graphIndex, 1);
        await this.saveGraphRegistry(registry);

        if (this.activeGraphs.has(id)) {
            const graph = this.activeGraphs.get(id);
            await graph.leaveSwarm();
            this.activeGraphs.delete(id);
        }
    }
}

// Export the class itself, not an instance.
module.exports = GraphManager;