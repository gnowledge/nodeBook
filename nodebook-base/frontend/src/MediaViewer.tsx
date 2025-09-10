import { useState, useEffect } from 'react';
import styles from './MediaViewer.module.css';

// Media backend configuration
const MEDIA_BACKEND_URL = (import.meta as any).env?.VITE_MEDIA_BACKEND_URL || '';

// Helper function to construct URLs safely
const getMediaUrl = (path: string) => {
  const baseUrl = MEDIA_BACKEND_URL.endsWith('/') ? MEDIA_BACKEND_URL.slice(0, -1) : MEDIA_BACKEND_URL;
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

interface MediaFile {
  id: string;
  name: string;
  type: string;
  size: number;
  description?: string;
  tags?: string[];
  uploadedAt: number;
}

interface MediaViewerProps {
  file: MediaFile | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (file: MediaFile) => void;
}

export function MediaViewer({ file, isOpen, onClose, onEdit }: MediaViewerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && file) {
      setIsLoading(true);
      setError(null);
    }
  }, [isOpen, file]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);


  if (!isOpen || !file) {
    return null;
  }

  const fileUrl = getMediaUrl(`/api/media/files/${encodeURIComponent(file.id)}`);
  
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');
  const isPdf = file.type === 'application/pdf';
  // const isText = file.type.startsWith('text/'); // Not used yet

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(fileUrl);
      alert('File URL copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = fileUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('File URL copied to clipboard!');
    }
  };

  const handleCopyMarkdown = async () => {
    const markdown = isImage ? `![${file.name}](${fileUrl})` : `[${file.name}](${fileUrl})`;
    try {
      await navigator.clipboard.writeText(markdown);
      alert('Markdown copied to clipboard!');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = markdown;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Markdown copied to clipboard!');
    }
  };



  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.startsWith('text/')) return '📝';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📄';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📊';
    return '📄';
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.viewer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.fileInfo}>
            <h2>{file.name}</h2>
            <div className={styles.metaInfo}>
              <span>{formatFileSize(file.size)}</span>
              <span>•</span>
              <span>{formatDate(file.uploadedAt)}</span>
            </div>
          </div>
          <div className={styles.actions}>
            {onEdit && (
              <button onClick={() => onEdit(file)} className={styles.editBtn}>
                Edit
              </button>
            )}
            <button onClick={handleDownload} className={styles.downloadBtn}>
              Download
            </button>
            <button onClick={handleCopyUrl} className={styles.copyBtn}>
              Copy URL
            </button>
            <button onClick={handleCopyMarkdown} className={styles.markdownBtn}>
              Copy Markdown
            </button>
            <button onClick={onClose} className={styles.closeBtn} title="Close (ESC)">
              ✕
            </button>
          </div>
        </div>

        <div className={styles.content}>
          
          {isLoading && (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading...</p>
            </div>
          )}
          
          {error && (
            <div className={styles.error}>
              <p>{error}</p>
              <p><strong>URL:</strong> {fileUrl}</p>
              <button onClick={handleDownload} className={styles.downloadBtn}>
                Download Instead
              </button>
            </div>
          )}

          {/* Main media content - simplified conditional logic */}
          {isImage && (
            <img
              src={fileUrl}
              alt={file.name}
              className={styles.mediaImage}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setError(`Failed to load image: ${fileUrl}`);
              }}
            />
          )}
          
          {isVideo && (
            <video
              src={fileUrl}
              controls
              className={styles.mediaVideo}
              onLoadedData={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setError('Failed to load video');
              }}
            >
              Your browser does not support the video tag.
            </video>
          )}
          
          {isAudio && (
            <div className={styles.audioContainer}>
              <audio
                src={fileUrl}
                controls
                className={styles.mediaAudio}
                onLoadedData={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setError('Failed to load audio');
                }}
              >
                Your browser does not support the audio tag.
              </audio>
            </div>
          )}
          
          {isPdf && (
            <iframe
              src={fileUrl}
              className={styles.mediaPdf}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setError('Failed to load PDF');
              }}
            />
          )}
          
          {!isImage && !isVideo && !isAudio && !isPdf && (
            <div className={styles.filePreview}>
              <div className={styles.fileIcon}>
                {getFileIcon(file.type)}
              </div>
              <h3>{file.name}</h3>
              <p>This file type cannot be previewed in the browser.</p>
              <button onClick={handleDownload} className={styles.downloadBtn}>
                Download File
              </button>
            </div>
          )}
        </div>

        {(file.description || (file.tags && file.tags.length > 0)) && (
          <div className={styles.footer}>
            {file.description && (
              <div className={styles.description}>
                <h4>Description</h4>
                <p>{file.description}</p>
              </div>
            )}
            {file.tags && file.tags.length > 0 && (
              <div className={styles.tags}>
                <h4>Tags</h4>
                <div className={styles.tagList}>
                  {file.tags.map((tag, index) => (
                    <span key={index} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
