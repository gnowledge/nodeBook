import { promises as fsp } from 'fs';
import path from 'path';
import { PolyNode, RelationNode, AttributeNode, FunctionNode } from './models.js';
import { getOperationsFromCnl } from './cnl-parser.js';

/**
 * Abstract Data Store Interface
 */
export class DataStore {
    constructor(type, options = {}) {
        if (this.constructor === DataStore) {
            throw new Error('DataStore is abstract and cannot be instantiated directly');
        }
        this.type = type;
        this.options = options;
    }

    // Abstract methods that must be implemented by subclasses
    async getGraph(userId, graphId) { throw new Error('getGraph must be implemented'); }
    async saveGraph(userId, graphId, data) { throw new Error('saveGraph must be implemented'); }
    async getCnl(userId, graphId) { throw new Error('getCnl must be implemented'); }
    async saveCnl(userId, graphId, cnlText) { throw new Error('saveCnl must be implemented'); }
    async deleteGraph(userId, graphId) { throw new Error('deleteGraph must be implemented'); }
    async listGraphs(userId) { throw new Error('listGraphs must be implemented'); }
    async getNodeRegistry(userId) { throw new Error('getNodeRegistry must be implemented'); }
    async saveNodeRegistry(userId, data) { throw new Error('saveNodeRegistry must be implemented'); }
    async addNodeToRegistry(userId, node) { throw new Error('addNodeToRegistry must be implemented'); }
    async getGraphRegistry(userId) { throw new Error('getGraphRegistry must be implemented'); }
    async saveGraphRegistry(userId, data) { throw new Error('saveGraphRegistry must be implemented'); }
    async updateGraphRegistry(userId, graphId, updates) { throw new Error('updateGraphRegistry must be implemented'); }
}

/**
 * File System Data Store Implementation
 */
export class FileSystemStore extends DataStore {
    constructor(dataPath = './data') {
        super('file-system', { dataPath });
        this.dataPath = dataPath;
    }

    async initialize() {
        try {
            await fsp.mkdir(this.dataPath, { recursive: true });
            await fsp.mkdir(path.join(this.dataPath, 'users'), { recursive: true });
            console.log(`[FileSystemStore] Initialized with data path: ${this.dataPath}`);
        } catch (error) {
            console.error(`[FileSystemStore] Initialization failed:`, error);
            throw error;
        }
    }

    getUserDataDir(userId) {
        return path.join(this.dataPath, 'users', userId.toString());
    }

    getGraphDataDir(userId, graphId) {
        return path.join(this.getUserDataDir(userId), 'graphs', graphId);
    }

    async ensureUserDataDir(userId) {
        const userDir = this.getUserDataDir(userId);
        await fsp.mkdir(userDir, { recursive: true });
        await fsp.mkdir(path.join(userDir, 'graphs'), { recursive: true });
        return userDir;
    }

    async ensureGraphDataDir(userId, graphId) {
        const graphDir = this.getGraphDataDir(userId, graphId);
        await fsp.mkdir(graphDir, { recursive: true });
        return graphDir;
    }

    // Graph operations
    async getGraph(userId, graphId) {
        const graphPath = path.join(this.getGraphDataDir(userId, graphId), 'graph.json');
        try {
            const data = await fsp.readFile(graphPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') return null;
            throw error;
        }
    }

    async saveGraph(userId, graphId, data) {
        await this.ensureGraphDataDir(userId, graphId);
        const graphPath = path.join(this.getGraphDataDir(userId, graphId), 'graph.json');
        await fsp.writeFile(graphPath, JSON.stringify(data, null, 2));
    }

    async getManifest(userId, graphId) {
        const manifestPath = path.join(this.getGraphDataDir(userId, graphId), 'manifest.json');
        try {
            const data = await fsp.readFile(manifestPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') return null;
            throw error;
        }
    }

    async saveManifest(userId, graphId, manifest) {
        await this.ensureGraphDataDir(userId, graphId);
        const manifestPath = path.join(this.getGraphDataDir(userId, graphId), 'manifest.json');
        await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    }

    async createManifest(userId, graphId, graphInfo, userInfo) {
        const manifest = {
            id: graphId,
            name: graphInfo.name || 'Untitled Graph',
            author: userInfo.username || 'Unknown',
            author_id: userId,
            email: userInfo.email || 'unknown@example.com',
            mode: graphInfo.mode || 'richgraph',
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString(),
            modified_by: userInfo.username || 'Unknown',
            modified_by_id: userId,
            version: 1,
            commit_message: 'Initial graph creation',
            description: graphInfo.description || null,
            publication_mode: graphInfo.publication_mode || 'Private',
            tags: graphInfo.tags || [],
            status: 'active'
        };
        
        await this.saveManifest(userId, graphId, manifest);
        return manifest;
    }

    async updateManifest(userId, graphId, userInfo, commitMessage = null) {
        let manifest = await this.getManifest(userId, graphId);
        
        if (!manifest) {
            // Create a new manifest for existing graphs that don't have one
            const graphRegistry = await this.getGraphRegistry(userId);
            const graphInfo = graphRegistry.find(g => g.id === graphId);
            
            if (!graphInfo) {
                throw new Error('Graph not found in registry');
            }
            
            manifest = await this.createManifest(userId, graphId, graphInfo, userInfo);
            console.log(`[DataStore] Created missing manifest for graph ${graphId}`);
        }

        manifest.modified_at = new Date().toISOString();
        manifest.modified_by = userInfo.username || 'Unknown';
        manifest.modified_by_id = userId;
        manifest.version += 1;
        manifest.commit_message = commitMessage || `CNL updated - version ${manifest.version}`;

        await this.saveManifest(userId, graphId, manifest);
        return manifest;
    }

    async regenerateGraphFromCnl(userId, graphId, cnlText) {
        // Parse CNL completely to get all operations
        const operations = getOperationsFromCnl(cnlText, 'richgraph');
        
        // Initialize empty graph data
        const graphData = {
            nodes: [],
            relations: [],
            attributes: []
        };

        // First pass: create all nodes
        for (const op of operations) {
            if (op.type === 'addNode') {
                // Create node with custom name if provided in options
                const nodeOptions = { ...op.payload.options };
                if (op.payload.displayName) {
                    nodeOptions.customName = op.payload.displayName;
                }
                const node = new PolyNode(op.payload.base_name, nodeOptions);
                
                // Override the name if we have a custom display name
                if (op.payload.displayName) {
                    node.name = op.payload.displayName;
                }
                
                // Set adjective if provided
                if (op.payload.options && op.payload.options.adjective) {
                    node.adjective = op.payload.options.adjective;
                }
                
                graphData.nodes.push(node);
            }
        }

        // Second pass: create relations and attributes, and link them to nodes
        for (const op of operations) {
            if (op.type === 'addRelation') {
                const relation = new RelationNode(op.payload.source, op.payload.target, op.payload.name, op.payload.options || {});
                graphData.relations.push(relation);
                
                // Link relation to source node's morph
                const sourceNode = graphData.nodes.find(n => n.id === op.payload.source);
                if (sourceNode && sourceNode.morphs.length > 0) {
                    sourceNode.morphs[0].relationNode_ids.push(relation.id);
                }
            } else if (op.type === 'addAttribute') {
                // Build options object with modifiers
                const options = {};
                if (op.payload.adverb) options.adverb = op.payload.adverb;
                if (op.payload.unit) options.unit = op.payload.unit;
                if (op.payload.modality) options.modality = op.payload.modality;
                if (op.payload.quantifier) options.quantifier = op.payload.quantifier;
                
                const attribute = new AttributeNode(op.payload.source, op.payload.name, op.payload.value, options);
                graphData.attributes.push(attribute);
                
                // Link attribute to source node's morph
                const sourceNode = graphData.nodes.find(n => n.id === op.payload.source);
                if (sourceNode && sourceNode.morphs.length > 0) {
                    sourceNode.morphs[0].attributeNode_ids.push(attribute.id);
                }
            } else if (op.type === 'updateNode') {
                // Handle node updates (like descriptions)
                const nodeIndex = graphData.nodes.findIndex(n => n.id === op.payload.id);
                if (nodeIndex >= 0) {
                    Object.assign(graphData.nodes[nodeIndex], op.payload.fields);
                }
            } else if (op.type === 'updateGraphDescription') {
                // Handle graph description updates
                graphData.description = op.payload.description;
            }
        }

        // Save the completely new graph data
        await this.saveGraph(userId, graphId, graphData);
        return graphData;
    }

    async getCnl(userId, graphId) {
        const cnlPath = path.join(this.getGraphDataDir(userId, graphId), 'graph.cnl');
        try {
            return await fsp.readFile(cnlPath, 'utf-8');
        } catch (error) {
            if (error.code === 'ENOENT') return '';
            throw error;
        }
    }

    async saveCnl(userId, graphId, cnlText) {
        await this.ensureGraphDataDir(userId, graphId);
        const cnlPath = path.join(this.getGraphDataDir(userId, graphId), 'graph.cnl');
        await fsp.writeFile(cnlPath, cnlText);
    }

    async deleteGraph(userId, graphId) {
        const graphDir = this.getGraphDataDir(userId, graphId);
        
        try {
            // First, get the graph data to analyze what needs to be cleaned up
            const graphData = await this.getGraph(userId, graphId);
            
            if (graphData && graphData.nodes) {
                // Clean up node registry - remove nodes that are only in this graph
                await this.cleanupNodeRegistry(userId, graphId, graphData.nodes);
            }
            
            // Remove the graph directory
            await fsp.rm(graphDir, { recursive: true, force: true });
            
            // Clean up graph registry
            await this.cleanupGraphRegistry(userId, graphId);
            
            console.log(`[DataStore] Graph ${graphId} deleted successfully for user ${userId}`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error(`[DataStore] Error deleting graph ${graphId}:`, error);
                throw error;
            }
        }
    }

    async listGraphs(userId) {
        const graphsDir = path.join(this.getUserDataDir(userId), 'graphs');
        try {
            const entries = await fsp.readdir(graphsDir, { withFileTypes: true });
            return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
        } catch (error) {
            if (error.code === 'ENOENT') return [];
            throw error;
        }
    }

    // Registry operations
    async getNodeRegistry(userId) {
        const registryPath = path.join(this.getUserDataDir(userId), 'node_registry.json');
        try {
            const data = await fsp.readFile(registryPath, 'utf-8');
            if (!data || data.trim() === '') return [];
            const parsed = JSON.parse(data);
            // Ensure we always return an array
            if (Array.isArray(parsed)) {
                return parsed;
            } else {
                // If it's not an array, initialize with empty array and save it
                await this.saveNodeRegistry(userId, []);
                return [];
            }
        } catch (error) {
            if (error.code === 'ENOENT') return [];
            throw error;
        }
    }

    async saveNodeRegistry(userId, data) {
        await this.ensureUserDataDir(userId);
        const registryPath = path.join(this.getUserDataDir(userId), 'node_registry.json');
        await fsp.writeFile(registryPath, JSON.stringify(data, null, 2));
    }

    async addNodeToRegistry(userId, node) {
        const registry = await this.getNodeRegistry(userId);
        const existingIndex = registry.findIndex(n => n.id === node.id);
        
        // Extract relevant fields for registry storage
        const registryEntry = {
            id: node.id,
            base_name: node.base_name,
            name: node.name,
            adjective: node.adjective,
            quantifier: node.quantifier,
            role: node.role,
            description: node.description,
            parent_types: node.parent_types || [],
            publication_mode: node.publication_mode || 'Private'
        };
        
        if (existingIndex >= 0) {
            registry[existingIndex] = { ...registry[existingIndex], ...registryEntry };
        } else {
            registry.push(registryEntry);
        }
        
        await this.saveNodeRegistry(userId, registry);
        return registryEntry;
    }

    async getGraphRegistry(userId) {
        const registryPath = path.join(this.getUserDataDir(userId), 'registry.json');
        try {
            const data = await fsp.readFile(registryPath, 'utf-8');
            if (!data || data.trim() === '') return [];
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') return [];
            throw error;
        }
    }

    async saveGraphRegistry(userId, data) {
        await this.ensureUserDataDir(userId);
        const registryPath = path.join(this.getUserDataDir(userId), 'registry.json');
        await fsp.writeFile(registryPath, JSON.stringify(data, null, 2));
    }

    async updateGraphRegistry(userId, graphId, updates) {
        const registry = await this.getGraphRegistry(userId);
        const graphIndex = registry.findIndex(g => g.id === graphId);
        
        if (graphIndex >= 0) {
            registry[graphIndex] = { ...registry[graphIndex], ...updates };
        } else {
            registry.push({ id: graphId, ...updates });
        }
        
        await this.saveGraphRegistry(userId, registry);
        return registry;
    }

    async cleanupNodeRegistry(userId, graphId, nodes) {
        const nodeRegistry = await this.getNodeRegistry(userId);
        const graphRegistry = await this.getGraphRegistry(userId);
        
        // For each node in the deleted graph
        for (const node of nodes) {
            const nodeId = node.id;
            
            // Check if this node exists in other graphs
            let nodeExistsInOtherGraphs = false;
            
            for (const graph of graphRegistry) {
                if (graph.id !== graphId) {
                    try {
                        const otherGraphData = await this.getGraph(userId, graph.id);
                        if (otherGraphData && otherGraphData.nodes) {
                            const nodeExists = otherGraphData.nodes.some(n => n.id === nodeId);
                            if (nodeExists) {
                                nodeExistsInOtherGraphs = true;
                                break;
                            }
                        }
                    } catch (error) {
                        console.warn(`[DataStore] Could not check graph ${graph.id} for node ${nodeId}:`, error);
                    }
                }
            }
            
            // If node doesn't exist in other graphs, remove it from registry
            if (!nodeExistsInOtherGraphs) {
                const nodeIndex = nodeRegistry.findIndex(n => n.id === nodeId);
                if (nodeIndex >= 0) {
                    console.log(`[DataStore] Removing node ${nodeId} from registry (not used in other graphs)`);
                    nodeRegistry.splice(nodeIndex, 1);
                }
            } else {
                console.log(`[DataStore] Keeping node ${nodeId} in registry (used in other graphs)`);
            }
        }
        
        await this.saveNodeRegistry(userId, nodeRegistry);
    }

    async cleanupGraphRegistry(userId, graphId) {
        const graphRegistry = await this.getGraphRegistry(userId);
        const graphIndex = graphRegistry.findIndex(g => g.id === graphId);
        
        if (graphIndex >= 0) {
            console.log(`[DataStore] Removing graph ${graphId} from registry`);
            graphRegistry.splice(graphIndex, 1);
            await this.saveGraphRegistry(userId, graphRegistry);
        }
    }

    async registerNodeInGraph(userId, nodeId, graphId) {
        // This method is a stub for now - in a real implementation,
        // it would track which nodes belong to which graphs
        console.log(`[DataStore] Registering node ${nodeId} in graph ${graphId} for user ${userId}`);
        return true;
    }

    // Create a graph object with methods that use DataStore internally
    async createGraphObject(userId, graphId, graphData = null) {
        if (!graphData) {
            graphData = await this.getGraph(userId, graphId) || { nodes: [], relations: [], attributes: [] };
        }

        const self = this; // Capture the DataStore instance

        return {
            // Graph data
            nodes: graphData.nodes || [],
            relations: graphData.relations || [],
            attributes: graphData.attributes || [],

            // Graph methods
            async addNode(baseName, options) {
                const node = new PolyNode(baseName, options);
                graphData.nodes.push(node);
                return node;
            },

            async deleteNode(id) {
                const index = graphData.nodes.findIndex(n => n.id === id);
                if (index >= 0) {
                    graphData.nodes[index].isDeleted = true;
                }
            },

            async addRelation(source, target, name, options = {}) {
                const relation = new RelationNode(source, target, name, options);
                graphData.relations.push(relation);
                return relation;
            },

            async deleteRelation(id) {
                const index = graphData.relations.findIndex(r => r.id === id);
                if (index >= 0) {
                    graphData.relations[index].isDeleted = true;
                }
            },

            async addAttribute(source, name, value, options = {}) {
                const attribute = new AttributeNode(source, name, value, options);
                graphData.attributes.push(attribute);
                return attribute;
            },

            async addFunction(source, name, value, expression, options = {}) {
                const functionNode = new FunctionNode(source, name, value, expression, options);
                graphData.attributes.push(functionNode);
                return functionNode;
            },

            async deleteAttribute(id) {
                const index = graphData.attributes.findIndex(a => a.id === id);
                if (index >= 0) {
                    graphData.attributes[index].isDeleted = true;
                }
            },

            async updateNode(id, fields) {
                const node = graphData.nodes.find(n => n.id === id);
                if (node) {
                    Object.assign(node, fields);
                }
            },

            async getNode(id) {
                return graphData.nodes.find(n => n.id === id);
            },

            async listAll(type) {
                return graphData[type] || [];
            },

            // Save method to persist changes
            async save() {
                await self.saveGraph(userId, graphId, graphData);
            }
        };
    }
}

/**
 * LibP2P Data Store Implementation (Stub for Phase 2)
 */
export class LibP2PStore extends DataStore {
    constructor(options = {}) {
        super('libp2p', options);
        this.isInitialized = false;
    }

    async initialize() {
        console.log('[LibP2PStore] Initialization stub - will be implemented in Phase 2');
        this.isInitialized = true;
    }

    // Stub implementations that will be completed in Phase 2
    async getGraph(userId, graphId) { throw new Error('LibP2P store not implemented yet - Phase 2'); }
    async saveGraph(userId, graphId, data) { throw new Error('LibP2P store not implemented yet - Phase 2'); }
    async getCnl(userId, graphId) { throw new Error('LibP2P store not implemented yet - Phase 2'); }
    async saveCnl(userId, graphId, cnlText) { throw new Error('LibP2P store not implemented yet - Phase 2'); }
    async deleteGraph(userId, graphId) { throw new Error('LibP2P store not implemented yet - Phase 2'); }
    async listGraphs(userId) { throw new Error('LibP2P store not implemented yet - Phase 2'); }
    async getNodeRegistry(userId) { throw new Error('LibP2P store not implemented yet - Phase 2'); }
    async saveNodeRegistry(userId, data) { throw new Error('LibP2P store not implemented yet - Phase 2'); }
    async addNodeToRegistry(userId, node) { throw new Error('LibP2P store not implemented yet - Phase 2'); }
    async getGraphRegistry(userId) { throw new Error('LibP2P store not implemented yet - Phase 2'); }
    async saveGraphRegistry(userId, data) { throw new Error('LibP2P store not implemented yet - Phase 2'); }
    async updateGraphRegistry(userId, graphId, updates) { throw new Error('LibP2P store not implemented yet - Phase 2'); }
}

/**
 * Factory function to create the appropriate data store
 */
export function createDataStore(type = 'file-system', options = {}) {
    switch (type) {
        case 'file-system':
            return new FileSystemStore(options.dataPath);
        case 'libp2p':
            return new LibP2PStore(options);
        default:
            throw new Error(`Unknown data store type: ${type}`);
    }
}

export default createDataStore;
