import React from 'react';
import type { Graph, PublicGraph } from './types';
// import { GraphThumbnail } from './GraphThumbnail';
import styles from './GraphCard.module.css';

interface GraphCardProps {
  graph: Graph | PublicGraph;
  onClick: (graphId: string) => void;
  isPublic?: boolean;
  showPublicationControls?: boolean;
  onPublicationStateChange?: (graphId: string, newState: 'Private' | 'P2P' | 'Public') => void;
}

export function GraphCard({ 
  graph, 
  onClick, 
  isPublic = false, 
  showPublicationControls = false,
  onPublicationStateChange 
}: GraphCardProps) {
  
  const handlePublicationToggle = () => {
    if (!onPublicationStateChange) return;
    
    const states: ('Private' | 'P2P' | 'Public')[] = ['Private', 'P2P', 'Public'];
    const currentIndex = states.indexOf(graph.publication_state);
    const nextState = states[(currentIndex + 1) % states.length];
    
    onPublicationStateChange(graph.id, nextState);
  };

  const getPublicationStateColor = (state: string) => {
    switch (state) {
      case 'Private':
        return '#6b7280'; // gray
      case 'P2P':
        return '#3b82f6'; // blue
      case 'Public':
        return '#10b981'; // green
      default:
        return '#6b7280';
    }
  };

  const getPublicationStateIcon = (state: string) => {
    switch (state) {
      case 'Private':
        return '🔒';
      case 'P2P':
        return '🔗';
      case 'Public':
        return '🌐';
      default:
        return '🔒';
    }
  };

  return (
    <div className={styles.graphCard} onClick={() => onClick(graph.id)}>
      <div className={styles.graphCardHeader}>
        <h3 className={styles.graphTitle}>{graph.name}</h3>
        <div className={styles.graphPublicationState}>
          <span 
            className={styles.publicationBadge}
            style={{ backgroundColor: getPublicationStateColor(graph.publication_state) }}
          >
            {getPublicationStateIcon(graph.publication_state)} {graph.publication_state}
          </span>
        </div>
      </div>
      
      {/* Graph Thumbnail */}
      {/* <div className={styles.graphThumbnail}>
        <GraphThumbnail graph={graph} width={200} height={120} />
      </div> */}
      
      <div className={styles.graphCardContent}>
        {graph.description && (
          <p className={styles.graphDescription}>{graph.description}</p>
        )}
        
        <div className={styles.graphMetadata}>
          <div className={styles.metadataItem}>
            <span className="label">Author:</span>
            <span className="value">{graph.author}</span>
          </div>
          
          {isPublic && 'owner' in graph && (
            <div className={styles.metadataItem}>
              <span className="label">Owner:</span>
              <span className="value">{graph.owner}</span>
            </div>
          )}
          
          <div className={styles.metadataItem}>
            <span className="label">Created:</span>
            <span className="value">{new Date(graph.createdAt).toLocaleDateString()}</span>
          </div>
          
          <div className={styles.metadataItem}>
            <span className="label">Updated:</span>
            <span className="value">{new Date(graph.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      
      {showPublicationControls && onPublicationStateChange && (
        <div className={styles.graphCardActions}>
          <button 
            className={styles.publicationToggleBtn}
            onClick={(e) => {
              e.stopPropagation();
              handlePublicationToggle();
            }}
            title={`Current: ${graph.publication_state}. Click to cycle through states.`}
          >
            Change Publication State
          </button>
        </div>
      )}
      
      <div className={styles.graphCardFooter}>
        <span className={styles.viewMode}>
          {isPublic ? '📖 Read-only' : '✏️ Editable'}
        </span>
        <span className={styles.clickHint}>Click to view</span>
      </div>
    </div>
  );
}
