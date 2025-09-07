import React, { useState } from 'react';
import styles from './GraphThumbnail.module.css';

interface GraphThumbnailProps {
  graph: {
    id: string;
    name: string;
    description?: string;
    publication_state: string;
  };
  width?: number;
  height?: number;
}

export function GraphThumbnail({ 
  graph, 
  width = 200, 
  height = 120 
}: GraphThumbnailProps) {
  const [imageError, setImageError] = useState(false);
  const [trySvg, setTrySvg] = useState(false);
  
  // Construct the thumbnail URL based on graph ID
  const thumbnailUrl = trySvg ? `/api/graphs/${graph.id}/thumbnail`.replace('thumbnail', 'thumbnail').replace('.png','') : `/api/graphs/${graph.id}/thumbnail`;
  
  const handleImageError = () => {
    if (!trySvg) {
      // Try fetching SVG fallback by setting <img src> to the same URL; server may return SVG
      setTrySvg(true);
    } else {
      setImageError(true);
    }
  };

  if (imageError) {
    return (
      <div className={styles.thumbnailContainer} style={{ width, height }}>
        <div className={styles.thumbnailError}>
          <span>📊</span>
          <small>No Preview</small>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.thumbnailContainer} style={{ width, height }}>
      <img
        src={thumbnailUrl}
        alt={`Graph preview for ${graph.name}`}
        width={width}
        height={height}
        className={styles.thumbnailImage}
        onError={handleImageError}
        loading="lazy"
      />
      
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
