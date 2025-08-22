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
        this.BASE_DATA_DIR = null;
        this.activeGraphs = new Map();
        logDebug('GraphManager instance created.');
    }

    async initialize(dataPath) {
        this.BASE_DATA_DIR = dataPath || path.join(__dirname, 'graphs');
        logDebug(`Initializing with BASE_DATA_DIR: ${this.BASE_DATA_DIR}`);
        
        // Create base data directory
        await fsp.mkdir(this.BASE_DATA_DIR, { recursive: true });
        
        // Create users directory
        const usersDir = path.join(this.BASE_DATA_DIR, 'users');
        await fsp.mkdir(usersDir, { recursive: true });
        
        logDebug('GraphManager initialized with user data segregation support.');
    }

    // Get user-specific data directory
    getUserDataDir(userId) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        // Convert userId to string since path.join expects string arguments
        const userIdStr = String(userId);
        return path.join(this.BASE_DATA_DIR, 'users', userIdStr);
    }

    // Get user-specific registry files
    getUserRegistryFiles(userId) {
        const userDataDir = this.getUserDataDir(userId);
        return {
            graphRegistry: path.join(userDataDir, 'registry.json'),
            nodeRegistry: path.join(userDataDir, 'node_registry.json')
        };
    }

    // Ensure user data directory exists
    async ensureUserDataDir(userId) {
        const userDataDir = this.getUserDataDir(userId);
        const { graphRegistry, nodeRegistry } = this.getUserRegistryFiles(userId);
        
        await fsp.mkdir(userDataDir, { recursive: true });
        
        // Initialize user's graph registry if it doesn't exist
        try {
            await fsp.access(graphRegistry);
        } catch {
            await writeJsonFile(graphRegistry, []);
        }
        
        // Initialize user's node registry if it doesn't exist
        try {
            await fsp.access(nodeRegistry);
        } catch {
            await writeJsonFile(nodeRegistry, {});
        }
        
        return userDataDir;
    }

    async getGraphRegistry(userId) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        
        // Ensure user data directory exists before trying to read registry
        await this.ensureUserDataDir(userId);
        
        const { graphRegistry } = this.getUserRegistryFiles(userId);
        logDebug(`Getting graph registry for user ${userId} from: ${graphRegistry}`);
        const registry = await readJsonFile(graphRegistry);
        return registry || [];
    }

    async saveGraphRegistry(userId, registry) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        const { graphRegistry } = this.getUserRegistryFiles(userId);
        logDebug(`Saving graph registry for user ${userId} to: ${graphRegistry}`);
        logDebug(`Registry contents to be saved: ${JSON.stringify(registry, null, 2)}`);
        await writeJsonFile(graphRegistry, registry);
        logDebug(`Finished saving graph registry for user ${userId}`);
    }

    async updateGraphMetadata(userId, graphId, metadata) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        const registry = await this.getGraphRegistry(userId);
        const graphIndex = registry.findIndex(g => g.id === graphId);
        if (graphIndex === -1) {
            throw new Error('Graph not found.');
        }
        registry[graphIndex] = { ...registry[graphIndex], ...metadata, updatedAt: new Date().toISOString() };
        await this.saveGraphRegistry(userId, registry);
    }

    async getNodeRegistry(userId) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        
        // Ensure user data directory exists before trying to read registry
        await this.ensureUserDataDir(userId);
        
        const { nodeRegistry } = this.getUserRegistryFiles(userId);
        const registry = await readJsonFile(nodeRegistry);
        return registry || {};
    }

    async saveNodeRegistry(userId, registry) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        const { nodeRegistry } = this.getUserRegistryFiles(userId);
        await writeJsonFile(nodeRegistry, registry);
    }

    async addNodeToRegistry(userId, node) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        const registry = await this.getNodeRegistry(userId);
        if (!registry[node.id]) {
            registry[node.id] = {
                base_name: node.base_name,
                description: node.description,
                graph_ids: [],
            };
        }
        await this.saveNodeRegistry(userId, registry);
        return registry[node.id];
    }

    async registerNodeInGraph(userId, nodeId, graphId) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        const registry = await this.getNodeRegistry(userId);
        if (registry[nodeId] && !registry[nodeId].graph_ids.includes(graphId)) {
            registry[nodeId].graph_ids.push(graphId);
            await this.saveNodeRegistry(userId, registry);
        }
    }

    async unregisterGraphFromRegistry(userId, graphId) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        const registry = await this.getNodeRegistry(userId);
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
            await this.saveNodeRegistry(userId, registry);
        }
    }

    async createGraph(userId, name, author = 'anonymous', email = '') {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        
        logDebug(`[createGraph] Creating graph "${name}" for user: ${userId}`);
        
        // Ensure user data directory exists
        await this.ensureUserDataDir(userId);
        logDebug(`[createGraph] User data directory ensured for user: ${userId}`);
        
        const registry = await this.getGraphRegistry(userId);
        logDebug(`[createGraph] Current registry for user ${userId}: ${JSON.stringify(registry)}`);
        
        const id = name.toLowerCase().replace(/\s+/g, '-');
        logDebug(`[createGraph] Generated graph ID: ${id}`);
        
        if (registry.find(g => g.id === id)) {
            logDebug(`[createGraph] Graph with ID ${id} already exists for user ${userId}`);
            throw new Error('Graph with this name already exists.');
        }
        
        const userDataDir = this.getUserDataDir(userId);
        const graphDir = path.join(userDataDir, id);
        logDebug(`Creating new graph for user ${userId} in: ${graphDir}`);
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
        logDebug(`[createGraph] Added graph to registry: ${JSON.stringify(newGraphInfo)}`);
        await this.saveGraphRegistry(userId, registry);
        logDebug(`[createGraph] Successfully created graph "${name}" with ID ${id} for user ${userId}`);
        return newGraphInfo;
    }

    async getGraph(userId, id, HyperGraph) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        
        const graphKey = `${userId}:${id}`;
        if (this.activeGraphs.has(graphKey)) {
            return this.activeGraphs.get(graphKey);
        }
        
        const registry = await this.getGraphRegistry(userId);
        const graphInfo = registry.find(g => g.id === id);
        if (!graphInfo) {
            throw new Error('Graph not found.');
        }
        const graph = await HyperGraph.create(graphInfo.path);
        await graph.joinSwarm();
        this.activeGraphs.set(graphKey, graph);
        return graph;
    }

    async getCnl(userId, graphId) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        const registry = await this.getGraphRegistry(userId);
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

    async getNodeCnl(userId, graphId, nodeId) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        const cnl = await this.getCnl(userId, graphId);
        const lines = cnl.split('\n');
        const nodeCnlLines = [];
        let inNodeBlock = false;
        const nodeRegistry = await this.getNodeRegistry(userId);
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

    async saveCnl(userId, graphId, cnlText) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        const registry = await this.getGraphRegistry(userId);
        const graphInfo = registry.find(g => g.id === graphId);
        if (!graphInfo) throw new Error('Graph not found.');
        const cnlPath = path.join(graphInfo.path, 'graph.cnl');
        await fsp.writeFile(cnlPath, cnlText);
        await this.updateGraphMetadata(userId, graphId, {});
    }

    async deleteGraph(userId, id) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        
        const registry = await this.getGraphRegistry(userId);
        const graphIndex = registry.findIndex(g => g.id === id);
        if (graphIndex === -1) {
            throw new Error('Graph not found.');
        }
        
        await this.unregisterGraphFromRegistry(userId, id);
        const graphInfo = registry[graphIndex];
        await fsp.rm(graphInfo.path, { recursive: true, force: true });
        registry.splice(graphIndex, 1);
        await this.saveGraphRegistry(userId, registry);
        
        const graphKey = `${userId}:${id}`;
        if (this.activeGraphs.has(graphKey)) {
            const graph = this.activeGraphs.get(graphKey);
            await graph.leaveSwarm();
            this.activeGraphs.delete(graphKey);
        }
    }
}

module.exports = GraphManager;

