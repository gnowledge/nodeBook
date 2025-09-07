import React, { useState } from 'react';
import styles from './GraphThumbnail.module.css';

interface GraphThumbnailProps {
  graph: {
    id: string;
    name: string;
    description?: string;
    publication_state: string;
    thumbnail_url?: string; // optional explicit thumbnail (media backend)
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
  const [svgContent, setSvgContent] = useState<string | null>(null);
  
  // Prefer explicit media thumbnail if present
  const explicitUrl = graph.thumbnail_url || '';
  const apiUrl = `/api/graphs/${graph.id}/thumbnail`;
  
  const handleImageError = async () => {
    if (!trySvg) {
      try {
        const res = await fetch(apiUrl, { headers: { Accept: 'image/svg+xml,image/png;q=0.9,*/*;q=0.8' } });
        const contentType = res.headers.get('Content-Type') || '';
        if (res.ok && contentType.includes('image/svg')) {
          const text = await res.text();
          setSvgContent(text);
          setTrySvg(true);
          return;
        }
      } catch {}
    }
    setImageError(true);
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
      {trySvg && svgContent ? (
        <div
          className={styles.thumbnailImage}
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{ width: '100%', height: '100%' }}
        />
      ) : explicitUrl ? (
        <img
          src={explicitUrl}
          alt={`Graph preview for ${graph.name}`}
          width={width}
          height={height}
          className={styles.thumbnailImage}
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        <img
          src={apiUrl}
          alt={`Graph preview for ${graph.name}`}
          width={width}
          height={height}
          className={styles.thumbnailImage}
          onError={handleImageError}
          loading="lazy"
        />
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
