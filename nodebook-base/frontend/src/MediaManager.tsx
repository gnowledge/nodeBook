import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from './api-config';
import styles from './MediaManager.module.css';

interface MediaFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
  metadata: {
    description?: string;
    tags?: string[];
    graphId?: string;
    nodeId?: string;
    originalName: string;
    mimeType: string;
  };
}

interface MediaManagerProps {
  graphId?: string;
  nodeId?: string;
  onFileSelect?: (file: MediaFile) => void;
  showUpload?: boolean;
  showList?: boolean;
}

export function MediaManager({ 
  graphId, 
  nodeId, 
  onFileSelect, 
  showUpload = true, 
  showList = true 
}: MediaManagerProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragAreaRef = useRef<HTMLDivElement>(null);

  // Load files on component mount
  useEffect(() => {
    if (showList) {
      loadFiles();
    }
  }, [showList]);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const params = new URLSearchParams();
      if (selectedType) params.append('type', selectedType);
      if (searchTerm) params.append('search', searchTerm);
      if (graphId) params.append('graphId', graphId);

      const url = `${API_BASE_URL}/api/media/files?${params}`;
      console.log('🔍 MediaManager: Making request to:', url);
      console.log('🔍 API_BASE_URL value:', API_BASE_URL);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load files: ${response.statusText}`);
      }

      const data = await response.json();
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token');
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        
        if (graphId) formData.append('graphId', graphId);
        if (nodeId) formData.append('nodeId', nodeId);
        
        // Add description if available
        const description = prompt(`Enter description for ${file.name} (optional):`);
        if (description) {
          formData.append('description', description);
        }

        const uploadUrl = `${API_BASE_URL}/api/media/upload`;
        console.log('🔍 MediaManager: Uploading to:', uploadUrl);
        
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}: ${response.statusText}`);
        }

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      // Reload files after successful upload
      await loadFiles();
      setUploadProgress(0);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_BASE_URL}/api/media/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.statusText}`);
      }

      // Remove file from local state
      setFiles(files.filter(f => f.id !== fileId));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleFileSelect = (file: MediaFile) => {
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.startsWith('text/')) return '📄';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('zip') || mimeType.includes('tar')) return '📦';
    return '📎';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragAreaRef.current) {
      dragAreaRef.current.classList.add(styles.dragOver);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragAreaRef.current) {
      dragAreaRef.current.classList.remove(styles.dragOver);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragAreaRef.current) {
      dragAreaRef.current.classList.remove(styles.dragOver);
    }
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  return (
    <div className={styles.mediaManager}>
      {showUpload && (
        <div className={styles.uploadSection}>
          <h3>Upload Files</h3>
          
          <div 
            ref={dragAreaRef}
            className={styles.dragArea}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={styles.dragContent}>
              <span className={styles.dragIcon}>📁</span>
              <p>Drag & drop files here or click to browse</p>
              <small>Supports images, documents, videos, and more</small>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            style={{ display: 'none' }}
            accept="image/*,video/*,audio/*,text/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.tar"
          />

          {uploading && (
            <div className={styles.uploadProgress}>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
          )}
        </div>
      )}

      {showList && (
        <div className={styles.fileListSection}>
          <div className={styles.fileListHeader}>
            <h3>Media Files</h3>
            
            <div className={styles.controls}>
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className={styles.typeFilter}
              >
                <option value="">All Types</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="audio">Audio</option>
                <option value="text">Documents</option>
                <option value="application">Applications</option>
              </select>
              
              <button 
                onClick={loadFiles}
                disabled={loading}
                className={styles.refreshBtn}
              >
                {loading ? '🔄' : '🔄'}
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.error}>
              ❌ {error}
            </div>
          )}

          {loading ? (
            <div className={styles.loading}>Loading files...</div>
          ) : files.length === 0 ? (
            <div className={styles.emptyState}>
              <span>📁</span>
              <p>No files uploaded yet</p>
              <small>Upload your first file to get started</small>
            </div>
          ) : (
            <div className={styles.fileGrid}>
              {files.map(file => (
                <div key={file.id} className={styles.fileCard}>
                  <div className={styles.fileHeader}>
                    <span className={styles.fileIcon}>
                      {getFileIcon(file.metadata.mimeType)}
                    </span>
                    <div className={styles.fileInfo}>
                      <h4>{file.name}</h4>
                      <small>{formatFileSize(file.size)} • {formatDate(file.uploadedAt)}</small>
                    </div>
                  </div>
                  
                  {file.metadata.description && (
                    <p className={styles.fileDescription}>{file.metadata.description}</p>
                  )}
                  
                  {file.metadata.tags && file.metadata.tags.length > 0 && (
                    <div className={styles.fileTags}>
                      {file.metadata.tags.map(tag => (
                        <span key={tag} className={styles.tag}>{tag}</span>
                      ))}
                    </div>
                  )}
                  
                  <div className={styles.fileActions}>
                    <button
                      onClick={() => handleFileSelect(file)}
                      className={styles.selectBtn}
                      title="Select this file"
                    >
                      ✅ Select
                    </button>
                    
                    <button
                      onClick={() => handleFileDelete(file.id)}
                      className={styles.deleteBtn}
                      title="Delete this file"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
