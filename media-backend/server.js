const fastify = require('fastify')({ logger: true });
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Register multipart plugin
fastify.register(require('@fastify/multipart'), {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Max 10 files per request
  }
});

// Register CORS plugin
fastify.register(require('@fastify/cors'), {
  origin: true, // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

// Configuration
const PORT = process.env.PORT || 3001;
const DATA_PATH = process.env.DATA_PATH || './media-data';

// Initialize file-based media storage
let mediaDataPath = null;

async function initializeMediaStorage() {
  try {
    console.log('🔧 Initializing file-based media storage...');
    console.log('🔧 Data path:', DATA_PATH);
    
    await fs.mkdir(DATA_PATH, { recursive: true });
    await fs.mkdir(path.join(DATA_PATH, 'files'), { recursive: true });
    await fs.mkdir(path.join(DATA_PATH, 'metadata'), { recursive: true });
    
    mediaDataPath = DATA_PATH;
    console.log('✅ File-based media storage initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize media storage:', error);
    throw error;
  }
}

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    service: 'media-backend-dev',
    storage: mediaDataPath ? 'ready' : 'not-ready',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };
});

// File upload endpoint
fastify.post('/api/media/upload', async (request, reply) => {
  try {
    if (!mediaDataPath) {
      reply.code(503).send({ error: 'Media storage not ready' });
      return;
    }

    const data = await request.file();
    if (!data) {
      reply.code(400).send({ error: 'No file uploaded' });
      return;
    }

    const buffer = await data.toBuffer();
    const fileName = data.filename;
    const mimeType = data.mimetype;
    
    // Get form fields
    const description = data.fields.description?.value || '';
    const tags = data.fields.tags?.value ? data.fields.tags.value.split(',').map(t => t.trim()) : [];
    
    // Generate unique file ID
    const fileId = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    
    // Create file metadata
    const fileInfo = {
      id: fileId,
      name: fileName,
      type: mimeType,
      size: buffer.length,
      description,
      tags,
      uploadedAt: timestamp
    };

    console.log(`📤 Uploading file: ${fileName} (${fileId})`);

    // Save file to disk
    const filePath = path.join(mediaDataPath, 'files', fileId);
    await fs.writeFile(filePath, buffer);
    
    // Save metadata
    const metadataPath = path.join(mediaDataPath, 'metadata', `${fileId}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(fileInfo, null, 2));
    
    // Update file index
    await updateFileIndex(fileId, fileInfo);
    
    console.log(`✅ File uploaded successfully: ${fileName}`);
    
    reply.code(201);
    return {
      success: true,
      fileId,
      fileInfo
    };
    
  } catch (error) {
    console.error('❌ File upload failed:', error);
    reply.code(500).send({ error: error.message });
  }
});

// File listing endpoint
fastify.get('/api/media/files', async (request, reply) => {
  try {
    if (!mediaDataPath) {
      reply.code(503).send({ error: 'Media storage not ready' });
      return;
    }

    console.log('📋 Listing files...');
    
    // Read file index
    let index = [];
    try {
      const indexPath = path.join(mediaDataPath, 'index.json');
      const indexData = await fs.readFile(indexPath, 'utf8');
      index = JSON.parse(indexData);
    } catch (e) {
      console.log('📝 No file index found, starting fresh');
    }
    
    console.log(`✅ Found ${index.length} files`);
    return {
      success: true,
      files: index,
      count: index.length
    };
    
  } catch (error) {
    console.error('❌ Failed to list files:', error);
    reply.code(500).send({ error: error.message });
  }
});

// File download endpoint
fastify.get('/api/media/files/:fileId', async (request, reply) => {
  try {
    if (!mediaDataPath) {
      reply.code(503).send({ error: 'Media storage not ready' });
      return;
    }

    const { fileId } = request.params;
    console.log(`📥 Downloading file: ${fileId}`);
    
    // Read file metadata
    const metadataPath = path.join(mediaDataPath, 'metadata', `${fileId}.json`);
    const metadataData = await fs.readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataData);
    
    // Read file content
    const filePath = path.join(mediaDataPath, 'files', fileId);
    const fileBuffer = await fs.readFile(filePath);
    
    // Set response headers
    reply.header('Content-Type', metadata.type);
    reply.header('Content-Disposition', `inline; filename="${metadata.name}"`);
    reply.header('Content-Length', metadata.size);
    
    console.log(`✅ File downloaded successfully: ${metadata.name}`);
    return fileBuffer;
    
  } catch (error) {
    console.error('❌ File download failed:', error);
    reply.code(500).send({ error: error.message });
  }
});

// File info endpoint
fastify.get('/api/media/files/:fileId/info', async (request, reply) => {
  try {
    if (!mediaDataPath) {
      reply.code(503).send({ error: 'Media storage not ready' });
      return;
    }

    const { fileId } = request.params;
    console.log(`ℹ️ Getting file info: ${fileId}`);
    
    // Read file metadata
    const metadataPath = path.join(mediaDataPath, 'metadata', `${fileId}.json`);
    const metadataData = await fs.readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataData);
    
    console.log(`✅ File info retrieved: ${metadata.name}`);
    return {
      success: true,
      fileInfo: metadata
    };
    
  } catch (error) {
    console.error('❌ Failed to get file info:', error);
    reply.code(500).send({ error: error.message });
  }
});

// Delete file endpoint
fastify.delete('/api/media/files/:fileId', async (request, reply) => {
  try {
    if (!mediaDataPath) {
      reply.code(503).send({ error: 'Media storage not ready' });
      return;
    }

    const { fileId } = request.params;
    console.log(`🗑️ Deleting file: ${fileId}`);

    // Read file metadata first
    const metadataPath = path.join(mediaDataPath, 'metadata', `${fileId}.json`);
    let metadata;
    try {
      const metadataData = await fs.readFile(metadataPath, 'utf8');
      metadata = JSON.parse(metadataData);
    } catch (e) {
      reply.code(404).send({ error: 'File not found' });
      return;
    }

    // Delete the actual file
    const filePath = path.join(mediaDataPath, 'files', fileId);
    try {
      await fs.unlink(filePath);
    } catch (e) {
      console.warn(`⚠️ File not found at ${filePath}, continuing with cleanup`);
    }

    // Delete metadata
    try {
      await fs.unlink(metadataPath);
    } catch (e) {
      console.warn(`⚠️ Metadata not found at ${metadataPath}, continuing with cleanup`);
    }

    // Remove from index
    await removeFromFileIndex(fileId);

    console.log(`✅ File deleted successfully: ${metadata.name}`);
    return {
      success: true,
      message: `File ${metadata.name} deleted successfully`
    };

  } catch (error) {
    console.error('❌ File deletion failed:', error);
    reply.code(500).send({ error: error.message });
  }
});

// Helper function to remove file from index
async function removeFromFileIndex(fileId) {
  try {
    let index = [];
    try {
      const indexPath = path.join(mediaDataPath, 'index.json');
      const indexData = await fs.readFile(indexPath, 'utf8');
      index = JSON.parse(indexData);
    } catch (e) {
      // Index doesn't exist, nothing to remove
      return;
    }

    // Remove file from index
    const filteredIndex = index.filter(f => f.id !== fileId);
    
    if (filteredIndex.length !== index.length) {
      // Save updated index
      const indexPath = path.join(mediaDataPath, 'index.json');
      await fs.writeFile(indexPath, JSON.stringify(filteredIndex, null, 2));
      console.log(`📝 File index updated, removed file ${fileId}`);
    }
  } catch (error) {
    console.error('❌ Failed to remove file from index:', error);
  }
}

// Helper function to update file index
async function updateFileIndex(fileId, fileInfo) {
  try {
    // Read existing index
    let index = [];
    try {
      const indexPath = path.join(mediaDataPath, 'index.json');
      const indexData = await fs.readFile(indexPath, 'utf8');
      index = JSON.parse(indexData);
    } catch (e) {
      // Index doesn't exist yet
    }
    
    // Add new file to index
    const existingIndex = index.findIndex(f => f.id === fileId);
    if (existingIndex >= 0) {
      index[existingIndex] = fileInfo;
    } else {
      index.push(fileInfo);
    }
    
    // Sort by upload date (newest first)
    index.sort((a, b) => b.uploadedAt - a.uploadedAt);
    
    // Save updated index
    const indexPath = path.join(mediaDataPath, 'index.json');
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    
    console.log(`📝 File index updated, total files: ${index.length}`);
  } catch (error) {
    console.error('❌ Failed to update file index:', error);
  }
}

// Start server
async function start() {
  try {
    // Initialize media storage
    await initializeMediaStorage();
    
    // Start Fastify server
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    
    console.log(`🚀 Working Media Backend Server running on http://localhost:${PORT}`);
    console.log(`📱 Health check: http://localhost:${PORT}/health`);
    console.log(`📁 Media API: http://localhost:${PORT}/api/media`);
    console.log(`💾 Storage: ${mediaDataPath}`);
    
  } catch (error) {
    console.error('❌ Failed to start media server:', error);
    process.exit(1);
  }
}

start();
