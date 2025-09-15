import { promises as fsp } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PolyNode, RelationNode, AttributeNode, FunctionNode } from './models.js';
import { getOperationsFromCnl } from './cnl-parser.js';
import { GitVersionControl } from './version-control.js';
import { MorphRegistry } from './morph-registry.js';

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
        this.gitVersionControl = new GitVersionControl(dataPath);
        this.morphRegistry = new MorphRegistry();
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
            const graphData = JSON.parse(data);
            
            // Build morph registry when loading graph
            this.buildMorphRegistry(graphData);
            
            return graphData;
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
        
        // Get the latest Git commit hash instead of incrementing version number
        try {
            const latestCommit = await this.gitVersionControl.getLatestCommit(userId, graphId);
            if (latestCommit) {
                manifest.version = latestCommit.hash;
                manifest.commit_message = latestCommit.message || commitMessage || 'CNL processed and committed';
            } else {
                // Fallback to linear version if Git is not available
                manifest.version = (manifest.version || 0) + 1;
                manifest.commit_message = commitMessage || `CNL updated - version ${manifest.version}`;
            }
        } catch (error) {
            console.warn(`[DataStore] Failed to get Git commit hash for manifest:`, error);
            // Fallback to linear version
            manifest.version = (manifest.version || 0) + 1;
            manifest.commit_message = commitMessage || `CNL updated - version ${manifest.version}`;
        }

        await this.saveManifest(userId, graphId, manifest);
        return manifest;
    }

    async regenerateGraphFromCnl(userId, graphId, cnlText) {
        // Get the graph mode from the manifest
        const manifest = await this.getManifest(userId, graphId);
        const graphMode = manifest?.mode || 'richgraph';
        
        console.log(`[DataStore] Regenerating graph ${graphId} in mode: ${graphMode}`);
        
        // Parse CNL completely to get all operations
        const operations = getOperationsFromCnl(cnlText, graphMode);
        
        // Get the current node registry to check for existing nodes
        const nodeRegistry = await this.getNodeRegistry(userId);
        
        // Initialize empty graph data
        const graphData = {
            nodes: [],
            relations: [],
            attributes: []
        };

        // SYSTEMATIC APPROACH:
        // 1. First pass: Create only explicit nodes from CNL headings (not relation targets)
        console.log(`[DataStore] First pass: Creating explicit nodes from CNL headings`);
        const explicitNodeOps = operations.filter(op => op.type === 'addNode' && op.payload.role !== 'class');
        
        for (const op of explicitNodeOps) {
            const nodeId = op.id;
            const baseName = op.payload.base_name;
            const displayName = op.payload.displayName;
            const adjective = op.payload.options?.adjective;
            
            // Check if node already exists in the global registry
            let existingNode = null;
            if (nodeRegistry[nodeId]) {
                // Node exists globally, check if it's already in this graph
                const isInCurrentGraph = nodeRegistry[nodeId].graph_ids.includes(graphId);
                if (isInCurrentGraph) {
                    // Node already exists in this graph, reuse it
                    console.log(`[DataStore] Reusing existing node ${nodeId} in graph ${graphId}`);
                    existingNode = nodeRegistry[nodeId];
                } else {
                    // Node exists in other graphs, register it in this graph too
                    console.log(`[DataStore] Registering existing node ${nodeId} in graph ${graphId}`);
                    await this.registerNodeInGraph(userId, nodeId, graphId);
                }
            } else {
                // Node doesn't exist globally, create and register it
                console.log(`[DataStore] Creating new explicit node ${nodeId} and registering globally`);
                await this.addNodeToRegistry(userId, {
                    id: nodeId,
                    base_name: baseName,
                    name: displayName || baseName,
                    adjective: adjective,
                    role: op.payload.role || 'individual',
                    description: null,
                    parent_types: op.payload.parent_types || [],
                    publication_mode: 'Private'
                });
                await this.registerNodeInGraph(userId, nodeId, graphId);
            }
            
            // Create the actual node instance
            const nodeOptions = { ...op.payload.options };
            if (displayName) {
                nodeOptions.customName = displayName;
            }
            const node = new PolyNode(baseName, nodeOptions);
            
            // Override the name if we have a custom display name
            if (displayName) {
                node.name = displayName;
            }
            
            // Set adjective if provided
            if (adjective) {
                node.adjective = adjective;
            }
            
            graphData.nodes.push(node);
        }

        // 2. Second pass: Read relations, extract target nodes, and create missing target nodes
        console.log(`[DataStore] Second pass: Processing relations and creating missing target nodes`);
        const relationOps = operations.filter(op => op.type === 'addRelation');
        
        // Collect all unique target nodes from relations
        const targetNodeIds = new Set();
        for (const op of relationOps) {
            targetNodeIds.add(op.payload.target);
        }
        
        // Create missing target nodes (only once per unique target)
        for (const targetId of targetNodeIds) {
            // Check if target node exists in current graph
            const targetExists = graphData.nodes.some(n => n.id === targetId);
            
            if (!targetExists) {
                console.log(`[DataStore] Creating missing target node: ${targetId}`);
                
                // Parse target ID to extract adjective and base name (reverse of ID generation)
                let adjective = null;
                let baseName = targetId;
                
                // Check if target ID contains an underscore (indicating adjective_baseName format)
                const underscoreIndex = targetId.lastIndexOf('_');
                if (underscoreIndex > 0) {
                    const potentialAdjective = targetId.substring(0, underscoreIndex);
                    const potentialBaseName = targetId.substring(underscoreIndex + 1);
                    
                    // Check if this looks like adjective_baseName (baseName should be plural or common)
                    if (potentialBaseName.endsWith('s') || potentialBaseName === 'node' || potentialBaseName === 'edge' || 
                        potentialBaseName === 'attribute' || potentialBaseName === 'relation' || 
                        potentialBaseName === 'language' || potentialBaseName === 'state') {
                        adjective = potentialAdjective;
                        baseName = potentialBaseName;
                    }
                }
                
                // Generate display name from parsed components
                const displayName = adjective ? `*${adjective}* ${baseName.charAt(0).toUpperCase() + baseName.slice(1)}` : baseName.charAt(0).toUpperCase() + baseName.slice(1);
                const formattedBaseName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
                
                // Check if target node exists globally
                if (nodeRegistry[targetId]) {
                    // Target exists globally, register it in this graph
                    console.log(`[DataStore] Registering existing target node ${targetId} in graph ${graphId}`);
                    await this.registerNodeInGraph(userId, targetId, graphId);
                } else {
                    // Target doesn't exist globally, create and register it
                    console.log(`[DataStore] Creating new target node ${targetId} and registering globally`);
                    await this.addNodeToRegistry(userId, {
                        id: targetId,
                        base_name: formattedBaseName,
                        name: displayName,
                        adjective: adjective,
                        role: 'class', // Default role for implicit target nodes
                        description: null,
                        parent_types: [],
                        publication_mode: 'Private'
                    });
                    await this.registerNodeInGraph(userId, targetId, graphId);
                }
                
                // Create the actual target node instance
                const targetNode = new PolyNode(formattedBaseName, {
                    role: 'class',
                    customName: displayName
                });
                targetNode.id = targetId;
                targetNode.name = displayName;
                if (adjective) {
                    targetNode.adjective = adjective;
                }
                
                graphData.nodes.push(targetNode);
            }
        }

        // 3. Third pass: Create relations and attributes, and link them to nodes
        console.log(`[DataStore] Third pass: Creating relations and attributes`);
        for (const op of operations) {
            if (op.type === 'addMorph') {
                // Add morph to the specified node
                const node = graphData.nodes.find(n => n.id === op.payload.nodeId);
                if (node) {
                    node.morphs.push(op.payload.morph);
                    console.log(`[DataStore] Added morph ${op.payload.morph.name} to node ${op.payload.nodeId}`);
                }
            } else if (op.type === 'addRelation') {
                const relation = new RelationNode(op.payload.source, op.payload.target, op.payload.name, op.payload.options || {});
                graphData.relations.push(relation);
                
                // Link relation to source node's morph
                const sourceNode = graphData.nodes.find(n => n.id === op.payload.source);
                if (sourceNode) {
                    // If morphId is specified, link to that specific morph
                    if (op.payload.morphId) {
                        const targetMorph = sourceNode.morphs.find(m => m.morph_id === op.payload.morphId);
                        if (targetMorph) {
                            targetMorph.relationNode_ids.push(relation.id);
                        }
                    } else if (sourceNode.morphs.length > 0) {
                        // Default to first morph if no specific morph ID
                        sourceNode.morphs[0].relationNode_ids.push(relation.id);
                    }
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
                if (sourceNode) {
                    // If morphId is specified, link to that specific morph
                    if (op.payload.morphId) {
                        const targetMorph = sourceNode.morphs.find(m => m.morph_id === op.payload.morphId);
                        if (targetMorph) {
                            targetMorph.attributeNode_ids.push(attribute.id);
                        }
                    } else if (sourceNode.morphs.length > 0) {
                        // Default to first morph if no specific morph ID
                        sourceNode.morphs[0].attributeNode_ids.push(attribute.id);
                    }
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
            } else if (op.type === 'changeMorph') {
                // Handle morph transitions - update nbh reference
                const node = graphData.nodes.find(n => n.id === op.payload.nodeId);
                if (node) {
                    const targetMorph = node.morphs.find(m => m.morph_id === op.payload.morphId);
                    if (targetMorph) {
                        node.nbh = op.payload.morphId;
                        console.log(`[DataStore] Changed node ${op.payload.nodeId} to morph ${targetMorph.name}`);
                    }
                }
            }
        }

        // Save the completely new graph data
        await this.saveGraph(userId, graphId, graphData);
        
        // Commit the processed CNL changes to Git
        try {
            const userInfo = await this.getUserInfo(userId);
            const userName = userInfo?.name || 'Unknown';
            const userEmail = userInfo?.email || 'unknown@example.com';
            
            // Initialize version control if not already done
            await this.initializeVersionControl(userId, graphId, userName, userEmail);
            
            // Commit with descriptive message
            const commitMessage = `Processed CNL: ${this.generateCommitMessage(cnlText)}`;
            await this.commitVersion(userId, graphId, commitMessage, null, userName, userEmail);
            console.log(`[DataStore] Git commit created for graph ${graphId}: ${commitMessage}`);
        } catch (error) {
            console.warn(`[DataStore] Failed to commit processed CNL for graph ${graphId}:`, error);
        }
        
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
        const graphDir = this.getGraphDataDir(userId, graphId);
        const cnlPath = path.join(graphDir, 'graph.cnl');
        await fsp.writeFile(cnlPath, cnlText);
        
        // Ensure git repo exists (fallback in case init on create was skipped)
        try {
            const initialized = await this.initializeVersionControl(userId, graphId);
            if (!initialized) {
                console.warn(`[DataStore] Git initialization skipped or failed for graph ${graphId}`);
            }
        } catch (e) {
            console.warn(`[DataStore] Error ensuring version control on save for ${graphId}:`, e);
        }
        
        // No auto-commit on save - only on submit
        console.log(`[DataStore] CNL saved for graph ${graphId} (no Git commit)`);
    }

    async deleteGraph(userId, graphId) {
        const graphDir = this.getGraphDataDir(userId, graphId);
        
        try {
            // First, get the graph data to analyze what needs to be cleaned up
            const graphData = await this.getGraph(userId, graphId);
            
            // Clean up node registry if graph data exists and has nodes
            if (graphData && graphData.nodes && Array.isArray(graphData.nodes) && graphData.nodes.length > 0) {
                console.log(`[DataStore] Cleaning up ${graphData.nodes.length} nodes for graph ${graphId}`);
                await this.cleanupNodeRegistry(userId, graphId, graphData.nodes);
            } else {
                console.log(`[DataStore] No nodes to clean up for graph ${graphId}`);
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
            if (!data || data.trim() === '') return {};
            const parsed = JSON.parse(data);
            // Ensure we always return an object
            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed;
            } else {
                // If it's not an object, initialize with empty object and save it
                await this.saveNodeRegistry(userId, {});
                return {};
            }
        } catch (error) {
            if (error.code === 'ENOENT') return {};
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
            publication_mode: node.publication_mode || 'Private',
            graph_ids: [] // Initialize empty graph_ids array
        };
        
        if (registry[node.id]) {
            // Node exists, update it but preserve graph_ids
            registry[node.id] = { ...registry[node.id], ...registryEntry, graph_ids: registry[node.id].graph_ids || [] };
        } else {
            // New node
            registry[node.id] = registryEntry;
        }
        
        await this.saveNodeRegistry(userId, registry);
        return registry[node.id];
    }

    async registerNodeInGraph(userId, nodeId, graphId) {
        const registry = await this.getNodeRegistry(userId);
        
        if (registry[nodeId]) {
            if (!registry[nodeId].graph_ids) {
                registry[nodeId].graph_ids = [];
            }
            if (!registry[nodeId].graph_ids.includes(graphId)) {
                registry[nodeId].graph_ids.push(graphId);
                await this.saveNodeRegistry(userId, registry);
            }
        }
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
    
    async changeMorph(userId, graphId, nodeId, morphId) {
        const graphData = await this.getGraph(userId, graphId);
        if (!graphData) {
            throw new Error('Graph not found');
        }
        
        const node = graphData.nodes.find(n => n.id === nodeId);
        if (!node) {
            throw new Error('Node not found');
        }
        
        const targetMorph = node.morphs.find(m => m.morph_id === morphId);
        if (!targetMorph) {
            throw new Error('Morph not found');
        }
        
        // Update the nbh reference
        node.nbh = morphId;
        
        // Save the updated graph
        await this.saveGraph(userId, graphId, graphData);
        
        // Rebuild morph registry after morph change
        this.buildMorphRegistry(graphData);
        
        console.log(`[DataStore] Changed node ${nodeId} to morph ${targetMorph.name}`);
        return { success: true, morphName: targetMorph.name };
    }

    // --- Morph Registry Methods ---
    
    /**
     * Build morph registry from graph data
     * @param {Object} graphData - Graph data object
     */
    buildMorphRegistry(graphData) {
        this.morphRegistry.clear();
        
        // Process each node and its morphs
        graphData.nodes.forEach(node => {
            if (node.morphs && node.morphs.length > 0) {
                node.morphs.forEach(morph => {
                    this.morphRegistry.addMorph(
                        morph.morph_id,
                        node.id,
                        morph.name,
                        morph.relationNode_ids || [],
                        morph.attributeNode_ids || []
                    );
                });
            }
        });
        
        const stats = this.morphRegistry.getStats();
        console.log(`[DataStore] Built morph registry with ${stats.totalMorphs} morphs for ${stats.totalNodes} nodes`);
    }

    /**
     * Get filtered relations for a specific morph
     * @param {Array} relations - All relations
     * @param {string} morphId - Active morph ID
     * @returns {Array} Filtered relations
     */
    getFilteredRelations(relations, morphId) {
        return this.morphRegistry.filterRelationsForMorph(relations, morphId);
    }

    /**
     * Get filtered attributes for a specific morph
     * @param {Array} attributes - All attributes
     * @param {string} morphId - Active morph ID
     * @returns {Array} Filtered attributes
     */
    getFilteredAttributes(attributes, morphId) {
        return this.morphRegistry.filterAttributesForMorph(attributes, morphId);
    }

    /**
     * Get morph data by ID
     * @param {string} morphId - Morph ID
     * @returns {Object|null} Morph data
     */
    getMorphData(morphId) {
        return this.morphRegistry.getMorph(morphId);
    }

    /**
     * Get all morphs for a node
     * @param {string} nodeId - Node ID
     * @returns {Array} Array of morph data
     */
    getNodeMorphs(nodeId) {
        return this.morphRegistry.getNodeMorphs(nodeId);
    }

    // --- Collaboration (Invites) ---
    getCollabInvitesPath(ownerId) {
        return path.join(this.getUserDataDir(ownerId), 'collab_invites.json');
    }

    async getCollabInvites(ownerId) {
        const file = this.getCollabInvitesPath(ownerId);
        try {
            const raw = await fsp.readFile(file, 'utf-8');
            if (!raw || raw.trim() === '') return {};
            return JSON.parse(raw);
        } catch (e) {
            if (e.code === 'ENOENT') return {};
            throw e;
        }
    }

    async saveCollabInvites(ownerId, invitesByGraph) {
        await this.ensureUserDataDir(ownerId);
        const file = this.getCollabInvitesPath(ownerId);
        await fsp.writeFile(file, JSON.stringify(invitesByGraph, null, 2));
    }

    async addCollabInvite(ownerId, graphId, role = 'view', expiresAt = null) {
        if (!['view', 'edit'].includes(role)) {
            throw new Error('Invalid collaboration role');
        }
        const invites = await this.getCollabInvites(ownerId);
        const token = crypto.randomBytes(16).toString('hex');
        const invite = {
            token,
            role,
            createdAt: new Date().toISOString(),
            expiresAt
        };
        if (!invites[graphId]) invites[graphId] = [];
        invites[graphId].push(invite);
        await this.saveCollabInvites(ownerId, invites);
        return invite;
    }

    async validateCollabInvite(ownerId, graphId, token) {
        if (!token) return null;
        const invites = await this.getCollabInvites(ownerId);
        const list = invites[graphId] || [];
        const found = list.find(i => i && i.token === token);
        if (!found) return null;
        if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) return null;
        return { role: found.role, token: found.token };
    }

    async findCollabByToken(token) {
        if (!token) return null;
        // Scan all users for the token (small scale acceptable)
        const usersDir = path.join(this.dataPath, 'users');
        let userIds = [];
        try {
            userIds = await fsp.readdir(usersDir);
        } catch (e) {
            return null;
        }
        for (const uid of userIds) {
            const invites = await this.getCollabInvites(uid).catch(() => ({}));
            for (const [graphId, list] of Object.entries(invites)) {
                const found = Array.isArray(list) ? list.find(i => i && i.token === token) : null;
                if (found) {
                    if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) continue;
                    return { ownerId: uid, graphId, role: found.role };
                }
            }
        }
        return null;
    }

    async cleanupNodeRegistry(userId, graphId, nodes) {
        const nodeRegistry = await this.getNodeRegistry(userId);
        const graphRegistry = await this.getGraphRegistry(userId);
        
        console.log(`[DataStore] Starting cleanup for ${nodes.length} nodes from graph ${graphId}`);
        
        // For each node in the deleted graph
        for (const node of nodes) {
            // Ensure node has a valid ID
            if (!node || !node.id) {
                console.warn(`[DataStore] Skipping node without valid ID:`, node);
                continue;
            }
            
            const nodeId = node.id;
            console.log(`[DataStore] Processing node: ${nodeId}`);
            
            // Check if this node exists in other graphs using the node registry
            let nodeExistsInOtherGraphs = false;
            
            if (nodeRegistry[nodeId] && nodeRegistry[nodeId].graph_ids) {
                // Check if the node is used in any graph other than the one being deleted
                const otherGraphIds = nodeRegistry[nodeId].graph_ids.filter(gid => gid !== graphId);
                if (otherGraphIds.length > 0) {
                    nodeExistsInOtherGraphs = true;
                    console.log(`[DataStore] Node ${nodeId} found in graphs: ${otherGraphIds.join(', ')}`);
                }
            }
            
            // If node doesn't exist in other graphs, remove it from registry
            if (!nodeExistsInOtherGraphs) {
                if (nodeRegistry[nodeId]) {
                    console.log(`[DataStore] Removing node ${nodeId} from registry (not used in other graphs)`);
                    delete nodeRegistry[nodeId];
                } else {
                    console.log(`[DataStore] Node ${nodeId} not found in registry`);
                }
            } else {
                // Remove this graph from the node's graph_ids list
                if (nodeRegistry[nodeId] && nodeRegistry[nodeId].graph_ids) {
                    const graphIndex = nodeRegistry[nodeId].graph_ids.indexOf(graphId);
                    if (graphIndex >= 0) {
                        nodeRegistry[nodeId].graph_ids.splice(graphIndex, 1);
                        console.log(`[DataStore] Removed graph ${graphId} from node ${nodeId}'s graph list`);
                    }
                }
                console.log(`[DataStore] Keeping node ${nodeId} in registry (used in other graphs)`);
            }
        }
        
        await this.saveNodeRegistry(userId, nodeRegistry);
        console.log(`[DataStore] Node registry cleanup completed for graph ${graphId}`);
    }

    async cleanupGraphRegistry(userId, graphId) {
        const graphRegistry = await this.getGraphRegistry(userId);
        
        if (!Array.isArray(graphRegistry)) {
            console.warn(`[DataStore] Graph registry is not an array for user ${userId}`);
            return;
        }
        
        const graphIndex = graphRegistry.findIndex(g => g && g.id === graphId);
        
        if (graphIndex >= 0) {
            console.log(`[DataStore] Removing graph ${graphId} from registry`);
            graphRegistry.splice(graphIndex, 1);
            await this.saveGraphRegistry(userId, graphRegistry);
        } else {
            console.log(`[DataStore] Graph ${graphId} not found in registry`);
        }
    }

    // Version Control Methods
    async initializeVersionControl(userId, graphId, userName, userEmail) {
        try {
            const initialized = await this.gitVersionControl.initializeGit(userId, graphId);
            if (initialized && userName && userEmail) {
                await this.gitVersionControl.configureGit(userId, graphId, userName, userEmail);
            }
            return initialized;
        } catch (error) {
            console.error(`[DataStore] Failed to initialize version control for graph ${graphId}:`, error);
            return false;
        }
    }

    async commitVersion(userId, graphId, message, author = null, userName = null, userEmail = null) {
        try {
            // Use provided user info or fallback to defaults
            const finalUserName = userName || 'Unknown';
            const finalUserEmail = userEmail || 'unknown@example.com';
            
            // Initialize version control if not already done
            await this.initializeVersionControl(userId, graphId, finalUserName, finalUserEmail);
            
            // Add all files to staging
            await this.gitVersionControl.addFiles(userId, graphId);
            
            // Commit the changes
            const result = await this.gitVersionControl.commit(userId, graphId, message, author);
            return result;
        } catch (error) {
            console.error(`[DataStore] Failed to commit version for graph ${graphId}:`, error);
            return { success: false, error: error.message };
        }
    }

    async getVersionHistory(userId, graphId, limit = 50) {
        try {
            return await this.gitVersionControl.getHistory(userId, graphId, limit);
        } catch (error) {
            console.error(`[DataStore] Failed to get version history for graph ${graphId}:`, error);
            return [];
        }
    }

    async getVersion(userId, graphId, commitId) {
        try {
            return await this.gitVersionControl.getVersion(userId, graphId, commitId);
        } catch (error) {
            console.error(`[DataStore] Failed to get version ${commitId} for graph ${graphId}:`, error);
            return null;
        }
    }

    async revertToVersion(userId, graphId, commitId) {
        try {
            const result = await this.gitVersionControl.revertToVersion(userId, graphId, commitId);
            if (result.success) {
                // Regenerate graph from the reverted CNL
                const versionData = await this.getVersion(userId, graphId, commitId);
                if (versionData && versionData.cnl) {
                    await this.regenerateGraphFromCnl(userId, graphId, versionData.cnl);
                }
            }
            return result;
        } catch (error) {
            console.error(`[DataStore] Failed to revert to version ${commitId} for graph ${graphId}:`, error);
            return { success: false, error: error.message };
        }
    }

    async compareVersions(userId, graphId, commitId1, commitId2) {
        try {
            return await this.gitVersionControl.compareVersions(userId, graphId, commitId1, commitId2);
        } catch (error) {
            console.error(`[DataStore] Failed to compare versions for graph ${graphId}:`, error);
            return { error: error.message };
        }
    }

    async createBranch(userId, graphId, branchName) {
        try {
            return await this.gitVersionControl.createBranch(userId, graphId, branchName);
        } catch (error) {
            console.error(`[DataStore] Failed to create branch for graph ${graphId}:`, error);
            return { success: false, error: error.message };
        }
    }

    async listBranches(userId, graphId) {
        try {
            return await this.gitVersionControl.listBranches(userId, graphId);
        } catch (error) {
            console.error(`[DataStore] Failed to list branches for graph ${graphId}:`, error);
            return [];
        }
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

    // Helper method to get user info for Git commits
    async getUserInfo(userId) {
        // For now, return default values - this can be enhanced later
        return {
            name: 'User',
            email: 'user@example.com'
        };
    }

    // Helper method to generate descriptive commit messages
    generateCommitMessage(cnlText) {
        try {
            const lines = cnlText.split('\n').filter(line => line.trim());
            const nodeCount = lines.filter(line => line.startsWith('#')).length;
            const relationCount = lines.filter(line => line.includes('<') && line.includes('>')).length;
            const attributeCount = lines.filter(line => line.startsWith('has ')).length;
            
            let summary = [];
            if (nodeCount > 0) summary.push(`${nodeCount} node${nodeCount > 1 ? 's' : ''}`);
            if (relationCount > 0) summary.push(`${relationCount} relation${relationCount > 1 ? 's' : ''}`);
            if (attributeCount > 0) summary.push(`${attributeCount} attribute${attributeCount > 1 ? 's' : ''}`);
            
            return summary.length > 0 ? summary.join(', ') : 'Updated graph structure';
        } catch (error) {
            return 'Updated graph structure';
        }
    }

    // Method to get all public graphs across all users
    async getAllPublicGraphs() {
        try {
            const publicGraphs = [];
            const usersDir = path.join(this.dataPath, 'users');
            
            // Check if users directory exists
            try {
                await fsp.access(usersDir);
            } catch (error) {
                console.log('No users directory found, returning empty public graphs list');
                return [];
            }

            // Get all user directories
            const userDirs = await fsp.readdir(usersDir);
            
            for (const userId of userDirs) {
                const userPath = path.join(usersDir, userId);
                const userStat = await fsp.stat(userPath);
                
                if (!userStat.isDirectory()) continue;
                
                const registryPath = path.join(userPath, 'registry.json');
                
                try {
                    const registryContent = await fsp.readFile(registryPath, 'utf8');
                    const registry = JSON.parse(registryContent);
                    
                    // Filter for public graphs
                    const userPublicGraphs = registry.filter(graph => graph.publication_state === 'Public');
                    
                    // Add to public graphs list
                    publicGraphs.push(...userPublicGraphs.map(graph => ({
                        id: graph.id,
                        name: graph.name,
                        author: graph.author,
                        email: graph.email,
                        mode: graph.mode,
                        createdAt: graph.created_at,
                        updatedAt: graph.updated_at || graph.updatedAt,
                        publication_state: 'Public',
                        description: graph.description || null,
                        preview_url: graph.preview_url || null
                    })));
                    
                } catch (error) {
                    console.warn(`Failed to read registry for user ${userId}:`, error.message);
                    continue;
                }
            }
            
            return publicGraphs;
        } catch (error) {
            console.error('Error getting public graphs:', error);
            return [];
        }
    }

    // Method to get CNL data for a specific public graph
    async getPublicGraphCnl(graphId) {
        try {
            const usersDir = path.join(this.dataPath, 'users');
            
            // Check if users directory exists
            try {
                await fsp.access(usersDir);
            } catch (error) {
                throw new Error('No users directory found');
            }

            // Get all user directories
            const userDirs = await fsp.readdir(usersDir);
            
            for (const userId of userDirs) {
                const userPath = path.join(usersDir, userId);
                const userStat = await fsp.stat(userPath);
                
                if (!userStat.isDirectory()) continue;
                
                const registryPath = path.join(userPath, 'registry.json');
                
                try {
                    const registryContent = await fsp.readFile(registryPath, 'utf8');
                    const registry = JSON.parse(registryContent);
                    
                    // Check if this user has the graph and it's public
                    const graph = registry.find(g => g.id === graphId && g.publication_state === 'Public');
                    
                    if (graph) {
                        // Found the graph, now get the CNL data
                        const cnlPath = path.join(userPath, 'graphs', graphId, 'graph.cnl');
                        
                        try {
                            const cnlContent = await fsp.readFile(cnlPath, 'utf8');
                            return {
                                cnl: cnlContent,
                                nodes: [],
                                relations: [],
                                attributes: []
                            };
                        } catch (error) {
                            // If CNL file doesn't exist, return empty CNL
                            return {
                                cnl: '',
                                nodes: [],
                                relations: [],
                                attributes: []
                            };
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to read registry for user ${userId}:`, error.message);
                    continue;
                }
            }
            
            throw new Error('Public graph not found');
        } catch (error) {
            console.error('Error getting public graph CNL:', error);
            throw error;
        }
    }

    // Method to get graph.json data for a specific public graph
    async getPublicGraphData(graphId) {
        try {
            const usersDir = path.join(this.dataPath, 'users');
            
            // Check if users directory exists
            try {
                await fsp.access(usersDir);
            } catch (error) {
                throw new Error('No users directory found');
            }

            // Get all user directories
            const userDirs = await fsp.readdir(usersDir);
            
            for (const userId of userDirs) {
                const userPath = path.join(usersDir, userId);
                const userStat = await fsp.stat(userPath);
                
                if (!userStat.isDirectory()) continue;
                
                const registryPath = path.join(userPath, 'registry.json');
                
                try {
                    const registryContent = await fsp.readFile(registryPath, 'utf8');
                    const registry = JSON.parse(registryContent);
                    
                    // Check if this user has the graph and it's public
                    const graph = registry.find(g => g.id === graphId && g.publication_state === 'Public');
                    
                    if (graph) {
                        // Found the graph, now get the graph.json data
                        const graphJsonPath = path.join(userPath, 'graphs', graphId, 'graph.json');
                        
                        try {
                            const graphJsonContent = await fsp.readFile(graphJsonPath, 'utf8');
                            return JSON.parse(graphJsonContent);
                        } catch (error) {
                            // If graph.json doesn't exist, return empty structure
                            return {
                                nodes: [],
                                relations: [],
                                attributes: []
                            };
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to read registry for user ${userId}:`, error.message);
                    continue;
                }
            }
            
            throw new Error('Public graph not found');
        } catch (error) {
            console.error('Error getting public graph data:', error);
            throw error;
        }
    }

    // Method to get manifest.json data for a specific public graph
    async getPublicGraphManifest(graphId) {
        try {
            const usersDir = path.join(this.dataPath, 'users');
            
            // Check if users directory exists
            try {
                await fsp.access(usersDir);
            } catch (error) {
                throw new Error('No users directory found');
            }

            // Get all user directories
            const userDirs = await fsp.readdir(usersDir);
            
            for (const userId of userDirs) {
                const userPath = path.join(usersDir, userId);
                const userStat = await fsp.stat(userPath);
                
                if (!userStat.isDirectory()) continue;
                
                const registryPath = path.join(userPath, 'registry.json');
                
                try {
                    const registryContent = await fsp.readFile(registryPath, 'utf8');
                    const registry = JSON.parse(registryContent);
                    
                    // Check if this user has the graph and it's public
                    const graph = registry.find(g => g.id === graphId && g.publication_state === 'Public');
                    
                    if (graph) {
                        // Found the graph, now get the manifest.json data
                        const manifestPath = path.join(userPath, 'graphs', graphId, 'manifest.json');
                        
                        try {
                            const manifestContent = await fsp.readFile(manifestPath, 'utf8');
                            return JSON.parse(manifestContent);
                        } catch (error) {
                            // If manifest.json doesn't exist, return basic structure
                            return {
                                id: graphId,
                                name: graph.name || 'Unknown Graph',
                                author: graph.author || 'Unknown Author',
                                email: graph.email || '',
                                mode: graph.mode || 'richgraph',
                                publication_mode: 'Public',
                                created_at: graph.created_at || new Date().toISOString(),
                                modified_at: graph.updated_at || graph.updatedAt || new Date().toISOString(),
                                description: graph.description || ''
                            };
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to read registry for user ${userId}:`, error.message);
                    continue;
                }
            }
            
            throw new Error('Public graph not found');
        } catch (error) {
            console.error('Error getting public graph manifest:', error);
            throw error;
        }
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
