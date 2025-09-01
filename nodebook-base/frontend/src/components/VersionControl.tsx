import React, { useState, useEffect } from 'react';
import './VersionControl.css';

interface Version {
  id: string;
  message: string;
  author: string;
  timestamp: string;
  date: string;
}

interface VersionControlProps {
  graphId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function VersionControl({ graphId, isOpen, onClose }: VersionControlProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);

  // Load version history
  const loadVersions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/graphs/${graphId}/versions`);
      if (!response.ok) {
        throw new Error(`Failed to load versions: ${response.statusText}`);
      }
      
      const data = await response.json();
      setVersions(data.versions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  // Manual commit
  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      setError('Please enter a commit message');
      return;
    }

    setIsCommitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/graphs/${graphId}/versions/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: commitMessage }),
      });

      if (!response.ok) {
        throw new Error(`Failed to commit: ${response.statusText}`);
      }

      setCommitMessage('');
      await loadVersions(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to commit changes');
    } finally {
      setIsCommitting(false);
    }
  };

  // Revert to version
  const handleRevert = async (versionId: string) => {
    if (!confirm('Are you sure you want to revert to this version? This will replace your current CNL.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/graphs/${graphId}/versions/${versionId}/revert`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to revert: ${response.statusText}`);
      }

      // Close the panel after successful revert
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revert to version');
    } finally {
      setLoading(false);
    }
  };

  // Load versions when panel opens
  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen, graphId]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="version-control-overlay" onClick={onClose}>
      <div className="version-control-panel" onClick={(e) => e.stopPropagation()}>
        <div className="version-control-header">
          <h2>📋 Version History</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="version-control-content">
          {/* Manual Commit Section */}
          <div className="commit-section">
            <h3>💾 Manual Commit</h3>
            <div className="commit-form">
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Enter commit message..."
                className="commit-message-input"
                rows={3}
              />
              <button
                onClick={handleCommit}
                disabled={isCommitting || !commitMessage.trim()}
                className="commit-btn"
              >
                {isCommitting ? '🔄 Committing...' : '💾 Commit Changes'}
              </button>
            </div>
          </div>

          {/* Version History Section */}
          <div className="versions-section">
            <h3>📜 Version History</h3>
            
            {loading && (
              <div className="loading-message">
                🔄 Loading version history...
              </div>
            )}

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            {!loading && !error && versions.length === 0 && (
              <div className="empty-message">
                📝 No versions yet. Make your first commit!
              </div>
            )}

            {!loading && !error && versions.length > 0 && (
              <div className="versions-list">
                {versions.map((version) => (
                  <div key={version.id} className="version-item">
                    <div className="version-info">
                      <div className="version-message">{version.message}</div>
                      <div className="version-meta">
                        <span className="version-author">👤 {version.author}</span>
                        <span className="version-date">📅 {version.date}</span>
                      </div>
                    </div>
                    <div className="version-actions">
                      <button
                        onClick={() => handleRevert(version.id)}
                        className="revert-btn"
                        title="Revert to this version"
                      >
                        ↩️ Revert
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
