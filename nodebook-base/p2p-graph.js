import { createLibp2p } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { bootstrap } from '@libp2p/bootstrap';
import { kadDHT } from '@libp2p/kad-dht';
import { mplex } from '@libp2p/mplex';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { identify } from '@libp2p/identify';
import { ping } from '@libp2p/ping';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import crypto from 'crypto';
import SimpleGraph from './simple-graph.js';

/**
 * P2PGraph - A distributed, encrypted graph storage system using libp2p
 * Extends SimpleGraph with P2P capabilities for real-time collaboration
 */
class P2PGraph extends SimpleGraph {
    constructor(storagePath, graphId, libp2pInstance = null) {
        super(storagePath, graphId);
        this.libp2p = libp2pInstance;
        this.encryptionKey = null;
        this.peers = new Set();
        this.collaborationChannel = null;
        this.isInitialized = false;
    }

    /**
     * Initialize P2P capabilities
     */
    async initializeP2P() {
        if (this.isInitialized) return;

        try {
            if (!this.libp2p) {
                this.libp2p = await this.createLibp2pInstance();
            }

            // Generate encryption key for this graph
            this.encryptionKey = crypto.randomBytes(32);
            
            // Set up collaboration channel
            await this.setupCollaborationChannel();
            
            this.isInitialized = true;
            console.log(`🔐 P2P initialized for graph: ${this.key}`);
        } catch (error) {
            console.error('❌ Failed to initialize P2P:', error);
            throw error;
        }
    }

    /**
     * Create a libp2p instance for this graph
     */
    async createLibp2pInstance() {
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
                }),
                pubsub: gossipsub({
                    allowPublishToZeroPeers: false,
                    emitSelf: false
                })
            }
        });

        // Start the libp2p node
        await libp2p.start();
        
        // Set up event listeners
        this.setupLibp2pEventListeners(libp2p);
        
        return libp2p;
    }

    /**
     * Set up libp2p event listeners
     */
    setupLibp2pEventListeners(libp2p) {
        // Peer discovery
        libp2p.addEventListener('peer:discovery', (evt) => {
            const peer = evt.detail;
            console.log(`🔍 Peer discovered: ${peer.id}`);
        });

        // Peer connection
        libp2p.addEventListener('peer:connect', (evt) => {
            const peer = evt.detail;
            this.peers.add(peer.id.toString());
            console.log(`🔗 Peer connected: ${peer.id}`);
        });

        // Peer disconnection
        libp2p.addEventListener('peer:disconnect', (evt) => {
            const peer = evt.detail;
            this.peers.delete(peer.id.toString());
            console.log(`🔌 Peer disconnected: ${peer.id}`);
        });

        // Connection events
        libp2p.addEventListener('connection:open', (evt) => {
            console.log(`🔓 Connection opened to: ${evt.detail.remotePeer}`);
        });

        libp2p.addEventListener('connection:close', (evt) => {
            console.log(`🔒 Connection closed to: ${evt.detail.remotePeer}`);
        });
    }

    /**
     * Set up collaboration channel for real-time updates
     */
    async setupCollaborationChannel() {
        if (!this.libp2p) return;

        const topic = `nodebook-graph-${this.key}`;
        
        // Subscribe to graph updates
        await this.libp2p.services.pubsub.subscribe(topic, (message) => {
            this.handleGraphUpdate(message);
        });

        this.collaborationChannel = topic;
        console.log(`📡 Collaboration channel set up: ${topic}`);
    }

    /**
     * Handle incoming graph updates from peers
     */
    handleGraphUpdate(message) {
        try {
            const update = JSON.parse(message.data.toString());
            
            // Verify the update is for this graph
            if (update.graphId !== this.key) return;
            
            // Decrypt the update data
            const decryptedData = this.decryptData(update.encryptedData);
            
            // Apply the update based on type
            switch (update.type) {
                case 'node_added':
                    this.handleNodeUpdate(update);
                    break;
                case 'relation_added':
                    this.handleRelationUpdate(update);
                    break;
                case 'attribute_added':
                    this.handleAttributeUpdate(update);
                    break;
                case 'function_applied':
                    this.handleFunctionUpdate(update);
                    break;
                default:
                    console.log(`⚠️ Unknown update type: ${update.type}`);
            }
        } catch (error) {
            console.error('❌ Failed to handle graph update:', error);
        }
    }

    /**
     * Handle node updates from peers
     */
    handleNodeUpdate(update) {
        console.log(`📡 Received node update from peer: ${update.nodeId}`);
        // In a real implementation, this would sync the node data
    }

    /**
     * Handle relation updates from peers
     */
    handleRelationUpdate(update) {
        console.log(`📡 Received relation update from peer: ${update.relationId}`);
        // In a real implementation, this would sync the relation data
    }

    /**
     * Handle attribute updates from peers
     */
    handleAttributeUpdate(update) {
        console.log(`📡 Received attribute update from peer: ${update.attributeId}`);
        // In a real implementation, this would sync the attribute data
    }

    /**
     * Handle function updates from peers
     */
    handleFunctionUpdate(update) {
        console.log(`📡 Received function update from peer: ${update.functionId}`);
        // In a real implementation, this would sync the function data
    }

    /**
     * Encrypt data for P2P transmission
     */
    encryptData(data) {
        if (!this.encryptionKey) {
            throw new Error('P2P not initialized');
        }

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
        cipher.setAAD(Buffer.from(this.key));
        
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    /**
     * Decrypt data received from P2P network
     */
    decryptData(encryptedData) {
        if (!this.encryptionKey) {
            throw new Error('P2P not initialized');
        }

        const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
        decipher.setAAD(Buffer.from(this.key));
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    }

    /**
     * Broadcast graph update to all peers
     */
    async broadcastUpdate(type, data) {
        if (!this.collaborationChannel || !this.libp2p) return;

        const update = {
            type,
            graphId: this.key,
            timestamp: Date.now(),
            encryptedData: this.encryptData(data)
        };

        try {
            await this.libp2p.services.pubsub.publish(
                this.collaborationChannel,
                Buffer.from(JSON.stringify(update))
            );
            console.log(`📡 Broadcasted ${type} update`);
        } catch (error) {
            console.error('❌ Failed to broadcast update:', error);
        }
    }

    /**
     * Override addNode to include P2P broadcasting
     */
    async addNode(baseName, options = {}) {
        const node = await super.addNode(baseName, options);
        
        if (this.isInitialized) {
            await this.broadcastUpdate('node_added', {
                nodeId: node.id,
                baseName: node.base_name,
                options
            });
        }
        
        return node;
    }

    /**
     * Override addRelation to include P2P broadcasting
     */
    async addRelation(sourceId, targetId, name, options = {}) {
        const relation = await super.addRelation(sourceId, targetId, name, options);
        
        if (this.isInitialized) {
            await this.broadcastUpdate('relation_added', {
                relationId: relation.id,
                sourceId,
                targetId,
                name,
                options
            });
        }
        
        return relation;
    }

    /**
     * Override addAttribute to include P2P broadcasting
     */
    async addAttribute(sourceId, name, value, options = {}) {
        const attribute = await super.addAttribute(sourceId, name, value, options);
        
        if (this.isInitialized) {
            await this.broadcastUpdate('attribute_added', {
                attributeId: attribute.id,
                sourceId,
                name,
                value,
                options
            });
        }
        
        return attribute;
    }

    /**
     * Override applyFunction to include P2P broadcasting
     */
    async applyFunction(sourceId, name, expression, options = {}) {
        const func = await super.applyFunction(sourceId, name, expression, options);
        
        if (this.isInitialized) {
            await this.broadcastUpdate('function_applied', {
                functionId: func?.id,
                sourceId,
                name,
                expression,
                options
            });
        }
        
        return func;
    }

    /**
     * Get P2P status and peer information
     */
    getP2PStatus() {
        return {
            isInitialized: this.isInitialized,
            peerCount: this.peers.size,
            peers: Array.from(this.peers),
            collaborationChannel: this.collaborationChannel,
            encryptionKey: this.encryptionKey ? '🔐 Set' : '❌ Not set'
        };
    }

    /**
     * Connect to a specific peer for collaboration
     */
    async connectToPeer(multiaddr) {
        if (!this.libp2p) {
            throw new Error('P2P not initialized');
        }

        try {
            await this.libp2p.dial(multiaddr);
            console.log(`🔗 Connected to peer: ${multiaddr}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to connect to peer:', error);
            return false;
        }
    }

    /**
     * Get the libp2p instance for external use
     */
    getLibp2pInstance() {
        return this.libp2p;
    }

    /**
     * Clean up P2P resources
     */
    async cleanup() {
        if (this.libp2p) {
            await this.libp2p.stop();
        }
        this.isInitialized = false;
        console.log(`🧹 P2P cleanup completed for graph: ${this.key}`);
    }

    /**
     * Static method to create a P2P Graph instance
     */
    static async create(storagePath, graphId) {
        const graph = new P2PGraph(storagePath, graphId);
        await graph.initializeP2P();
        return graph;
    }
}

export default P2PGraph;
