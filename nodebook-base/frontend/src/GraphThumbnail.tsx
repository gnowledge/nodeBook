import React from 'react';
import styles from './GraphThumbnail.module.css';

interface GraphPreviewProps {
  graph: {
    id: string;
    name: string;
    description?: string;
    publication_state: string;
    preview_url?: string; // preferred SVG/PNG preview URL (media backend)
  };
  width?: number;
  height?: number;
  isPublic?: boolean;
}

export function GraphPreview({ graph, width = 200, height = 120 }: GraphPreviewProps) {
  const previewUrl = graph.preview_url || '';

  return (
    <div className={styles.thumbnailContainer} style={{ width, height }}>
      {previewUrl ? (
        // Render external preview
        previewUrl.endsWith('.svg') ? (
          <object data={previewUrl} type="image/svg+xml" className={styles.thumbnailImage} aria-label={`Graph preview for ${graph.name}`} />
        ) : (
          <img src={previewUrl} alt={`Graph preview for ${graph.name}`} width={width} height={height} className={styles.thumbnailImage} loading="lazy" />
        )
      ) : (
        <div className={styles.thumbnailError}>
          <span>📊</span>
          <small>No Preview</small>
        </div>
      )}

      {/* Publication state indicator overlay */}
      <div className={styles.publicationIndicator}>
        <div 
          className={styles.publicationDot}
          style={{
            backgroundColor: graph.publication_state === 'Public' ? '#10b981' : 
                          graph.publication_state === 'P2P' ? '#3b82f6' : '#6b7280'
          }}
        />
      </div>
    </div>
  );
}
