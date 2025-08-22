import React, { useState, useEffect } from 'react';
import { GraphViewPublic } from './GraphViewPublic';
import { TopBar } from './TopBar';
import type { Graph, PublicGraph } from './types';
import { API_BASE_URL } from './api-config';
import styles from './PublicGraphViewer.module.css';

interface PublicGraphViewerProps {
  graphId: string;
  onGoToDashboard: () => void;
  onShowAuth: () => void;
}

export function PublicGraphViewer({ graphId, onGoToDashboard, onShowAuth }: PublicGraphViewerProps) {
  const [graph, setGraph] = useState<PublicGraph | null>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [relations, setRelations] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [cnlText, setCnlText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch graph metadata
        const graphResponse = await fetch(`${API_BASE_URL}/api/public/graphs/${graphId}`);
        if (!graphResponse.ok) {
          throw new Error('Failed to fetch graph metadata');
        }
        const graphData = await graphResponse.json();
        setGraph(graphData);

        // Fetch graph content (CNL, nodes, relations, attributes)
        const contentResponse = await fetch(`${API_BASE_URL}/api/public/graphs/${graphId}/cnl`);
        if (!contentResponse.ok) {
          throw new Error('Failed to fetch graph content');
        }
        const contentData = await contentResponse.json();
        
        setNodes(contentData.nodes || []);
        setRelations(contentData.relations || []);
        setAttributes(contentData.attributes || []);
        setCnlText(contentData.cnl || '');

      } catch (err) {
        console.error('Error fetching public graph:', err);
        setError(err instanceof Error ? err.message : 'Failed to load graph');
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, [graphId]);

  if (loading) {
    return (
      <div className={styles.publicGraphViewerContainer}>
        <TopBar
          isAuthenticated={false}
          user={null}
          onGoToDashboard={onGoToDashboard}
          onGoToApp={() => {}}
          onShowAuth={onShowAuth}
          onLogout={() => {}}
          currentView="public-graph"
        />
        <div className={styles.publicGraphContentWrapper}>
          <div className={styles.publicGraphHeader}>
            <h1>Loading Public Graph...</h1>
          </div>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading graph data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.publicGraphViewerContainer}>
        <TopBar
          isAuthenticated={false}
          user={null}
          onGoToDashboard={onGoToDashboard}
          onGoToApp={() => {}}
          onShowAuth={onShowAuth}
          onLogout={() => {}}
          currentView="public-graph"
        />
        <div className={styles.publicGraphContentWrapper}>
          <div className={styles.publicGraphHeader}>
            <h1>Error Loading Graph</h1>
          </div>
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>{error}</p>
            <button onClick={onGoToDashboard} className={styles.errorBackButton}>
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!graph) {
    return (
      <div className={styles.publicGraphViewerContainer}>
        <TopBar
          isAuthenticated={false}
          user={null}
          onGoToDashboard={onGoToDashboard}
          onGoToApp={() => {}}
          onShowAuth={onShowAuth}
          onLogout={() => {}}
          currentView="public-graph"
        />
        <div className={styles.publicGraphContentWrapper}>
          <div className={styles.publicGraphHeader}>
            <h1>Graph Not Found</h1>
          </div>
          <div className={styles.errorContainer}>
            <p>The requested graph could not be found.</p>
            <button onClick={onGoToDashboard} className={styles.errorBackButton}>
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.publicGraphViewerContainer}>
      <TopBar
        isAuthenticated={false}
        user={null}
        onGoToDashboard={onGoToDashboard}
        onGoToApp={() => {}}
        onShowAuth={onShowAuth}
        onLogout={() => {}}
        currentView="public-graph"
      />
      
      <div className={styles.publicGraphContentWrapper}>
        <div className={styles.publicGraphHeader}>
          <div className={styles.graphInfo}>
            <h1>{graph.name}</h1>
            <div className={styles.graphMeta}>
              <span className={styles.publicBadge}>🌐 Public Graph</span>
              <span className={styles.ownerInfo}>by {graph.owner}</span>
              {graph.description && <p className={styles.graphDescription}>{graph.description}</p>}
            </div>
          </div>
          <div className={styles.headerActions}>
            <button onClick={onShowAuth} className={styles.signInButton}>
              Sign In to Create Your Own
            </button>
          </div>
        </div>

        <div className={styles.publicGraphContent}>
          <GraphViewPublic
            activeGraphId={graphId}
            nodes={nodes}
            relations={relations}
            attributes={attributes}
            cnlText={cnlText}
          />
        </div>
      </div>
    </div>
  );
}
