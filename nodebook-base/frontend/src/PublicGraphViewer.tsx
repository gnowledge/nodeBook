import React, { useState, useEffect } from 'react';
import { GraphViewPublic } from './GraphViewPublic';
import type { Graph, PublicGraph } from './types';
import { API_BASE_URL } from './api-config';
import './PublicGraphViewer.css';

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
      <div className="public-graph-viewer">
        <div className="public-graph-header">
          <button onClick={onGoToDashboard} className="back-button">
            ← Back to Dashboard
          </button>
          <h1>Loading Public Graph...</h1>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading graph data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-graph-viewer">
        <div className="public-graph-header">
          <button onClick={onGoToDashboard} className="back-button">
            ← Back to Dashboard
          </button>
          <h1>Error Loading Graph</h1>
        </div>
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={onGoToDashboard} className="error-back-button">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!graph) {
    return (
      <div className="public-graph-viewer">
        <div className="public-graph-header">
          <button onClick={onGoToDashboard} className="back-button">
            ← Back to Dashboard
          </button>
          <h1>Graph Not Found</h1>
        </div>
        <div className="error-container">
          <p>The requested graph could not be found.</p>
          <button onClick={onGoToDashboard} className="error-back-button">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="public-graph-viewer">
      <div className="public-graph-header">
        <button onClick={onGoToDashboard} className="back-button">
          ← Back to Dashboard
        </button>
        <div className="graph-info">
          <h1>{graph.name}</h1>
          <div className="graph-meta">
            <span className="public-badge">🌐 Public Graph</span>
            <span className="owner-info">by {graph.owner}</span>
            {graph.description && <p className="graph-description">{graph.description}</p>}
          </div>
        </div>
        <div className="header-actions">
          <button onClick={onShowAuth} className="sign-in-button">
            Sign In to Create Your Own
          </button>
        </div>
      </div>

      <div className="public-graph-content">
        <GraphViewPublic
          activeGraphId={graphId}
          nodes={nodes}
          relations={relations}
          attributes={attributes}
          cnlText={cnlText}
        />
      </div>
    </div>
  );
}
