/**
 * NodeBook P2P Network Monitor
 * 
 * This service provides real-time monitoring and insights into the P2P network:
 * - Active peers and connections
 * - Network health and performance
 * - Collaboration session status
 * - P2P metrics and statistics
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
// import websocket from '@fastify/websocket';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Fastify server with simple logger
const server = Fastify({
    logger: {
        level: 'info'
    }
});

// Register plugins
await server.register(cors, {
    origin: true,
    credentials: true
});

// await server.register(websocket);

// P2P Network Monitor Data
let p2pNetworkData = {
    timestamp: new Date().toISOString(),
    networkId: process.env.P2P_NETWORK_ID || 'nodebook-dev',
    status: 'monitoring',
    peers: [],
    graphs: [],
    collaborationSessions: [],
    metrics: {
        totalPeers: 0,
        activeConnections: 0,
        totalGraphs: 0,
        activeSessions: 0,
        networkLatency: 0,
        dataThroughput: 0
    }
};

// Health check endpoint
server.get('/api/health', async (request, reply) => {
    return {
        message: 'NodeBook P2P Network Monitor is running',
        timestamp: new Date().toISOString(),
        status: 'healthy',
        version: '1.0.0'
    };
});

// P2P Network Status
server.get('/api/p2p/network/status', async (request, reply) => {
    try {
        // Read P2P data from user_data directory
        const userDataPath = join(process.cwd(), 'user_data');
        const networkData = await getP2PNetworkData(userDataPath);
        
        return {
            success: true,
            network: networkData
        };
    } catch (error) {
        server.log.error('Failed to get P2P network status:', error);
        return reply.code(500).send({ error: 'Failed to get network status' });
    }
});

// Active Peers
server.get('/api/p2p/network/peers', async (request, reply) => {
    try {
        const peers = await getActivePeers();
        return {
            success: true,
            peers,
            count: peers.length
        };
    } catch (error) {
        server.log.error('Failed to get active peers:', error);
        return reply.code(500).send({ error: 'Failed to get peers' });
    }
});

// Active Graphs
server.get('/api/p2p/network/graphs', async (request, reply) => {
    try {
        const graphs = await getActiveGraphs();
        return {
            success: true,
            graphs,
            count: graphs.length
        };
    } catch (error) {
        server.log.error('Failed to get active graphs:', error);
        return reply.code(500).send({ error: 'Failed to get graphs' });
    }
});

// Collaboration Sessions
server.get('/api/p2p/network/sessions', async (request, reply) => {
    try {
        const sessions = await getCollaborationSessions();
        return {
            success: true,
            sessions,
            count: sessions.length
        };
    } catch (error) {
        server.log.error('Failed to get collaboration sessions:', error);
        return reply.code(500).send({ error: 'Failed to get sessions' });
    }
});

// P2P Metrics
server.get('/api/p2p/network/metrics', async (request, reply) => {
    try {
        const metrics = await getP2PMetrics();
        return {
            success: true,
            metrics
        };
    } catch (error) {
        server.log.error('Failed to get P2P metrics:', error);
        return reply.code(500).send({ error: 'Failed to get metrics' });
    }
});

// WebSocket endpoint for real-time updates (disabled due to Fastify version compatibility)
// server.register(async function (fastify) {
//     fastify.get('/ws/p2p-monitor', { websocket: true }, (connection, req) => {
//         server.log.info('P2P Monitor WebSocket connection established');
//         
//         // Send initial data
//         connection.socket.send(JSON.stringify({
//             type: 'initial',
//             data: p2pNetworkData
//         }));
//         
//         // Set up periodic updates
//         const updateInterval = setInterval(() => {
//             updateP2PNetworkData();
//             connection.socket.send(JSON.stringify({
//                 type: 'update',
//                 data: p2PNetworkData
//             }));
//         }, 5000); // Update every 5 seconds
//         
//         // Handle connection close
//         connection.socket.on('close', () => {
//             server.log.info('P2P Monitor WebSocket connection closed');
//             clearInterval(updateInterval);
//         });
//     });
// });

// Helper functions
async function getP2PNetworkData(userDataPath) {
    try {
        // This would read actual P2P data from the network
        // For now, return mock data structure
        return {
            ...p2pNetworkData,
            timestamp: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        server.log.error('Error reading P2P network data:', error);
        return p2pNetworkData;
    }
}

async function getActivePeers() {
    // Mock data - in real implementation, this would query the P2P network
    return [
        {
            id: 'peer-1',
            address: '/ip4/127.0.0.1/tcp/3000',
            status: 'connected',
            lastSeen: new Date().toISOString(),
            graphs: 2
        },
        {
            id: 'peer-2',
            address: '/ip4/192.168.1.100/tcp/3000',
            status: 'connected',
            lastSeen: new Date().toISOString(),
            graphs: 1
        }
    ];
}

async function getActiveGraphs() {
    // Mock data - in real implementation, this would query the P2P network
    return [
        {
            id: 'graph-1',
            name: 'Research Project A',
            owner: 'user-1',
            peers: 3,
            lastActivity: new Date().toISOString(),
            status: 'active'
        },
        {
            id: 'graph-2',
            name: 'Collaboration Project B',
            owner: 'user-2',
            peers: 2,
            lastActivity: new Date().toISOString(),
            status: 'active'
        }
    ];
}

async function getCollaborationSessions() {
    // Mock data - in real implementation, this would query the P2P network
    return [
        {
            id: 'session-1',
            graphId: 'graph-1',
            participants: 3,
            startedAt: new Date().toISOString(),
            status: 'active'
        },
        {
            id: 'session-2',
            graphId: 'graph-2',
            participants: 2,
            startedAt: new Date().toISOString(),
            status: 'active'
        }
    ];
}

async function getP2PMetrics() {
    // Mock data - in real implementation, this would calculate real metrics
    return {
        totalPeers: 2,
        activeConnections: 4,
        totalGraphs: 2,
        activeSessions: 2,
        networkLatency: 45, // ms
        dataThroughput: 1024, // KB/s
        uptime: process.uptime(),
        lastUpdated: new Date().toISOString()
    };
}

async function updateP2PNetworkData() {
    try {
        const peers = await getActivePeers();
        const graphs = await getActiveGraphs();
        const sessions = await getCollaborationSessions();
        const metrics = await getP2PMetrics();
        
        p2pNetworkData = {
            ...p2pNetworkData,
            timestamp: new Date().toISOString(),
            peers,
            graphs,
            collaborationSessions: sessions,
            metrics
        };
    } catch (error) {
        server.log.error('Error updating P2P network data:', error);
    }
}

// Start server
const start = async () => {
    try {
        const port = process.env.MONITOR_PORT || 3003;
        await server.listen({ port, host: '0.0.0.0' });
        server.log.info(`🚀 NodeBook P2P Network Monitor running on port ${port}`);
        server.log.info(`🌐 Monitoring P2P network: ${process.env.P2P_NETWORK_ID || 'nodebook-dev'}`);
        
        // Start periodic updates
        setInterval(updateP2PNetworkData, 10000); // Update every 10 seconds
        
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
