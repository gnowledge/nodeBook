import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';

class MediaManager {
  constructor(dataPath) {
    console.log('🔧 MediaManager constructor called with dataPath:', dataPath);
    this.dataPath = dataPath;
    this.mediaPath = path.join(dataPath, 'media');
    console.log('🔧 MediaManager mediaPath set to:', this.mediaPath);
  }

  /**
   * Initialize media storage for a user
   */
  async initializeUserMedia(userId) {
    const userMediaPath = path.join(this.mediaPath, userId.toString());
    await fs.mkdir(userMediaPath, { recursive: true });
    console.log(`✅ Media storage initialized for user ${userId}`);
    return userMediaPath;
  }

  /**
   * Upload a file
   */
  async uploadFile(userId, fileBuffer, filename, metadata = {}) {
    const userMediaPath = await this.initializeUserMedia(userId);
    const fileId = crypto.randomUUID();
    const filePath = path.join(userMediaPath, fileId);
    
    await fs.writeFile(filePath, fileBuffer);
    
    const fileInfo = {
      id: fileId,
      filename,
      path: filePath,
      size: fileBuffer.length,
      uploadedAt: new Date().toISOString(),
      ...metadata
    };
    
    // Save metadata
    const metadataPath = path.join(userMediaPath, `${fileId}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(fileInfo, null, 2));
    
    return fileInfo;
  }

  /**
   * List files for a user
   */
  async listFiles(userId, options = {}) {
    try {
      const userMediaPath = path.join(this.mediaPath, userId.toString());
      const files = await fs.readdir(userMediaPath);
      
      const fileList = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const metadataPath = path.join(userMediaPath, file);
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
          fileList.push(metadata);
        }
      }
      
      return fileList;
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  /**
   * Get a file by ID
   */
  async getFile(userId, fileId) {
    try {
      const userMediaPath = path.join(this.mediaPath, userId.toString());
      const metadataPath = path.join(userMediaPath, `${fileId}.json`);
      const filePath = path.join(userMediaPath, fileId);
      
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      const fileBuffer = await fs.readFile(filePath);
      
      return {
        ...metadata,
        buffer: fileBuffer
      };
    } catch (error) {
      console.error('Error getting file:', error);
      return null;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(userId, fileId) {
    try {
      const userMediaPath = path.join(this.mediaPath, userId.toString());
      const metadataPath = path.join(userMediaPath, `${fileId}.json`);
      const filePath = path.join(userMediaPath, fileId);
      
      await fs.unlink(metadataPath);
      await fs.unlink(filePath);
      
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(userId, fileId, updates) {
    try {
      const userMediaPath = path.join(this.mediaPath, userId.toString());
      const metadataPath = path.join(userMediaPath, `${fileId}.json`);
      
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      const updatedMetadata = { ...metadata, ...updates };
      
      await fs.writeFile(metadataPath, JSON.stringify(updatedMetadata, null, 2));
      
      return updatedMetadata;
    } catch (error) {
      console.error('Error updating file metadata:', error);
      return null;
    }
  }

  /**
   * Get storage stats for a user
   */
  async getStorageStats(userId) {
    try {
      const userMediaPath = path.join(this.mediaPath, userId.toString());
      const files = await this.listFiles(userId);
      
      const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
      const fileCount = files.length;
      
      return {
        userId,
        totalSize,
        fileCount,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { userId, totalSize: 0, fileCount: 0, lastUpdated: new Date().toISOString() };
    }
  }
}

export default MediaManager;
