const Hyperdrive = require('hyperdrive');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

class MediaManager {
  constructor(dataPath) {
    console.log('🔧 MediaManager constructor called with dataPath:', dataPath);
    this.dataPath = dataPath;
    this.drives = new Map(); // Store active drives by userId
    this.mediaPath = path.join(dataPath, 'media');
    console.log('🔧 MediaManager mediaPath set to:', this.mediaPath);
  }

  /**
   * Initialize media storage for a user
   */
  async initializeUserMedia(userId) {
    const userMediaPath = path.join(this.mediaPath, userId.toString());
    const drivePath = path.join(userMediaPath, 'drive');
    
    try {
      await fs.mkdir(userMediaPath, { recursive: true });
      await fs.mkdir(drivePath, { recursive: true });
      
      // Create or load existing Hyperdrive
      const drive = new Hyperdrive(drivePath);
      await drive.ready();
      
      this.drives.set(userId, drive);
      
      console.log(`📁 Media storage initialized for user ${userId}`);
      return drive;
    } catch (error) {
      console.error(`❌ Failed to initialize media storage for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get or create user's media drive
   */
  async getUserDrive(userId) {
    if (!this.drives.has(userId)) {
      await this.initializeUserMedia(userId);
    }
    return this.drives.get(userId);
  }

  /**
   * Upload a file to user's media storage
   */
  async uploadFile(userId, fileBuffer, fileName, fileType, metadata = {}) {
    try {
      const drive = await this.getUserDrive(userId);
      
      // Generate unique file ID
      const fileId = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now();
      
      // Create file metadata
      const fileInfo = {
        id: fileId,
        name: fileName,
        type: fileType,
        size: fileBuffer.length,
        uploadedAt: timestamp,
        metadata: {
          ...metadata,
          originalName: fileName,
          mimeType: fileType
        }
      };

      // Store file in Hyperdrive
      const filePath = `files/${fileId}`;
      await drive.put(filePath, fileBuffer);
      
      // Store metadata
      const metadataPath = `metadata/${fileId}`;
      await drive.put(metadataPath, JSON.stringify(fileInfo));
      
      // Update file index
      await this.updateFileIndex(drive, fileId, fileInfo);
      
      console.log(`📤 File uploaded: ${fileName} (${fileId}) for user ${userId}`);
      return fileInfo;
      
    } catch (error) {
      console.error(`❌ File upload failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update the file index for quick listing
   */
  async updateFileIndex(drive, fileId, fileInfo) {
    try {
      // Get existing index
      let index = [];
      try {
        const indexEntry = await drive.get('index/files');
        if (indexEntry) {
          index = JSON.parse(indexEntry.value);
        }
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
      
      // Store updated index
      await drive.put('index/files', JSON.stringify(index));
      
    } catch (error) {
      console.error('❌ Failed to update file index:', error);
    }
  }

  /**
   * Get file from user's media storage
   */
  async getFile(userId, fileId) {
    try {
      const drive = await this.getUserDrive(userId);
      
      // Get file metadata
      const metadataEntry = await drive.get(`metadata/${fileId}`);
      if (!metadataEntry) {
        throw new Error('File not found');
      }
      
      const metadata = JSON.parse(metadataEntry.value);
      
      // Get file content
      const fileEntry = await drive.get(`files/${fileId}`);
      if (!fileEntry) {
        throw new Error('File content not found');
      }
      
      return {
        metadata,
        content: fileEntry.value
      };
      
    } catch (error) {
      console.error(`❌ Failed to get file ${fileId} for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * List all files for a user
   */
  async listFiles(userId, options = {}) {
    try {
      const drive = await this.getUserDrive(userId);
      
      // Get file index
      const indexEntry = await drive.get('index/files');
      if (!indexEntry) {
        return [];
      }
      
      let files = JSON.parse(indexEntry.value);
      
      // Apply filters
      if (options.type) {
        files = files.filter(f => f.type.startsWith(options.type));
      }
      
      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        files = files.filter(f => 
          f.name.toLowerCase().includes(searchTerm) ||
          (f.metadata.description && f.metadata.description.toLowerCase().includes(searchTerm))
        );
      }
      
      // Apply pagination
      if (options.limit) {
        const offset = options.offset || 0;
        files = files.slice(offset, offset + options.limit);
      }
      
      return files;
      
    } catch (error) {
      console.error(`❌ Failed to list files for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Delete a file from user's media storage
   */
  async deleteFile(userId, fileId) {
    try {
      const drive = await this.getUserDrive(userId);
      
      // Remove from file index
      let index = [];
      try {
        const indexEntry = await drive.get('index/files');
        if (indexEntry) {
          index = JSON.parse(indexEntry.value);
          index = index.filter(f => f.id !== fileId);
          await drive.put('index/files', JSON.stringify(index));
        }
      } catch (e) {
        // Index doesn't exist
      }
      
      // Remove file and metadata
      await drive.del(`files/${fileId}`);
      await drive.del(`metadata/${fileId}`);
      
      console.log(`🗑️ File deleted: ${fileId} for user ${userId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to delete file ${fileId} for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(userId, fileId, updates) {
    try {
      const drive = await this.getUserDrive(userId);
      
      // Get existing metadata
      const metadataEntry = await drive.get(`metadata/${fileId}`);
      if (!metadataEntry) {
        throw new Error('File not found');
      }
      
      const metadata = JSON.parse(metadataEntry.value);
      const updatedMetadata = { ...metadata, ...updates };
      
      // Store updated metadata
      await drive.put(`metadata/${fileId}`, JSON.stringify(updatedMetadata));
      
      // Update file index
      await this.updateFileIndex(drive, fileId, updatedMetadata);
      
      console.log(`✏️ File metadata updated: ${fileId} for user ${userId}`);
      return updatedMetadata;
      
    } catch (error) {
      console.error(`❌ Failed to update file metadata for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get storage statistics for a user
   */
  async getStorageStats(userId) {
    try {
      const drive = await this.getUserDrive(userId);
      const files = await this.listFiles(userId);
      
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const fileCount = files.length;
      
      // Group by type
      const typeStats = {};
      files.forEach(file => {
        const type = file.type.split('/')[0]; // image, video, document, etc.
        typeStats[type] = (typeStats[type] || 0) + 1;
      });
      
      return {
        totalSize,
        fileCount,
        typeStats,
        files: files.slice(0, 10) // Recent files
      };
      
    } catch (error) {
      console.error(`❌ Failed to get storage stats for user ${userId}:`, error);
      return { totalSize: 0, fileCount: 0, typeStats: {}, files: [] };
    }
  }

  /**
   * Clean up user's media storage
   */
  async cleanupUserMedia(userId) {
    try {
      const drive = this.drives.get(userId);
      if (drive) {
        await drive.close();
        this.drives.delete(userId);
      }
      
      console.log(`🧹 Media storage cleaned up for user ${userId}`);
      
    } catch (error) {
      console.error(`❌ Failed to cleanup media storage for user ${userId}:`, error);
    }
  }

  /**
   * Get drive key for sharing
   */
  async getDriveKey(userId) {
    try {
      const drive = await this.getUserDrive(userId);
      return drive.key.toString('hex');
    } catch (error) {
      console.error(`❌ Failed to get drive key for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Mount a shared drive
   */
  async mountSharedDrive(userId, driveKey, mountName) {
    try {
      const key = Buffer.from(driveKey, 'hex');
      const mountPath = path.join(this.mediaPath, userId.toString(), 'mounts', mountName);
      
      await fs.mkdir(mountPath, { recursive: true });
      
      const drive = new Hyperdrive(mountPath, key);
      await drive.ready();
      
      // Store mounted drive reference
      if (!this.drives.has(userId)) {
        this.drives.set(userId, new Map());
      }
      
      const userDrives = this.drives.get(userId);
      userDrives.set(mountName, drive);
      
      console.log(`🔗 Shared drive mounted: ${mountName} for user ${userId}`);
      return drive;
      
    } catch (error) {
      console.error(`❌ Failed to mount shared drive for user ${userId}:`, error);
      throw error;
    }
  }
}

module.exports = MediaManager;
