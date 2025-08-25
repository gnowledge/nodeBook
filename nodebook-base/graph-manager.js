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

    async createGraph(userId, name, author = 'anonymous', email = '', mode = 'richgraph') {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        
        logDebug(`[createGraph] Creating graph "${name}" for user: ${userId} in mode: ${mode}`);
        
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
            mode, // Store the graph mode
            publication_state: 'Private', // Default to Private
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

    // Update graph publication state
    async updatePublicationState(userId, graphId, publicationState) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        
        if (!['Private', 'P2P', 'Public'].includes(publicationState)) {
            throw new Error('Invalid publication state. Must be Private, P2P, or Public.');
        }
        
        const registry = await this.getGraphRegistry(userId);
        const graphIndex = registry.findIndex(g => g.id === graphId);
        if (graphIndex === -1) {
            throw new Error('Graph not found.');
        }
        
        registry[graphIndex].publication_state = publicationState;
        registry[graphIndex].updatedAt = new Date().toISOString();
        
        await this.saveGraphRegistry(userId, registry);
        logDebug(`[updatePublicationState] Updated graph ${graphId} to ${publicationState} for user ${userId}`);
        
        return registry[graphIndex];
    }

    // Get all public graphs (for unauthenticated access)
    async getPublicGraphs() {
        const publicGraphs = [];
        
        // First, try to read from the public folder (published graphs)
        const publicDir = path.join(this.BASE_DATA_DIR, 'public', 'graphs');
        try {
            if (await fsp.access(publicDir).then(() => true).catch(() => false)) {
                const graphDirs = await fsp.readdir(publicDir);
                
                for (const graphDir of graphDirs) {
                    const metadataPath = path.join(publicDir, graphDir, 'metadata.json');
                    try {
                        const metadata = await readJsonFile(metadataPath);
                        publicGraphs.push({
                            ...metadata,
                            isPublic: true,
                            isPublished: true
                        });
                    } catch (error) {
                        logDebug(`[getPublicGraphs] Could not read metadata for ${graphDir}: ${error.message}`);
                    }
                }
            }
        } catch (error) {
            logDebug(`[getPublicGraphs] Error reading public directory: ${error.message}`);
        }
        
        // Fallback: also check user directories for graphs marked as Public but not yet published
        const usersDir = path.join(this.BASE_DATA_DIR, 'users');
        try {
            const userDirs = await fsp.readdir(usersDir);
            
            for (const userDir of userDirs) {
                const userDataDir = path.join(usersDir, userDir);
                const userStats = await fsp.stat(userDataDir);
                
                // Skip if not a directory
                if (!userStats.isDirectory()) continue;
                
                const userRegistryPath = path.join(userDataDir, 'registry.json');
                try {
                    const userRegistry = await readJsonFile(userRegistryPath);
                    const publicGraphsInUser = userRegistry.filter(g => g.publication_state === 'Public');
                    
                    // Add user context to public graphs (only if not already in public folder)
                    publicGraphsInUser.forEach(graph => {
                        if (!publicGraphs.find(pg => pg.id === graph.id)) {
                            publicGraphs.push({
                                ...graph,
                                owner: userDir, // User ID of the owner
                                isPublic: true,
                                isPublished: false
                            });
                        }
                    });
                } catch (error) {
                    // Skip if user registry can't be read
                    logDebug(`[getPublicGraphs] Could not read registry for user ${userDir}: ${error.message}`);
                }
            }
        } catch (error) {
            logDebug(`[getPublicGraphs] Error reading users directory: ${error.message}`);
        }
        
        return publicGraphs;
    }

    // Get graph by ID for public access (no authentication required)
    async getPublicGraph(graphId) {
        const publicGraphs = await this.getPublicGraphs();
        const publicGraph = publicGraphs.find(g => g.id === graphId);
        
        if (!publicGraph) {
            throw new Error('Public graph not found.');
        }
        
        try {
            let graphData;
            
            if (publicGraph.isPublished) {
                // Read from public folder - this contains the actual parsed data
                const publicDir = path.join(this.BASE_DATA_DIR, 'public', 'graphs', graphId);
                const publicJsonPath = path.join(publicDir, 'graph.json');
                const publicCnlPath = path.join(publicDir, 'graph.cnl');
                
                // Read the published graph data (already parsed, no re-parsing needed)
                const [jsonData, cnl] = await Promise.all([
                    fsp.readFile(publicJsonPath, 'utf-8').then(JSON.parse),
                    fsp.readFile(publicCnlPath, 'utf-8')
                ]);
                
                graphData = {
                    ...publicGraph,
                    ...jsonData,
                    cnl: cnl
                };
            } else {
                // Fallback: read from user's private folder (for graphs marked Public but not published)
                // This should rarely happen since we now require publishing to make data accessible
                const userDir = path.join(this.BASE_DATA_DIR, 'users', publicGraph.owner);
                const cnlPath = path.join(userDir, graphId, 'graph.cnl');
                const cnl = await fsp.readFile(cnlPath, 'utf-8');
                
                // For unpublished public graphs, we can't provide the full data
                // since it requires authentication to access the parsed data
                graphData = {
                    ...publicGraph,
                    cnl: cnl,
                    nodes: [],
                    relations: [],
                    attributes: []
                };
            }
            
            return graphData;
            
        } catch (error) {
            logDebug(`[getPublicGraph] Error reading graph data for ${graphId}: ${error.message}`);
            // Return basic info if parsing fails
            return publicGraph;
        }
    }

    // Publish graph to public folder
    async publishGraph(userId, graphId) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        
        // Get the graph registry to verify ownership
        const registry = await this.getGraphRegistry(userId);
        const graphInfo = registry.find(g => g.id === graphId);
        if (!graphInfo) {
            throw new Error('Graph not found.');
        }
        
        // Verify the graph is set to Public
        if (graphInfo.publication_state !== 'Public') {
            throw new Error('Graph must be set to Public before publishing.');
        }
        
        try {
            // Create public folder structure
            const publicDir = path.join(this.BASE_DATA_DIR, 'public', 'graphs', graphId);
            await fsp.mkdir(publicDir, { recursive: true });
            
            // Get the graph instance to access its data
            const graph = await this.getGraph(userId, graphId);
            if (!graph) {
                throw new Error('Failed to load graph for publishing.');
            }
            
            // Get the parsed data directly from the graph (no re-parsing)
            const nodes = await graph.listAll('nodes');
            const relations = await graph.listAll('relations');
            const attributes = await graph.listAll('attributes');
            
            // Get the CNL text
            const cnl = await this.getCnl(userId, graphId);
            
            // Create public graph data using the actual parsed data
            const publicGraphData = {
                id: graphId,
                name: graphInfo.name,
                description: graphInfo.description,
                author: graphInfo.author,
                email: graphInfo.email,
                owner: userId,
                publication_state: 'Public',
                publishedAt: new Date().toISOString(),
                nodes: nodes.filter(node => !node.isDeleted),
                relations: relations.filter(rel => !rel.isDeleted),
                attributes: attributes.filter(attr => !attr.isDeleted)
            };
            
            // Write public files
            const publicJsonPath = path.join(publicDir, 'graph.json');
            const publicCnlPath = path.join(publicDir, 'graph.cnl');
            const metadataPath = path.join(publicDir, 'metadata.json');
            
            await fsp.writeFile(publicJsonPath, JSON.stringify(publicGraphData, null, 2), 'utf-8');
            await fsp.writeFile(publicCnlPath, cnl, 'utf-8');
            await fsp.writeFile(metadataPath, JSON.stringify({
                id: graphId,
                name: graphInfo.name,
                description: graphInfo.description,
                author: graphInfo.author,
                owner: userId,
                publishedAt: publicGraphData.publishedAt
            }, null, 2), 'utf-8');
            
            logDebug(`[publishGraph] Successfully published graph ${graphId} to public folder`);
            
            return {
                publishedAt: publicGraphData.publishedAt,
                publicPath: publicDir
            };
            
        } catch (error) {
            logDebug(`[publishGraph] Error publishing graph ${graphId}: ${error.message}`);
            throw new Error(`Failed to publish graph: ${error.message}`);
        }
    }
}

module.exports = GraphManager;

