import Fastify from 'fastify';
import cors from '@fastify/cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = Fastify({
    logger: { level: 'info' }
});

const PORT = process.env.PORT || 3005;

// Register the health check route
server.get('/api/health', async (request, reply) => {
    return {
        message: 'NodeBook Authentication Service is running',
        timestamp: new Date().toISOString(),
        status: 'healthy',
        version: '1.0.0'
    };
});

// Basic login endpoint for testing
server.post('/api/auth/login', async (request, reply) => {
    try {
        const { username, password } = request.body;
        
        // Simple test authentication
        if (username === 'admin' && password === 'admin123') {
            return {
                success: true,
                token: 'test-jwt-token-for-admin',
                user: {
                    id: 1,
                    username: 'admin',
                    email: 'admin@nodebook.local',
                    isAdmin: true,
                    dataDirectory: '/app/user_data/admin'
                }
            };
        }
        
        reply.code(401).send({ error: 'Invalid credentials' });
    } catch (error) {
        server.log.error('Login error:', error);
        reply.code(500).send({ error: 'Login failed' });
    }
});

// Basic register endpoint for testing
server.post('/api/auth/register', async (request, reply) => {
    try {
        const { username, email, password } = request.body;
        
        if (!username || !email || !password) {
            return reply.code(400).send({ error: 'Username, email, and password are required' });
        }
        
        // Simple test registration - always succeed for testing
        return {
            success: true,
            message: 'User registered successfully',
            user: {
                id: Date.now(), // Generate a unique ID
                username: username,
                email: email,
                isAdmin: false,
                dataDirectory: `/app/user_data/${username}`
            }
        };
    } catch (error) {
        server.log.error('Registration error:', error);
        reply.code(500).send({ error: 'Registration failed' });
    }
});

// JWT verification endpoint for the P2P backend
server.post('/api/auth/verify', async (request, reply) => {
    try {
        const { token } = request.body;
        
        if (!token) {
            return reply.code(400).send({ error: 'Token is required' });
        }
        
        // For now, accept any token that matches our test token
        // In production, this would validate the JWT signature
        if (token === 'test-jwt-token-for-admin') {
            return {
                success: true,
                user: {
                    id: 1,
                    username: 'admin',
                    email: 'admin@nodebook.local',
                    isAdmin: true,
                    dataDirectory: '/app/user_data/admin'
                }
            };
        }
        
        reply.code(401).send({ error: 'Invalid token' });
    } catch (error) {
        server.log.error('Token verification error:', error);
        reply.code(500).send({ error: 'Token verification failed' });
    }
});

// Step 1: Just CORS registration
async function initializeServer() {
    try {
        console.log('🔧 Step 1: Registering CORS...');
        await server.register(cors, {
            origin: true,
            credentials: true
        });
        console.log('✅ CORS registered successfully');
    } catch (error) {
        console.error('❌ CORS registration failed:', error);
        throw error;
    }
}

// Start server
const start = async () => {
    try {
        console.log('🚀 Starting auth service (Step 1)...');
        await initializeServer();
        await server.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`✅ Auth service (Step 1) running on port ${PORT}`);
    } catch (err) {
        console.error('❌ Failed to start:', err);
        process.exit(1);
    }
};

start();
