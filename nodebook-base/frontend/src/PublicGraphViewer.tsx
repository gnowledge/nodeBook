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
        const graphResponse = await fetch(`${API_BASE_URL}/api/graphs/public/${graphId}`);
        if (!graphResponse.ok) {
          throw new Error('Failed to fetch graph metadata');
        }
        const graphMetadata = await graphResponse.json();
        setGraph(graphMetadata);

        // Fetch CNL content
        const cnlResponse = await fetch(`${API_BASE_URL}/api/graphs/public/${graphId}/cnl`);
        if (!cnlResponse.ok) {
          throw new Error('Failed to fetch CNL content');
        }
        const cnlData = await cnlResponse.json();
        setCnlText(cnlData.cnl || '');

        // Fetch graph data (nodes, relations, attributes)
        const dataResponse = await fetch(`${API_BASE_URL}/api/graphs/public/${graphId}/data`);
        if (!dataResponse.ok) {
          throw new Error('Failed to fetch graph data');
        }
        const graphStructure = await dataResponse.json();
        
        setNodes(graphStructure.nodes || []);
        setRelations(graphStructure.relations || []);
        setAttributes(graphStructure.attributes || []);

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
          <div className={styles.errorContainer}>
            <h1>Error Loading Graph</h1>
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
          <div className={styles.errorContainer}>
            <h1>Graph Not Found</h1>
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
        <GraphViewPublic
          activeGraphId={graphId}
          nodes={graph.nodes || []}
          relations={graph.relations || []}
          attributes={graph.attributes || []}
          cnlText={graph.cnl || ''}
          onGoToDashboard={onGoToDashboard}
        />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
          <button
            onClick={() => {
              // Navigate to public workspace preview via URL hash to keep state simple in TestApp
              window.location.hash = `#public-workspace:${graphId}`;
              window.location.reload();
            }}
            style={{
              background: '#111827',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            title="Open read-only workspace preview"
          >
            🔍 Open Workspace Preview (Read-only)
          </button>
        </div>
      </div>
    </div>
  );
}
