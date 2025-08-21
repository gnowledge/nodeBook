const path = require('path');
const fs = require('fs').promises;
const archiver = require('archiver');
const extract = require('extract-zip');
const { createReadStream, createWriteStream } = require('fs');
const GraphManager = require('./graph-manager');
const HyperGraph = require('./hyper-graph');

class DataManager {
  constructor() {
    this.userDataPath = null;
    this.graphManager = null;
  }

  async initialize(userDataPath) {
    this.userDataPath = userDataPath;
    
    // Initialize graph manager for this user
    this.graphManager = new GraphManager();
    await this.graphManager.initialize(userDataPath);
    
    // Ensure user data directory exists
    await fs.mkdir(userDataPath, { recursive: true });
    
    // Create subdirectories
    const subdirs = ['graphs', 'media', 'exports', 'backups'];
    for (const dir of subdirs) {
      await fs.mkdir(path.join(userDataPath, dir), { recursive: true });
    }
  }

  // Export user data as a compressed archive
  async exportUserData(options = {}) {
    const {
      includeGraphs = true,
      includeMedia = true,
      includeSettings = true,
      format = 'zip',
      filename = null
    } = options;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportFilename = filename || `nodebook-export-${timestamp}.${format}`;
    const exportPath = path.join(this.userDataPath, 'exports', exportFilename);

    return new Promise((resolve, reject) => {
      const output = createWriteStream(exportPath);
      const archive = archiver(format, {
        zlib: { level: 9 } // Maximum compression
      });

      output.on('close', () => {
        console.log(`Export completed: ${archive.pointer()} total bytes`);
        resolve({
          path: exportPath,
          size: archive.pointer(),
          filename: exportFilename
        });
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Add graphs
      if (includeGraphs) {
        const graphsPath = path.join(this.userDataPath, 'graphs');
        try {
          const graphs = fs.readdirSync(graphsPath);
          for (const graph of graphs) {
            const graphPath = path.join(graphsPath, graph);
            const stat = fs.statSync(graphPath);
            if (stat.isDirectory()) {
              archive.directory(graphPath, `graphs/${graph}`);
            }
          }
        } catch (error) {
          console.warn('Could not export graphs:', error.message);
        }
      }

      // Add media files
      if (includeMedia) {
        const mediaPath = path.join(this.userDataPath, 'media');
        try {
          const mediaFiles = fs.readdirSync(mediaPath);
          for (const file of mediaFiles) {
            const filePath = path.join(mediaPath, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
              archive.file(filePath, { name: `media/${file}` });
            }
          }
        } catch (error) {
          console.warn('Could not export media:', error.message);
        }
      }

      // Add user settings and metadata
      if (includeSettings) {
        const settingsPath = path.join(this.userDataPath, 'settings.json');
        try {
          if (fs.existsSync(settingsPath)) {
            archive.file(settingsPath, { name: 'settings.json' });
          }
        } catch (error) {
          console.warn('Could not export settings:', error.message);
        }
      }

      // Add export metadata
      const metadata = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        userDataPath: this.userDataPath,
        options: options
      };
      
      archive.append(JSON.stringify(metadata, null, 2), { name: 'export-metadata.json' });
      archive.finalize();
    });
  }

  // Import user data from an archive
  async importUserData(importPath, options = {}) {
    const {
      overwrite = false,
      validateOnly = false,
      backupBeforeImport = true
    } = options;

    // Validate import file
    if (!await this.validateImportFile(importPath)) {
      throw new Error('Invalid import file format');
    }

    // Create backup if requested
    if (backupBeforeImport) {
      await this.createBackup();
    }

    if (validateOnly) {
      return { valid: true, message: 'Import file validation successful' };
    }

    // Extract and import
    const tempDir = path.join(this.userDataPath, 'temp-import');
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Extract archive
      await extract(importPath, { dir: tempDir });

      // Read metadata
      const metadataPath = path.join(tempDir, 'export-metadata.json');
      let metadata = {};
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf8');
        metadata = JSON.parse(metadataContent);
      } catch (error) {
        console.warn('Could not read export metadata:', error.message);
      }

      // Import graphs
      const graphsPath = path.join(tempDir, 'graphs');
      if (await this.pathExists(graphsPath)) {
        await this.importGraphs(graphsPath, overwrite);
      }

      // Import media
      const mediaPath = path.join(tempDir, 'media');
      if (await this.pathExists(mediaPath)) {
        await this.importMedia(mediaPath, overwrite);
      }

      // Import settings
      const settingsPath = path.join(tempDir, 'settings.json');
      if (await this.pathExists(settingsPath)) {
        await this.importSettings(settingsPath, overwrite);
      }

      return {
        success: true,
        message: 'Import completed successfully',
        metadata: metadata
      };

    } finally {
      // Clean up temp directory
      await this.cleanupDirectory(tempDir);
    }
  }

  // Validate import file
  async validateImportFile(filePath) {
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) return false;

      const ext = path.extname(filePath).toLowerCase();
      return ['.zip', '.tar', '.tar.gz'].includes(ext);
    } catch (error) {
      return false;
    }
  }

  // Import graphs from extracted directory
  async importGraphs(graphsPath, overwrite) {
    const graphs = await fs.readdir(graphsPath);
    
    for (const graph of graphs) {
      const graphPath = path.join(graphsPath, graph);
      const stat = await fs.stat(graphPath);
      
      if (stat.isDirectory()) {
        const targetPath = path.join(this.userDataPath, 'graphs', graph);
        
        if (overwrite || !(await this.pathExists(targetPath))) {
          await this.copyDirectory(graphPath, targetPath);
          console.log(`Imported graph: ${graph}`);
        } else {
          console.log(`Skipped existing graph: ${graph}`);
        }
      }
    }
  }

  // Import media files
  async importMedia(mediaPath, overwrite) {
    const mediaFiles = await fs.readdir(mediaPath);
    
    for (const file of mediaFiles) {
      const filePath = path.join(mediaPath, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isFile()) {
        const targetPath = path.join(this.userDataPath, 'media', file);
        
        if (overwrite || !(await this.pathExists(targetPath))) {
          await fs.copyFile(filePath, targetPath);
          console.log(`Imported media: ${file}`);
        } else {
          console.log(`Skipped existing media: ${file}`);
        }
      }
    }
  }

  // Import user settings
  async importSettings(settingsPath, overwrite) {
    const targetPath = path.join(this.userDataPath, 'settings.json');
    
    if (overwrite || !(await this.pathExists(targetPath))) {
      await fs.copyFile(settingsPath, targetPath);
      console.log('Imported user settings');
    } else {
      console.log('Skipped existing settings');
    }
  }

  // Create backup of current user data
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `backup-${timestamp}.zip`;
    const backupPath = path.join(this.userDataPath, 'backups', backupFilename);

    return await this.exportUserData({
      filename: backupFilename,
      includeGraphs: true,
      includeMedia: true,
      includeSettings: true
    });
  }

  // Utility functions
  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  async cleanupDirectory(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.cleanupDirectory(fullPath);
        } else {
          await fs.unlink(fullPath);
        }
      }
      
      await fs.rmdir(dirPath);
    } catch (error) {
      console.warn('Could not cleanup directory:', error.message);
    }
  }

  // Get user data statistics
  async getUserDataStats() {
    const stats = {
      graphs: 0,
      media: 0,
      totalSize: 0,
      lastBackup: null,
      exports: []
    };

    try {
      // Count graphs
      const graphsPath = path.join(this.userDataPath, 'graphs');
      if (await this.pathExists(graphsPath)) {
        const graphs = await fs.readdir(graphsPath);
        stats.graphs = graphs.length;
      }

      // Count media files
      const mediaPath = path.join(this.userDataPath, 'media');
      if (await this.pathExists(mediaPath)) {
        const mediaFiles = await fs.readdir(mediaPath);
        stats.media = mediaFiles.length;
      }

      // Calculate total size
      stats.totalSize = await this.calculateDirectorySize(this.userDataPath);

      // Get backup info
      const backupsPath = path.join(this.userDataPath, 'backups');
      if (await this.pathExists(backupsPath)) {
        const backups = await fs.readdir(backupsPath);
        if (backups.length > 0) {
          const latestBackup = backups.sort().reverse()[0];
          stats.lastBackup = latestBackup;
        }
      }

      // Get exports info
      const exportsPath = path.join(this.userDataPath, 'exports');
      if (await this.pathExists(exportsPath)) {
        const exports = await fs.readdir(exportsPath);
        stats.exports = exports;
      }

    } catch (error) {
      console.warn('Could not get user data stats:', error.message);
    }

    return stats;
  }

  // Calculate directory size recursively
  async calculateDirectorySize(dirPath) {
    let totalSize = 0;
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          totalSize += await this.calculateDirectorySize(fullPath);
        } else {
          const stat = await fs.stat(fullPath);
          totalSize += stat.size;
        }
      }
    } catch (error) {
      console.warn('Could not calculate directory size:', error.message);
    }
    
    return totalSize;
  }
}

module.exports = DataManager;
