import { createLibp2p } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { mplex } from '@libp2p/mplex';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import crypto from 'crypto';
import SimpleGraph from './simple-graph.js';

/**
 * P2PGraphSimple - A simplified distributed, encrypted graph storage system using libp2p
 * Focuses on core P2P functionality without complex services
 */
class P2PGraphSimple extends SimpleGraph {
    constructor(storagePath, graphId, libp2pInstance = null) {
        super(storagePath, graphId);
        this.libp2p = libp2pInstance;
        this.encryptionKey = null;
        this.peers = new Set();
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
            
            this.isInitialized = true;
            console.log(`🔐 P2P initialized for graph: ${this.key}`);
        } catch (error) {
            console.error('❌ Failed to initialize P2P:', error);
            throw error;
        }
    }

    /**
     * Create a simplified libp2p instance
     */
    async createLibp2pInstance() {
        const libp2p = await createLibp2p({
            addresses: {
                listen: [
                    '/ip4/0.0.0.0/tcp/0'
                ]
            },
            transports: [tcp()],
            streamMuxers: [yamux(), mplex()],
            connectionEncryption: [noise()]
            // No peer discovery or services for simplicity
        });

        // Start the libp2p node
        await libp2p.start();
        
        // Set up basic event listeners
        this.setupLibp2pEventListeners(libp2p);
        
        return libp2p;
    }

    /**
     * Set up basic libp2p event listeners
     */
    setupLibp2pEventListeners(libp2p) {
        // Connection events
        libp2p.addEventListener('connection:open', (evt) => {
            console.log(`🔓 Connection opened to: ${evt.detail.remotePeer}`);
        });

        libp2p.addEventListener('connection:close', (evt) => {
            console.log(`🔒 Connection closed to: ${evt.detail.remotePeer}`);
        });
    }

    /**
     * Encrypt data for P2P transmission
     */
    encryptData(data) {
        if (!this.encryptionKey) {
            throw new Error('P2P not initialized');
        }

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
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

        const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, Buffer.from(encryptedData.iv, 'hex'));
        decipher.setAAD(Buffer.from(this.key));
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    }

    /**
     * Get P2P status and peer information
     */
    getP2PStatus() {
        return {
            isInitialized: this.isInitialized,
            peerCount: this.peers.size,
            peers: Array.from(this.peers),
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
        const graph = new P2PGraphSimple(storagePath, graphId);
        await graph.initializeP2P();
        return graph;
    }
}

export default P2PGraphSimple;
