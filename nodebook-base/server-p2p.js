/**
 * NodeBook P2P Server
 * 
 * This is the P2P-enabled version of NodeBook that provides:
 * - Distributed, encrypted graph storage
 * - Real-time collaboration capabilities
 * - Peer-to-peer networking
 * - Enhanced security with encryption
 * 
 * CHOICE FOR USERS:
 * - Use server-simple.js for traditional, centralized storage
 * - Use server-p2p.js for P2P, distributed, collaborative storage
 * 
 * Institutions and enterprises may prefer the simple version
 * for compliance and control reasons.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import P2PGraphManager from './p2p-graph-manager.js';
import auth from './auth.js';
import path from 'path';
import fs from 'fs';

// Initialize Fastify server
const server = Fastify({
    logger: {
        level: 'info',
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true
            }
        }
    }
});

// Initialize P2P Graph Manager
const p2pGraphManager = new P2PGraphManager('./user_data');

// Register plugins
await server.register(cors, {
    origin: true,
    credentials: true
});

await server.register(multipart);
await server.register(websocket);

// Initialize P2P system
server.addHook('onReady', async () => {
    try {
        await p2pGraphManager.initialize();
        server.log.info('🚀 P2P Graph Manager initialized successfully');
        server.log.info('📊 P2P Status:', p2pGraphManager.getP2PStatus());
        server.log.info('🌐 This is the P2P-enabled NodeBook server');
        server.log.info('💡 Use server-simple.js for traditional storage');
    } catch (error) {
        server.log.error('❌ Failed to initialize P2P Graph Manager:', error);
    }
});

// Health check endpoint with P2P identification
server.get('/api/health', async (request, reply) => {
    const p2pStatus = p2pGraphManager.getP2PStatus();
    return {
        message: 'NodeBook P2P Server is running',
        version: 'P2P-Enabled',
        timestamp: new Date().toISOString(),
        p2p: p2pStatus,
        note: 'This is the P2P version. Use server-simple.js for traditional storage.'
    };
});

// Mindmap templates endpoint
server.get('/api/mindmap/templates', async (request, reply) => {
    return {
        templates: [
            'concept-map',
            'mind-map',
            'flow-chart',
            'knowledge-graph'
        ]
    };
});

// Authentication endpoints
server.post('/api/auth/login', async (request, reply) => {
    try {
        const { username, password } = request.body;
        const result = await auth.authenticateUser(username, password);
        
        if (result.success) {
            const token = auth.generateToken(result.user);
            return { token, user: result.user };
        } else {
            return reply.code(401).send({ error: 'Invalid credentials' });
        }
    } catch (error) {
        server.log.error('Login error:', error);
        return reply.code(500).send({ error: 'Authentication failed' });
    }
});

// Graph endpoints with P2P integration
server.post('/api/graphs', async (request, reply) => {
    try {
        const { name, userId } = request.body;
        
        if (!name || !userId) {
            return reply.code(400).send({ error: 'Name and userId are required' });
        }

        // Create P2P graph
        const graphMetadata = await p2pGraphManager.createGraph(userId, name);
        
        server.log.info(`✅ P2P Graph created: ${graphMetadata.id} for user ${userId}`);
        
        return {
            success: true,
            graph: graphMetadata
        };
    } catch (error) {
        server.log.error('Graph creation error:', error);
        return reply.code(500).send({ error: 'Failed to create graph' });
    }
});

server.get('/api/graphs', async (request, reply) => {
    try {
        const { userId } = request.query;
        
        if (!userId) {
            return reply.code(400).send({ error: 'userId is required' });
        }

        // List P2P graphs for user
        const graphs = await p2pGraphManager.listUserGraphs(userId);
        
        return {
            success: true,
            graphs
        };
    } catch (error) {
        server.log.error('Graph listing error:', error);
        return reply.code(500).send({ error: 'Failed to list graphs' });
    }
});

server.get('/api/graphs/:graphId', async (request, reply) => {
    try {
        const { graphId } = request.params;
        const { userId } = request.query;
        
        if (!userId) {
            return reply.code(400).send({ error: 'userId is required' });
        }

        // Get P2P graph
        const graph = await p2pGraphManager.getGraph(userId, graphId);
        
        return {
            success: true,
            graph: {
                id: graphId,
                name: graph.key,
                p2pStatus: graph.getP2PStatus()
            }
        };
    } catch (error) {
        server.log.error('Graph retrieval error:', error);
        return reply.code(500).send({ error: 'Failed to retrieve graph' });
    }
});

// Node endpoints with P2P integration
server.post('/api/graphs/:graphId/nodes', async (request, reply) => {
    try {
        const { graphId } = request.params;
        const { base_name, userId, options = {} } = request.body;
        
        if (!base_name || !userId) {
            return reply.code(400).send({ error: 'base_name and userId are required' });
        }

        // Get P2P graph and add node
        const graph = await p2pGraphManager.getGraph(userId, graphId);
        const node = await graph.addNode(base_name, options);
        
        server.log.info(`✅ P2P Node added: ${node.base_name} to graph ${graphId}`);
        
        return {
            success: true,
            nodeId: node.id,
            node
        };
    } catch (error) {
        server.log.error('Node creation error:', error);
        return reply.code(500).send({ error: 'Failed to create node' });
    }
});

server.get('/api/graphs/:graphId/nodes', async (request, reply) => {
    try {
        const { graphId } = request.params;
        const { userId } = request.query;
        
        if (!userId) {
            return reply.code(400).send({ error: 'userId is required' });
        }

        // Get P2P graph and list nodes
        const graph = await p2pGraphManager.getGraph(userId, graphId);
        const nodes = await graph.listAll('nodes');
        
        return {
            success: true,
            nodes
        };
    } catch (error) {
        server.log.error('Node listing error:', error);
        return reply.code(500).send({ error: 'Failed to list nodes' });
    }
});

// Relation endpoints with P2P integration
server.post('/api/graphs/:graphId/relations', async (request, reply) => {
    try {
        const { graphId } = request.params;
        const { source_id, target_id, name, userId, options = {} } = request.body;
        
        if (!source_id || !target_id || !name || !userId) {
            return reply.code(400).send({ error: 'source_id, target_id, name, and userId are required' });
        }

        // Get P2P graph and add relation
        const graph = await p2pGraphManager.getGraph(userId, graphId);
        const relation = await graph.addRelation(source_id, target_id, name, options);
        
        server.log.info(`✅ P2P Relation added: ${relation.name} to graph ${graphId}`);
        
        return {
            success: true,
            relationId: relation.id,
            relation
        };
    } catch (error) {
        server.log.error('Relation creation error:', error);
        return reply.code(500).send({ error: 'Failed to create relation' });
    }
});

server.get('/api/graphs/:graphId/relations', async (request, reply) => {
    try {
        const { graphId } = request.params;
        const { userId } = request.query;
        
        if (!userId) {
            return reply.code(400).send({ error: 'userId is required' });
        }

        // Get P2P graph and list relations
        const graph = await p2pGraphManager.getGraph(userId, graphId);
        const relations = await graph.listAll('relations');
        
        return {
            success: true,
            relations
        };
    } catch (error) {
        server.log.error('Relation listing error:', error);
        return reply.code(500).send({ error: 'Failed to list relations' });
    }
});

// Attribute endpoints with P2P integration
server.post('/api/graphs/:graphId/attributes', async (request, reply) => {
    try {
        const { graphId } = request.params;
        const { source_id, attributeName, attributeValue, userId, options = {} } = request.body;
        
        if (!source_id || !attributeName || !attributeValue || !userId) {
            return reply.code(400).send({ error: 'source_id, attributeName, attributeValue, and userId are required' });
        }

        // Get P2P graph and add attribute
        const graph = await p2pGraphManager.getGraph(userId, graphId);
        const attribute = await graph.addAttribute(source_id, attributeName, attributeValue, options);
        
        server.log.info(`✅ P2P Attribute added: ${attribute.name} to graph ${graphId}`);
        
        return {
            success: true,
            attributeId: attribute.id,
            attribute
        };
    } catch (error) {
        server.log.error('Attribute creation error:', error);
        return reply.code(500).send({ error: 'Failed to create attribute' });
    }
});

// Function endpoints with P2P integration
server.post('/api/graphs/:graphId/functions', async (request, reply) => {
    try {
        const { graphId } = request.params;
        const { source_id, name, expression, userId, options = {} } = request.body;
        
        if (!source_id || !name || !expression || !userId) {
            return reply.code(400).send({ error: 'source_id, name, expression, and userId are required' });
        }

        // Get P2P graph and apply function
        const graph = await p2pGraphManager.getGraph(userId, graphId);
        const func = await graph.applyFunction(source_id, name, expression, options);
        
        server.log.info(`✅ P2P Function applied: ${name} to graph ${graphId}`);
        
        return {
            success: true,
            functionId: func?.id,
            function: func
        };
    } catch (error) {
        server.log.error('Function application error:', error);
        return reply.code(500).send({ error: 'Failed to apply function' });
    }
});

// P2P-specific endpoints
server.get('/api/p2p/status', async (request, reply) => {
    try {
        const status = p2pGraphManager.getP2PStatus();
        return {
            success: true,
            p2p: status
        };
    } catch (error) {
        server.log.error('P2P status error:', error);
        return reply.code(500).send({ error: 'Failed to get P2P status' });
    }
});

server.post('/api/p2p/connect', async (request, reply) => {
    try {
        const { multiaddr } = request.body;
        
        if (!multiaddr) {
            return reply.code(400).send({ error: 'multiaddr is required' });
        }

        // Connect to a specific peer
        const success = await p2pGraphManager.globalLibp2p.dial(multiaddr);
        
        if (success) {
            server.log.info(`✅ Connected to peer: ${multiaddr}`);
            return { success: true, message: 'Connected to peer' };
        } else {
            return reply.code(400).send({ error: 'Failed to connect to peer' });
        }
    } catch (error) {
        server.log.error('Peer connection error:', error);
        return reply.code(500).send({ error: 'Failed to connect to peer' });
    }
});

// Collaboration endpoints
server.post('/api/graphs/:graphId/collaborate', async (request, reply) => {
    try {
        const { graphId } = request.params;
        const { userId, maxParticipants = 6 } = request.body;
        
        if (!userId) {
            return reply.code(400).send({ error: 'userId is required' });
        }

        // Create collaboration session
        const session = await p2pGraphManager.createCollaborationSession(graphId, userId, { maxParticipants });
        
        server.log.info(`✅ Collaboration session created: ${session.id} for graph ${graphId}`);
        
        return {
            success: true,
            session
        };
    } catch (error) {
        server.log.error('Collaboration session creation error:', error);
        return reply.code(500).send({ error: 'Failed to create collaboration session' });
    }
});

// Cleanup on server shutdown
server.addHook('onClose', async () => {
    try {
        await p2pGraphManager.cleanup();
        server.log.info('🧹 P2P Graph Manager cleanup completed');
    } catch (error) {
        server.log.error('❌ Failed to cleanup P2P Graph Manager:', error);
    }
});

// Start server
const start = async () => {
    try {
        await server.listen({ port: 3000, host: '0.0.0.0' });
        server.log.info(`🚀 NodeBook P2P Server running on port 3000`);
        server.log.info(`🌐 P2P integration enabled`);
        server.log.info(`💡 Use server-simple.js for traditional storage`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
