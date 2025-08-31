import Fastify from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = Fastify({
    logger: { level: 'info' }
});

const PORT = process.env.PORT || 3005;

// Simple health check endpoint
server.get('/api/health', async (request, reply) => {
    return {
        message: 'NodeBook Authentication Service is running',
        timestamp: new Date().toISOString(),
        status: 'healthy',
        version: '1.0.0'
    };
});

// Start server
const start = async () => {
    try {
        console.log('🚀 Starting minimal auth service...');
        await server.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`✅ Minimal auth service running on port ${PORT}`);
    } catch (err) {
        console.error('❌ Failed to start:', err);
        process.exit(1);
    }
};

start();
