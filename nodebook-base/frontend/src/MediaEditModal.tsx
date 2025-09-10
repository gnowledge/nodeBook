import React, { useState, useEffect } from 'react';
import styles from './MediaEditModal.module.css';

interface MediaFile {
  id: string;
  name: string;
  type: string;
  size: number;
  description?: string;
  tags?: string[];
  uploadedAt: number;
}

interface MediaEditModalProps {
  file: MediaFile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (fileId: string, updates: { description?: string; tags?: string[] }) => Promise<void>;
}

export function MediaEditModal({ file, isOpen, onClose, onSave }: MediaEditModalProps) {
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = () => {
    setDescription(file?.description || '');
    setTags(file?.tags || []);
    setTagInput('');
    setError(null);
    onClose();
  };

  useEffect(() => {
    if (isOpen && file) {
      setDescription(file.description || '');
      setTags(file.tags || []);
      setTagInput('');
      setError(null);
    }
  }, [isOpen, file]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleCancel]);

  if (!isOpen || !file) {
    return null;
  }

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    if (!file) return;

    setIsSaving(true);
    setError(null);

    try {
      await onSave(file.id, {
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };


  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.fileInfo}>
            <span className={styles.fileIcon}>{getFileIcon(file.type)}</span>
            <div>
              <h2>{file.name}</h2>
              <p className={styles.fileMeta}>
                {formatFileSize(file.size)} • {file.type}
              </p>
            </div>
          </div>
          <button onClick={handleCancel} className={styles.closeBtn} title="Close (ESC)">
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {error && (
            <div className={styles.error}>
              <p>{error}</p>
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="description" className={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this file..."
              className={styles.textarea}
              rows={4}
            />
            <small className={styles.helpText}>
              Optional: Add a description to help you remember what this file contains.
            </small>
          </div>

          <div className={styles.field}>
            <label htmlFor="tags" className={styles.label}>
              Tags
            </label>
            <div className={styles.tagInput}>
              <input
                id="tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add tags to organize your files..."
                className={styles.input}
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
                className={styles.addTagBtn}
              >
                Add
              </button>
            </div>
            <small className={styles.helpText}>
              Press Enter or click Add to add tags. Use tags to categorize and find your files easily.
            </small>
            
            {tags.length > 0 && (
              <div className={styles.tagList}>
                {tags.map((tag, index) => (
                  <span key={index} className={styles.tag}>
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className={styles.removeTagBtn}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className={styles.cancelBtn}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={styles.saveBtn}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
