const fsp = require('fs').promises;
const path = require('path');
const SimpleGraph = require('./simple-graph');

const DEBUG_LOG_FILE = '/tmp/nodebook-debug.log';

// Helper function for logging
const logDebug = (message) => {
    // Use fs.promises.appendFile for async logging
    fsp.appendFile(DEBUG_LOG_FILE, `[${new Date().toISOString()}] ${message}\n`).catch(console.error);
};

// Clear the log file at the start of the module load
fsp.writeFile(DEBUG_LOG_FILE, '').catch(console.error);
logDebug('SimpleGraphManager module loaded.');

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

class SimpleGraphManager {
    constructor() {
        this.BASE_DATA_DIR = null;
        this.activeGraphs = new Map();
        this.collaborationSessions = new Map(); // Track active collaboration sessions
        logDebug('SimpleGraphManager instance created.');
    }

    async initialize(dataPath) {
        this.BASE_DATA_DIR = dataPath || path.join(__dirname, 'graphs');
        logDebug(`Initializing with BASE_DATA_DIR: ${this.BASE_DATA_DIR}`);
        
        // Create base data directory
        await fsp.mkdir(this.BASE_DATA_DIR, { recursive: true });
        
        // Create users directory
        const usersDir = path.join(this.BASE_DATA_DIR, 'users');
        await fsp.mkdir(usersDir, { recursive: true });
        
        // Create collaboration sessions directory
        const sessionsDir = path.join(this.BASE_DATA_DIR, 'collaboration_sessions');
        await fsp.mkdir(sessionsDir, { recursive: true });
        
        logDebug('SimpleGraphManager initialized with user data segregation and collaboration support.');
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
            nodeRegistry: path.join(userDataDir, 'node_registry.json'),
            collaborationRegistry: path.join(userDataDir, 'collaboration_registry.json')
        };
    }

    // Ensure user data directory exists
    async ensureUserDataDir(userId) {
        const userDataDir = this.getUserDataDir(userId);
        const { graphRegistry, nodeRegistry, collaborationRegistry } = this.getUserRegistryFiles(userId);
        
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
        
        // Initialize user's collaboration registry if it doesn't exist
        try {
            await fsp.access(collaborationRegistry);
        } catch {
            await writeJsonFile(collaborationRegistry, []);
        }
        
        return userDataDir;
    }

    async getGraphRegistry(userId) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        
        const { graphRegistry } = this.getUserRegistryFiles(userId);
        const registry = await readJsonFile(graphRegistry);
        return registry || [];
    }

    async updateGraphRegistry(userId, graphId, updates) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        
        const { graphRegistry } = this.getUserRegistryFiles(userId);
        const registry = await this.getGraphRegistry(userId);
        
        const graphIndex = registry.findIndex(g => g.id === graphId);
        if (graphIndex !== -1) {
            registry[graphIndex] = { ...registry[graphIndex], ...updates };
        } else {
            registry.push({ id: graphId, ...updates });
        }
        
        await writeJsonFile(graphRegistry, registry);
        return registry;
    }

    async getNodeRegistry(userId) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        
        const { nodeRegistry } = this.getUserRegistryFiles(userId);
        const registry = await readJsonFile(nodeRegistry);
        return registry || {};
    }

    async updateNodeRegistry(userId, nodeId, updates) {
        if (!userId) {
            throw new Error('User ID is required for data segregation');
        }
        
        const { nodeRegistry } = this.getUserRegistryFiles(userId);
        const registry = await this.getNodeRegistry(userId);
        
        registry[nodeId] = { ...registry[nodeId], ...updates };
        await writeJsonFile(nodeRegistry, registry);
        return registry;
    }

    // Create a new graph
    async createGraph(userId, graphName, options = {}) {
        await this.ensureUserDataDir(userId);
        
        const graphId = this.generateGraphId();
        const storagePath = path.join(this.getUserDataDir(userId), 'graphs', graphId);
        
        // Create graph storage directory
        await fsp.mkdir(storagePath, { recursive: true });
        
        // Create simple graph instance
        const graph = await SimpleGraph.create(storagePath, graphId);
        
        // Store graph metadata
        const graphMetadata = {
            id: graphId,
            name: graphName,
            userId: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            storagePath: storagePath,
            graphId: graph.key,
            ...options
        };
        
        // Update registry
        await this.updateGraphRegistry(userId, graphId, graphMetadata);
        
        // Store active graph reference - use both the generated graphId and the graph.key for lookup
        this.activeGraphs.set(graphId, graph);
        this.activeGraphs.set(graph.key, graph); // Also store by graph.key for compatibility
        
        logDebug(`Created new graph: ${graphId} for user: ${userId}`);
        return graph;
    }

    // Get an existing graph
    async getGraph(userId, graphId, GraphClass = SimpleGraph) {
        if (!userId || !graphId) {
            throw new Error('User ID and Graph ID are required');
        }
        
        // Check if graph is already active
        if (this.activeGraphs.has(graphId)) {
            return this.activeGraphs.get(graphId);
        }
        
        // Get graph metadata from registry
        const registry = await this.getGraphRegistry(userId);
        const graphMetadata = registry.find(g => g.id === graphId);
        
        if (!graphMetadata) {
            logDebug(`Graph not found in registry: ${graphId} for user: ${userId}`);
            return null;
        }
        
        // Check if storage path exists
        if (!graphMetadata.storagePath) {
            logDebug(`No storage path found for graph: ${graphId}`);
            return null;
        }
        
        try {
            // Create simple graph instance from existing data
            const graph = await SimpleGraph.create(graphMetadata.storagePath, graphId);
            
            // Store active graph reference
            this.activeGraphs.set(graphId, graph);
            
            logDebug(`Successfully loaded graph: ${graphId} for user: ${userId}`);
            return graph;
        } catch (error) {
            logDebug(`Error loading graph ${graphId}: ${error.message}`);
            throw error;
        }
    }

    // List all graphs for a user
    async listGraphs(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }
        
        const registry = await this.getGraphRegistry(userId);
        return registry.map(graph => ({
            id: graph.id,
            name: graph.name,
            createdAt: graph.createdAt,
            updatedAt: graph.updatedAt,
            graphId: graph.graphId
        }));
    }

    // Delete a graph
    async deleteGraph(userId, graphId) {
        if (!userId || !graphId) {
            throw new Error('User ID and Graph ID are required');
        }
        
        // Remove from active graphs
        if (this.activeGraphs.has(graphId)) {
            const graph = this.activeGraphs.get(graphId);
            await graph.destroy();
            this.activeGraphs.delete(graphId);
        }
        
        // Remove from registry
        const registry = await this.getGraphRegistry(userId);
        const updatedRegistry = registry.filter(g => g.id !== graphId);
        
        const { graphRegistry } = this.getUserRegistryFiles(userId);
        await writeJsonFile(graphRegistry, updatedRegistry);
        
        // Remove storage directory
        const graphMetadata = registry.find(g => g.id === graphId);
        if (graphMetadata && graphMetadata.storagePath) {
            try {
                await fsp.rm(graphMetadata.storagePath, { recursive: true, force: true });
            } catch (error) {
                logDebug(`Error removing graph storage: ${error.message}`);
            }
        }
        
        logDebug(`Deleted graph: ${graphId} for user: ${userId}`);
        return true;
    }

    // Collaboration methods
    async createCollaborationSession(graphId, userId, permissions = { edit: false, view: true }) {
        const graph = this.activeGraphs.get(graphId);
        if (!graph) {
            throw new Error('Graph not found or not active');
        }
        
        const shareLink = await graph.createShareLink(permissions);
        
        // Store collaboration session
        const sessionId = this.generateSessionId();
        const session = {
            id: sessionId,
            graphId,
            userId,
            shareLink,
            createdAt: new Date().toISOString(),
            activeCollaborators: []
        };
        
        this.collaborationSessions.set(sessionId, session);
        
        // Update collaboration registry
        const { collaborationRegistry } = this.getUserRegistryFiles(userId);
        const registry = await readJsonFile(collaborationRegistry) || [];
        registry.push(session);
        await writeJsonFile(collaborationRegistry, registry);
        
        return {
            sessionId,
            shareLink,
            collaborationUrl: `/collaborate/${graphId}?share=${shareLink.id}`
        };
    }

    async joinCollaborationSession(shareId, userId, permissions) {
        // Find session by share ID
        let targetSession = null;
        let targetGraph = null;
        
        for (const [sessionId, session] of this.collaborationSessions.entries()) {
            if (session.shareLink.id === shareId) {
                targetSession = session;
                targetGraph = this.activeGraphs.get(session.graphId);
                break;
            }
        }
        
        if (!targetSession || !targetGraph) {
            throw new Error('Collaboration session not found');
        }
        
        // Add user as collaborator
        await targetGraph.addCollaborator(shareId, userId, permissions);
        
        // Update session
        targetSession.activeCollaborators.push({
            userId,
            permissions,
            joinedAt: new Date().toISOString()
        });
        
        return {
            sessionId: targetSession.id,
            graphId: targetSession.graphId,
            permissions
        };
    }

    async leaveCollaborationSession(sessionId, userId) {
        const session = this.collaborationSessions.get(sessionId);
        if (!session) {
            throw new Error('Collaboration session not found');
        }
        
        const graph = this.activeGraphs.get(session.graphId);
        if (graph) {
            await graph.removeCollaborator(userId);
        }
        
        // Remove user from active collaborators
        session.activeCollaborators = session.activeCollaborators.filter(
            c => c.userId !== userId
        );
        
        // If no more collaborators, close session
        if (session.activeCollaborators.length === 0) {
            this.collaborationSessions.delete(sessionId);
        }
        
        return true;
    }

    async getCollaborationStatus(graphId) {
        const graph = this.activeGraphs.get(graphId);
        if (!graph) {
            return null;
        }
        
        return await graph.getCollaborationStatus();
    }

    // Utility methods
    generateGraphId() {
        return 'graph_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    }

    // Cleanup method
    async cleanup() {
        // Destroy all active graphs
        for (const [graphId, graph] of this.activeGraphs.entries()) {
            try {
                await graph.destroy();
            } catch (error) {
                logDebug(`Error destroying graph ${graphId}: ${error.message}`);
            }
        }
        
        this.activeGraphs.clear();
        this.collaborationSessions.clear();
        
        logDebug('SimpleGraphManager cleanup completed.');
    }
}

module.exports = SimpleGraphManager;
