import P2PGraph from './p2p-graph.js';
import { createLibp2p } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { bootstrap } from '@libp2p/bootstrap';
import { kadDHT } from '@libp2p/kad-dht';
import { mplex } from '@libp2p/mplex';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { identify } from '@libp2p/identify';
import { ping } from '@libp2p/ping';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

/**
 * P2PGraphManager - Manages P2P graph lifecycle and collaboration
 * Extends SimpleGraphManager with distributed capabilities
 */
class P2PGraphManager {
    constructor(baseStoragePath = './user_data') {
        this.baseStoragePath = baseStoragePath;
        this.graphs = new Map();
        this.globalLibp2p = null;
        this.collaborationSessions = new Map();
        this.isInitialized = false;
    }

    /**
     * Initialize the P2P Graph Manager
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Create global libp2p instance for peer discovery
            this.globalLibp2p = await this.createGlobalLibp2pInstance();
            
            // Ensure storage directories exist
            await this.ensureStorageDirectories();
            
            this.isInitialized = true;
            console.log('🚀 P2P Graph Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize P2P Graph Manager:', error);
            throw error;
        }
    }

    /**
     * Create a global libp2p instance for peer discovery
     */
    async createGlobalLibp2pInstance() {
        const libp2p = await createLibp2p({
            addresses: {
                listen: [
                    '/ip4/0.0.0.0/tcp/0',
                    '/ip4/127.0.0.1/tcp/0'
                ]
            },
            transports: [tcp()],
            streamMuxers: [yamux(), mplex()],
            connectionEncryption: [noise()],
            peerDiscovery: [
                bootstrap({
                    list: [''] // Provide at least one empty string to satisfy bootstrap requirement
                })
            ],
            services: {
                identify: identify(),
                ping: ping(),
                dht: kadDHT({
                    clientMode: false,
                    allowQueryWithZeroPeers: false
                })
            }
        });

        await libp2p.start();
        
        // Set up global event listeners
        this.setupGlobalEventListeners(libp2p);
        
        return libp2p;
    }

    /**
     * Set up global libp2p event listeners
     */
    setupGlobalEventListeners(libp2p) {
        // Peer discovery
        libp2p.addEventListener('peer:discovery', (evt) => {
            const peer = evt.detail;
            console.log(`🌐 Global peer discovered: ${peer.id}`);
        });

        // Peer connection
        libp2p.addEventListener('peer:connect', (evt) => {
            const peer = evt.detail;
            console.log(`🌐 Global peer connected: ${peer.id}`);
        });

        // Peer disconnection
        libp2p.addEventListener('peer:disconnect', (evt) => {
            const peer = evt.detail;
            console.log(`🌐 Global peer disconnected: ${peer.id}`);
        });
    }

    /**
     * Ensure storage directories exist
     */
    async ensureStorageDirectories() {
        const dirs = [
            this.baseStoragePath,
            path.join(this.baseStoragePath, 'users'),
            path.join(this.baseStoragePath, 'graphs'),
            path.join(this.baseStoragePath, 'collaboration_sessions')
        ];

        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }

    /**
     * Create a new P2P graph
     */
    async createGraph(userId, graphName, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const graphId = this.generateGraphId();
        const userStoragePath = path.join(this.baseStoragePath, 'users', userId.toString(), 'graphs');
        
        // Ensure user graph directory exists
        if (!fs.existsSync(userStoragePath)) {
            fs.mkdirSync(userStoragePath, { recursive: true });
        }

        const graphStoragePath = path.join(userStoragePath, graphId);
        
        try {
            // Create P2P graph instance
            const graph = await P2PGraph.create(graphStoragePath, graphId);
            
            // Store graph metadata
            const graphMetadata = {
                id: graphId,
                name: graphName,
                userId: userId,
                createdAt: new Date().toISOString(),
                storagePath: graphStoragePath,
                p2pEnabled: true,
                options
            };

            // Save metadata
            const metadataPath = path.join(graphStoragePath, 'metadata.json');
            fs.writeFileSync(metadataPath, JSON.stringify(graphMetadata, null, 2));

            // Store in memory
            this.graphs.set(graphId, {
                instance: graph,
                metadata: graphMetadata
            });

            console.log(`✅ P2P Graph created: ${graphId} for user ${userId}`);
            return graphMetadata;
        } catch (error) {
            console.error('❌ Failed to create P2P graph:', error);
            throw error;
        }
    }

    /**
     * Get a P2P graph by ID
     */
    async getGraph(userId, graphId) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // Check if graph is in memory
        if (this.graphs.has(graphId)) {
            const graphData = this.graphs.get(graphId);
            
            // Verify user access
            if (graphData.metadata.userId !== userId) {
                throw new Error('Access denied: User does not own this graph');
            }
            
            return graphData.instance;
        }

        // Load graph from storage
        const userStoragePath = path.join(this.baseStoragePath, 'users', userId.toString(), 'graphs');
        const graphStoragePath = path.join(userStoragePath, graphId);
        const metadataPath = path.join(graphStoragePath, 'metadata.json');

        if (!fs.existsSync(metadataPath)) {
            throw new Error(`Graph not found: ${graphId}`);
        }

        try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            
            // Verify user access
            if (metadata.userId !== userId) {
                throw new Error('Access denied: User does not own this graph');
            }

            // Create P2P graph instance
            const graph = await P2PGraph.create(graphStoragePath, graphId);
            
            // Store in memory
            this.graphs.set(graphId, {
                instance: graph,
                metadata
            });

            return graph;
        } catch (error) {
            console.error('❌ Failed to load P2P graph:', error);
            throw error;
        }
    }

    /**
     * List all graphs for a user
     */
    async listUserGraphs(userId) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const userStoragePath = path.join(this.baseStoragePath, 'users', userId.toString(), 'graphs');
        
        if (!fs.existsSync(userStoragePath)) {
            return [];
        }

        const graphDirs = fs.readdirSync(userStoragePath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory());

        const graphs = [];

        for (const dirent of graphDirs) {
            const graphId = dirent.name;
            const metadataPath = path.join(userStoragePath, graphId, 'metadata.json');
            
            if (fs.existsSync(metadataPath)) {
                try {
                    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                    if (metadata.userId === userId) {
                        graphs.push(metadata);
                    }
                } catch (error) {
                    console.warn(`⚠️ Failed to read metadata for graph ${graphId}:`, error.message);
                }
            }
        }

        return graphs;
    }

    /**
     * Delete a P2P graph
     */
    async deleteGraph(userId, graphId) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // Get graph instance
        const graph = await this.getGraph(userId, graphId);
        
        // Clean up P2P resources
        await graph.cleanup();
        
        // Remove from memory
        this.graphs.delete(graphId);
        
        // Remove from storage
        const userStoragePath = path.join(this.baseStoragePath, 'users', userId.toString(), 'graphs');
        const graphStoragePath = path.join(userStoragePath, graphId);
        
        if (fs.existsSync(graphStoragePath)) {
            fs.rmSync(graphStoragePath, { recursive: true, force: true });
        }

        console.log(`🗑️ P2P Graph deleted: ${graphId}`);
        return true;
    }

    /**
     * Create a collaboration session
     */
    async createCollaborationSession(graphId, ownerId, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const sessionId = this.generateSessionId();
        const session = {
            id: sessionId,
            graphId,
            ownerId,
            createdAt: new Date().toISOString(),
            participants: [ownerId],
            permissions: new Map([[ownerId, 'owner']]),
            options
        };

        this.collaborationSessions.set(sessionId, session);
        
        console.log(`🤝 Collaboration session created: ${sessionId} for graph ${graphId}`);
        return session;
    }

    /**
     * Join a collaboration session
     */
    async joinCollaborationSession(sessionId, userId, permissions = 'view') {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const session = this.collaborationSessions.get(sessionId);
        if (!session) {
            throw new Error('Collaboration session not found');
        }

        if (session.participants.includes(userId)) {
            throw new Error('User already in session');
        }

        session.participants.push(userId);
        session.permissions.set(userId, permissions);

        console.log(`👥 User ${userId} joined session ${sessionId} with ${permissions} permissions`);
        return session;
    }

    /**
     * Get collaboration session info
     */
    getCollaborationSession(sessionId) {
        return this.collaborationSessions.get(sessionId);
    }

    /**
     * Generate unique graph ID
     */
    generateGraphId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `graph_${timestamp}_${random}`;
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `session_${timestamp}_${random}`;
    }

    /**
     * Get P2P status
     */
    getP2PStatus() {
        return {
            isInitialized: this.isInitialized,
            globalLibp2p: this.globalLibp2p ? '🟢 Running' : '🔴 Stopped',
            activeGraphs: this.graphs.size,
            collaborationSessions: this.collaborationSessions.size
        };
    }

    /**
     * Clean up all resources
     */
    async cleanup() {
        // Clean up all graphs
        for (const [graphId, graphData] of this.graphs) {
            try {
                await graphData.instance.cleanup();
            } catch (error) {
                console.warn(`⚠️ Failed to cleanup graph ${graphId}:`, error.message);
            }
        }

        // Stop global libp2p
        if (this.globalLibp2p) {
            await this.globalLibp2p.stop();
        }

        this.graphs.clear();
        this.collaborationSessions.clear();
        this.isInitialized = false;

        console.log('🧹 P2P Graph Manager cleanup completed');
    }
}

export default P2PGraphManager;
