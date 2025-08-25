import React, { useState, useEffect, useRef } from 'react';
import styles from './MediaManager.module.css';

// Media backend configuration
const MEDIA_BACKEND_URL = import.meta.env.VITE_MEDIA_BACKEND_URL || 'http://localhost:3001';

interface MediaFile {
  id: string;
  name: string;
  type: string;
  size: number;
  description?: string;
  tags?: string[];
  uploadedAt: number;
}

interface MediaManagerProps {
  graphId?: string;
  nodeId?: string;
  onFileSelect?: (file: MediaFile) => void;
  showUpload?: boolean;
  showList?: boolean;
  showUsageInstructions?: boolean;
}

export function MediaManager({ 
  graphId, 
  nodeId, 
  onFileSelect, 
  showUpload = true, 
  showList = true,
  showUsageInstructions = true
}: MediaManagerProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [showUsageModal, setShowUsageModal] = useState(false);
  
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
      const url = `${MEDIA_BACKEND_URL}/api/media/files`;
      console.log('🔍 MediaManager: Loading files from media backend:', url);
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to load files: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success && data.files) {
        setFiles(data.files);
      } else {
        setFiles([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
      console.error('❌ MediaManager: Error loading files:', err);
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
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        
        // Add description if available
        const description = prompt(`Enter description for ${file.name} (optional):`);
        if (description) {
          formData.append('description', description);
        }

        // Add tags if available
        const tags = prompt(`Enter tags for ${file.name} (comma-separated, optional):`);
        if (tags) {
          formData.append('tags', tags);
        }

        const uploadUrl = `${MEDIA_BACKEND_URL}/api/media/upload`;
        console.log('🔍 MediaManager: Uploading to media backend:', uploadUrl);
        
        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(`Upload failed: ${result.error || 'Unknown error'}`);
        }

        setUploadProgress(((i + 1) / files.length) * 100);
        console.log(`✅ File uploaded successfully: ${file.name}`);
      }

      // Reload files after successful upload
      await loadFiles();
      setUploadProgress(0);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      console.error('❌ MediaManager: Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch(`${MEDIA_BACKEND_URL}/api/media/files/${fileId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.statusText}`);
      }

      // Remove file from local state
      setFiles(files.filter(f => f.id !== fileId));
      console.log(`✅ File deleted successfully: ${fileId}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      console.error('❌ MediaManager: Delete error:', err);
    }
  };

  const handleFileSelect = (file: MediaFile) => {
    setSelectedFile(file);
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const viewFile = (file: MediaFile) => {
    const fileUrl = `${MEDIA_BACKEND_URL}/api/media/files/${file.id}`;
    window.open(fileUrl, '_blank');
  };

  const downloadFile = (file: MediaFile) => {
    const fileUrl = `${MEDIA_BACKEND_URL}/api/media/files/${file.id}`;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyImageUrl = async (file: MediaFile) => {
    const imageUrl = `${MEDIA_BACKEND_URL}/api/media/files/${file.id}`;
    try {
      await navigator.clipboard.writeText(imageUrl);
      alert('Image URL copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = imageUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Image URL copied to clipboard!');
    }
  };

  const copyImageMarkdown = async (file: MediaFile) => {
    const imageUrl = `${MEDIA_BACKEND_URL}/api/media/files/${file.id}`;
    const markdown = `![${file.name}](${imageUrl})`;
    try {
      await navigator.clipboard.writeText(markdown);
      alert('Image markdown copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = markdown;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Image markdown copied to clipboard!');
    }
  };

  const copyImageHtml = async (file: MediaFile) => {
    const imageUrl = `${MEDIA_BACKEND_URL}/api/media/files/${file.id}`;
    const html = `<img src="${imageUrl}" alt="${file.name}" />`;
    try {
      await navigator.clipboard.writeText(html);
      alert('Image HTML copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = html;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Image HTML copied to clipboard!');
    }
  };

  const copyImageAttribute = async (file: MediaFile) => {
    const imageUrl = `${MEDIA_BACKEND_URL}/api/media/files/${file.id}`;
    const attribute = `has Image: ${imageUrl}`;
    try {
      await navigator.clipboard.writeText(attribute);
      alert('Image attribute copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = attribute;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Image attribute copied to clipboard!');
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

  const filteredFiles = files.filter(file => {
    const matchesSearch = !searchTerm || 
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (file.description && file.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = !selectedType || file.type.startsWith(selectedType);
    
    return matchesSearch && matchesType;
  });

  return (
    <div className={styles.mediaManager}>
      {showUsageInstructions && (
        <div className={styles.usageInstructions}>
          <h3>📖 How to Use Media in Your Graphs</h3>
          <div className={styles.usageContent}>
            <div className={styles.usageSection}>
              <h4>🖼️ For Images:</h4>
              <ul>
                <li><strong>View:</strong> Click "👁️ View" to see the image in a new tab</li>
                <li><strong>Download:</strong> Click "⬇️ Download" to save the image locally</li>
                <li><strong>Copy Markdown:</strong> Click "📝 MD" to copy markdown format</li>
                <li><strong>Copy HTML:</strong> Click "🌐 HTML" to copy HTML img tag</li>
                <li><strong>Copy Attribute:</strong> Click "📝 Attr" to copy CNL attribute format</li>
                <li><strong>Node Attributes:</strong> Use "has Image: URL" syntax in node definitions</li>
              </ul>
            </div>
            <div className={styles.usageSection}>
              <h4>📝 For Documents:</h4>
              <ul>
                <li><strong>View:</strong> Click "👁️ View" to open documents in browser</li>
                <li><strong>Download:</strong> Click "⬇️ Download" to save documents locally</li>
                <li><strong>Link to nodes:</strong> Reference document URLs in node descriptions</li>
                <li><strong>Metadata:</strong> Use document descriptions and tags for organization</li>
              </ul>
            </div>
            <button 
              onClick={() => setShowUsageModal(true)}
              className={styles.helpBtn}
            >
              📚 Show Detailed Examples
            </button>
          </div>
        </div>
      )}

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
          ) : filteredFiles.length === 0 ? (
            <div className={styles.emptyState}>
              <span>📁</span>
              <p>No files found</p>
              <small>{files.length === 0 ? 'Upload your first file to get started' : 'Try adjusting your search or filters'}</small>
            </div>
          ) : (
            <div className={styles.fileGrid}>
              {filteredFiles.map(file => (
                <div key={file.id} className={styles.fileCard}>
                  <div className={styles.fileHeader}>
                    <span className={styles.fileIcon}>
                      {getFileIcon(file.type)}
                    </span>
                    <div className={styles.fileInfo}>
                      <h4>{file.name}</h4>
                      <small>{formatFileSize(file.size)} • {formatDate(file.uploadedAt)}</small>
                    </div>
                  </div>
                  
                  {file.description && (
                    <p className={styles.fileDescription}>{file.description}</p>
                  )}
                  
                  {file.tags && file.tags.length > 0 && (
                    <div className={styles.fileTags}>
                      {file.tags.map(tag => (
                        <span key={tag} className={styles.tag}>{tag}</span>
                      ))}
                    </div>
                  )}
                  
                  <div className={styles.fileActions}>
                    <button
                      onClick={() => viewFile(file)}
                      className={styles.viewBtn}
                      title="View file in new tab"
                    >
                      👁️ View
                    </button>
                    
                    <button
                      onClick={() => downloadFile(file)}
                      className={styles.downloadBtn}
                      title="Download file"
                    >
                      ⬇️ Download
                    </button>
                    
                    {file.type.startsWith('image/') && (
                      <>
                        <button
                          onClick={() => copyImageMarkdown(file)}
                          className={styles.copyBtn}
                          title="Copy markdown"
                        >
                          📝 MD
                        </button>
                        <button
                          onClick={() => copyImageHtml(file)}
                          className={styles.copyBtn}
                          title="Copy HTML"
                        >
                          🌐 HTML
                        </button>
                        <button
                          onClick={() => copyImageAttribute(file)}
                          className={styles.copyBtn}
                          title="Copy Attribute"
                        >
                          📝 Attr
                        </button>
                      </>
                    )}
                    
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

      {/* Usage Examples Modal */}
      {showUsageModal && (
        <div className={styles.modalOverlay} onClick={() => setShowUsageModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>📚 How to Use Media in NodeBook</h3>
              <button onClick={() => setShowUsageModal(false)} className={styles.closeBtn}>×</button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.exampleSection}>
                <h4>🖼️ Using Images in CNL:</h4>
                <div className={styles.codeBlock}>
                  <code>
                    # My Graph<br/>
                    ## Node with Image<br/>
                    This node includes an image: ![My Image](http://localhost:3001/api/media/files/FILE_ID)<br/>
                    ## Another Node<br/>
                    Content here...
                  </code>
                </div>
              </div>
              
              <div className={styles.exampleSection}>
                <h4>🔗 Using Images in Node Descriptions:</h4>
                <div className={styles.codeBlock}>
                  <code>
                    Node: My Node<br/>
                    Description: This node shows a diagram: &lt;img src="http://localhost:3001/api/media/files/FILE_ID" /&gt;<br/>
                    Relations: connects to Other Node
                  </code>
                </div>
              </div>
              
              <div className={styles.exampleSection}>
                <h4>📋 Using Media in MindMap Mode:</h4>
                <div className={styles.codeBlock}>
                  <code>
                    # Main Topic<br/>
                    ## Subtopic with Image<br/>
                    has Image: http://localhost:3001/api/media/files/FILE_ID<br/>
                    ## Another Subtopic<br/>
                    More content...
                  </code>
                </div>
              </div>
              
              <div className={styles.exampleSection}>
                <h4>🔗 Using Images in ConceptMap Mode:</h4>
                <div className={styles.codeBlock}>
                  <code>
                    Node: Snake<br/>
                    has Image: http://localhost:3001/api/media/files/FILE_ID<br/>
                    Description: A venomous snake species<br/>
                    Relations: eats Mice, lives in Forest
                  </code>
                </div>
              </div>
              
              <div className={styles.exampleSection}>
                <h4>🎨 Using Images as Node Attributes:</h4>
                <div className={styles.codeBlock}>
                  <code>
                    # Snake<br/>
                    has Image: http://localhost:3001/api/media/files/FILE_ID<br/>
                    Description: A venomous snake species<br/>
                    Relations: eats Mice, lives in Forest
                  </code>
                </div>
                <p><strong>Note:</strong> Use "has Image: URL" syntax to add images as node attributes. This keeps the node's default representation while adding visual data.</p>
              </div>
              
              <div className={styles.tipBox}>
                <strong>💡 Tip:</strong> Use "📝 Attr" to copy the perfect CNL syntax for adding images as node attributes. This keeps your nodes clean while adding visual data!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
