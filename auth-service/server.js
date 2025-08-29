/**
 * NodeBook Authentication Microservice
 * 
 * This service handles all authentication and user management:
 * - User registration and login
 * - JWT token generation and validation
 * - Password management
 * - User profile management
 * - Session management
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Fastify server
const server = Fastify({
    logger: {
        level: 'info'
    }
});

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const PORT = process.env.PORT || 3005;

// Database setup
let db;

async function initializeDatabase() {
    const dbPath = path.join(__dirname, 'users.db');
    
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        server.log.info('✅ Authentication database opened successfully');
    } catch (error) {
        server.log.error('❌ Failed to open authentication database:', error);
        throw error;
    }

    // Create users table if it doesn't exist
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT 0,
            email_verified BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME,
            data_directory TEXT NOT NULL
        )
    `);

    // Create default admin user if no users exist
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
        const adminPassword = process.env.ADMIN_PASSWORD || 
            Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
        
        const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
        const adminDataDir = path.join(__dirname, '..', 'nodebook-base', 'user_data', 'admin');
        
        await db.run(`
            INSERT INTO users (username, email, password_hash, is_admin, email_verified, data_directory)
            VALUES (?, ?, ?, ?, ?, ?)
        `, ['admin', 'admin@nodebook.local', adminPasswordHash, 1, 1, adminDataDir]);

        if (process.env.ADMIN_PASSWORD) {
            server.log.info('✅ Admin user created with environment password');
        } else {
            server.log.warn('⚠️  Admin user created with generated password:', adminPassword);
            server.log.warn('⚠️  Set ADMIN_PASSWORD environment variable for production!');
        }
    }
}

// Register plugins
await server.register(cors, {
    origin: true,
    credentials: true
});

await server.register(jwt, {
    secret: JWT_SECRET
});

// Health check endpoint
server.get('/api/health', async (request, reply) => {
    return {
        message: 'NodeBook Authentication Service is running',
        timestamp: new Date().toISOString(),
        status: 'healthy',
        version: '1.0.0',
        database: db ? 'connected' : 'disconnected'
    };
});

// User registration endpoint
server.post('/api/auth/register', async (request, reply) => {
    try {
        const { username, email, password } = request.body;
        
        if (!username || !password) {
            return reply.code(400).send({ error: 'Username and password are required' });
        }

        // Check if user already exists
        const existingUser = await db.get('SELECT username FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return reply.code(409).send({ error: 'Username already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        const dataDirectory = path.join(__dirname, '..', 'nodebook-base', 'user_data', username);
        
        // Create user
        const result = await db.run(`
            INSERT INTO users (username, email, password_hash, data_directory)
            VALUES (?, ?, ?, ?)
        `, [username, email || null, passwordHash, dataDirectory]);

        server.log.info(`✅ User registered: ${username}`);
        
        return {
            success: true,
            message: 'User registered successfully',
            userId: result.lastID
        };
    } catch (error) {
        server.log.error('Registration error:', error);
        return reply.code(500).send({ error: 'Registration failed' });
    }
});

// User login endpoint
server.post('/api/auth/login', async (request, reply) => {
    try {
        const { username, password } = request.body;
        
        if (!username || !password) {
            return reply.code(400).send({ error: 'Username and password are required' });
        }

        // Find user
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (!user) {
            return reply.code(401).send({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return reply.code(401).send({ error: 'Invalid credentials' });
        }

        // Update last login
        await db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        // Generate JWT token
        const token = server.jwt.sign({
            userId: user.id,
            username: user.username,
            isAdmin: user.is_admin
        }, { expiresIn: JWT_EXPIRES_IN });

        server.log.info(`✅ User logged in: ${username}`);
        
        return {
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.is_admin,
                dataDirectory: user.data_directory
            }
        };
    } catch (error) {
        server.log.error('Login error:', error);
        return reply.code(500).send({ error: 'Authentication failed' });
    }
});

// JWT verification endpoint
server.post('/api/auth/verify', async (request, reply) => {
    try {
        const { token } = request.body;
        
        if (!token) {
            return reply.code(400).send({ error: 'Token is required' });
        }

        const decoded = server.jwt.verify(token);
        
        // Get user details
        const user = await db.get('SELECT id, username, email, is_admin, data_directory FROM users WHERE id = ?', [decoded.userId]);
        if (!user) {
            return reply.code(401).send({ error: 'Invalid token' });
        }

        return {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.is_admin,
                dataDirectory: user.data_directory
            }
        };
    } catch (error) {
        server.log.error('Token verification error:', error);
        return reply.code(401).send({ error: 'Invalid token' });
    }
});

// User profile endpoint
server.get('/api/auth/profile/:username', async (request, reply) => {
    try {
        const { username } = request.params;
        
        const user = await db.get('SELECT id, username, email, is_admin, created_at, last_login, data_directory FROM users WHERE username = ?', [username]);
        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }

        return {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.is_admin,
                createdAt: user.created_at,
                lastLogin: user.last_login,
                dataDirectory: user.data_directory
            }
        };
    } catch (error) {
        server.log.error('Profile retrieval error:', error);
        return reply.code(500).send({ error: 'Failed to retrieve profile' });
    }
});

// Password change endpoint
server.post('/api/auth/change-password', async (request, reply) => {
    try {
        const { username, currentPassword, newPassword } = request.body;
        
        if (!username || !currentPassword || !newPassword) {
            return reply.code(400).send({ error: 'All fields are required' });
        }

        // Find user
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return reply.code(401).send({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, user.id]);

        server.log.info(`✅ Password changed for user: ${username}`);
        
        return {
            success: true,
            message: 'Password changed successfully'
        };
    } catch (error) {
        server.log.error('Password change error:', error);
        return reply.code(500).send({ error: 'Password change failed' });
    }
});

// Admin: List all users endpoint
server.get('/api/admin/users', async (request, reply) => {
    try {
        // TODO: Add admin authentication middleware
        const users = await db.all('SELECT id, username, email, is_admin, created_at, last_login FROM users');
        
        return {
            success: true,
            users: users.map(user => ({
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.is_admin,
                createdAt: user.created_at,
                lastLogin: user.last_login
            }))
        };
    } catch (error) {
        server.log.error('User list error:', error);
        return reply.code(500).send({ error: 'Failed to retrieve users' });
    }
});

// Start server
const start = async () => {
    try {
        await initializeDatabase();
        await server.listen({ port: PORT, host: '0.0.0.0' });
        server.log.info(`🚀 NodeBook Authentication Service running on port ${PORT}`);
        server.log.info(`🔐 JWT Secret: ${JWT_SECRET.substring(0, 10)}...`);
        server.log.info(`⏰ Token Expiry: ${JWT_EXPIRES_IN}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
