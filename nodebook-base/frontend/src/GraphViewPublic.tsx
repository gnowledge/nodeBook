import React, { useState, useMemo, useEffect } from 'react';
import type { Node, Edge, AttributeType, Graph } from './types';
import { API_BASE_URL } from './api-config';
import CytoscapeComponent from 'react-cytoscapejs';
import './DataView.css';
import './GraphViewPublic.css';

interface GraphViewPublicProps {
  activeGraphId: string;
  nodes: Node[];
  relations: Edge[];
  attributes: AttributeType[];
  cnlText: string;
}

export function GraphViewPublic({ activeGraphId, nodes, relations, attributes, cnlText }: GraphViewPublicProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGraph, setActiveGraph] = useState<Graph | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'nodes' | 'cnl'>('overview');

  // Debug logging
  useEffect(() => {
    console.log('GraphViewPublic props:', { 
      activeGraphId, 
      nodesCount: nodes?.length || 0, 
      relationsCount: relations?.length || 0, 
      attributesCount: attributes?.length || 0,
      cnlLength: cnlText?.length || 0 
    });
  }, [activeGraphId, nodes, relations, attributes, cnlText]);

  // Fetch graph details
  useEffect(() => {
    if (activeGraphId) {
      fetch(`${API_BASE_URL}/api/public/graphs/${activeGraphId}`)
        .then(res => res.json())
        .then((graph: Graph) => {
          setActiveGraph(graph);
        })
        .catch(error => {
          console.error('Failed to fetch graph metadata:', error);
          setActiveGraph(null);
        });
    }
  }, [activeGraphId]);

  const filteredNodes = useMemo(() => {
    if (!searchTerm) {
      return nodes || [];
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return (nodes || []).filter(node =>
      (node.name && node.name.toLowerCase().includes(lowercasedFilter)) ||
      (node.role && node.role.toLowerCase().includes(lowercasedFilter)) ||
      (node.description && node.description.toLowerCase().includes(lowercasedFilter))
    );
  }, [nodes, searchTerm]);

  // Transform data to Cytoscape format
  const cytoscapeElements = useMemo(() => {
    if (!nodes || !relations) return [];
    
    const elements = [];
    
    // Add nodes
    nodes.forEach(node => {
      elements.push({
        data: {
          id: node.id,
          label: node.name || node.id,
          role: node.role,
          description: node.description
        },
        classes: 'node' // Add class for styling
      });
    });
    
    // Add edges (relations)
    relations.forEach(rel => {
      elements.push({
        data: {
          id: rel.id,
          source: rel.source_id,
          target: rel.target_id,
          label: rel.name
        },
        classes: 'edge' // Add class for styling
      });
    });
    
    console.log('Cytoscape elements created:', {
      nodes: nodes.length,
      relations: relations.length,
      totalElements: elements.length,
      elements: elements
    });
    
    return elements;
  }, [nodes, relations]);

  // Cytoscape graph visualization component
  const CytoscapeGraph = () => {
    console.log('CytoscapeGraph render:', { 
      nodesCount: nodes?.length || 0, 
      relationsCount: relations?.length || 0,
      elementsCount: cytoscapeElements.length 
    });
    
    if (!nodes || nodes.length === 0) {
      return (
        <div className="graph-visualization-empty">
          <p>No nodes to visualize</p>
          <small>Debug: nodes array is empty</small>
        </div>
      );
    }

    if (!relations || relations.length === 0) {
      return (
        <div className="graph-visualization-empty">
          <p>No relations to visualize</p>
          <small>Debug: relations array is empty</small>
        </div>
      );
    }

    // Fallback to simple visualization if Cytoscape fails
    const [cytoscapeError, setCytoscapeError] = useState(false);

    const cytoscapeStylesheet = [
      {
        selector: 'node',
        style: {
          'background-color': '#667eea',
          'label': 'data(label)',
          'color': '#ffffff',
          'font-size': '12px',
          'font-weight': 'bold',
          'text-valign': 'center',
          'text-halign': 'center',
          'width': '60px',
          'height': '60px',
          'border-width': '2px',
          'border-color': '#4a5568',
          'shape': 'ellipse'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': '4px',
          'line-color': '#e53e3e',
          'target-arrow-color': '#e53e3e',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'label': 'data(label)',
          'font-size': '10px',
          'color': '#2d3748',
          'font-weight': 'bold',
          'text-background-color': '#ffffff',
          'text-background-opacity': '0.8',
          'text-background-padding': '3px'
        }
      },
      {
        selector: 'node:selected',
        style: {
          'background-color': '#f56565',
          'border-color': '#e53e3e',
          'border-width': '4px'
        }
      },
      {
        selector: 'edge:selected',
        style: {
          'line-color': '#e53e3e',
          'width': '6px'
        }
      }
    ];

    // Fallback simple visualization
    const SimpleVisualization = () => (
      <div className="simple-graph-visualization">
        <div className="simple-nodes">
          {nodes.slice(0, 10).map(node => (
            <div key={node.id} className="simple-node" title={node.description || node.name}>
              <div className="simple-node-label">{node.name || node.id}</div>
              {node.role && <div className="simple-node-role">{node.role}</div>}
            </div>
          ))}
          {nodes.length > 10 && (
            <div className="simple-node-more">
              +{nodes.length - 10} more nodes
            </div>
          )}
        </div>
        <div className="simple-relations">
          <p>Showing {relations.length} relations between nodes</p>
          <small>Use the Nodes tab to explore individual node connections</small>
        </div>
      </div>
    );

    if (cytoscapeError) {
      return (
        <div className="graph-visualization-fallback">
          <div className="fallback-header">
            <h3>Graph Visualization (Fallback Mode)</h3>
            <p>Interactive visualization unavailable. Showing simplified view.</p>
          </div>
          <SimpleVisualization />
        </div>
      );
    }

    return (
      <div className="cytoscape-container">
        <CytoscapeComponent
          elements={cytoscapeElements}
          style={{ width: '100%', height: '500px' }}
          stylesheet={cytoscapeStylesheet}
          layout={{
            name: 'cose',
            animate: true,
            animationDuration: 1500,
            nodeDimensionsIncludeLabels: true,
            fit: true,
            padding: 50,
            randomize: true,
            componentSpacing: 100,
            nodeRepulsion: 4500,
            nodeOverlap: 20,
            gravity: 80,
            numIter: 1000,
            initialTemp: 200,
            coolingFactor: 0.95,
            minTemp: 1.0
          }}
          cy={(cy) => {
            if (cy) {
              cy.on('error', (evt) => {
                console.error('Cytoscape error:', evt);
                setCytoscapeError(true);
              });
            }
          }}
        />
      </div>
    );
  };

  // Simple Subgraph component for public view
  const SimpleSubgraph = ({ nodeId }: { nodeId: string }) => {
    const nodeRelations = relations.filter(r => r.source_id === nodeId || r.target_id === nodeId);
    const connectedNodeIds = new Set([nodeId]);
    
    // Add connected nodes
    nodeRelations.forEach(rel => {
      if (rel.source_id === nodeId) connectedNodeIds.add(rel.target_id);
      if (rel.target_id === nodeId) connectedNodeIds.add(rel.source_id);
    });
    
    const connectedNodes = nodes.filter(n => connectedNodeIds.has(n.id));

    if (connectedNodes.length <= 1) {
      return (
        <div className="subgraph-empty">
          <small>No connections</small>
        </div>
      );
    }

    return (
      <div className="simple-subgraph">
        <div className="subgraph-nodes">
          {connectedNodes.map(n => (
            <div 
              key={n.id} 
              className={`subgraph-node ${n.id === nodeId ? 'central' : 'connected'}`}
              title={n.description || n.name}
            >
              <div className="subgraph-node-label">
                {n.id === nodeId ? '●' : '○'} {n.name || n.id}
              </div>
            </div>
          ))}
        </div>
        <div className="subgraph-relations">
          {nodeRelations.map(rel => (
            <div key={rel.id} className="subgraph-relation">
              <span className="relation-label">{rel.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Simple NodeCard component for public view
  const PublicNodeCard = ({ node }: { node: any }) => {
    const nodeRelations = relations.filter(r => r.source_id === node.id || r.target_id === node.id);
    const nodeAttributes = attributes.filter(a => a.source_id === node.id);

    return (
      <div className="public-node-card">
        <div className="node-card-header">
          <h3 className="node-name">{node.name || node.id}</h3>
          {node.role && <span className="node-role">{node.role}</span>}
        </div>
        
        {/* Subgraph Visualization */}
        <div className="node-subgraph">
          <h4>Subgraph:</h4>
          <SimpleSubgraph nodeId={node.id} />
        </div>
        
        {node.description && (
          <div className="node-description">
            <p>{node.description}</p>
          </div>
        )}
        
        {nodeAttributes.length > 0 && (
          <div className="node-attributes">
            <h4>Attributes:</h4>
            <ul>
              {nodeAttributes.map(attr => (
                <li key={attr.id}>
                  <strong>{attr.name}:</strong> {attr.value}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {nodeRelations.length > 0 && (
          <div className="node-relations">
            <h4>Relations:</h4>
            <ul>
              {nodeRelations.map(rel => (
                <li key={rel.id}>
                  <strong>{rel.name}</strong> → {rel.target_id}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="graph-view-public">
      {/* Header Information */}
      <div className="graph-header">
        <div className="header-top">
          <button 
            className="dashboard-back-button"
            onClick={() => window.history.back()}
            title="Back to Dashboard"
          >
            ← Back to Dashboard
          </button>
        </div>
        <div className="graph-title-section">
          <h1 className="graph-title">{activeGraph?.name || 'Loading...'}</h1>
          {activeGraph?.description && (
            <p className="graph-description">{activeGraph.description}</p>
          )}
          <div className="graph-meta">
            {activeGraph?.author && <span className="graph-author">By: {activeGraph.author}</span>}
            {activeGraph?.email && <span className="graph-email">Contact: {activeGraph.email}</span>}
            <span className="graph-status">Status: Public</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          🕸️ Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'nodes' ? 'active' : ''}`}
          onClick={() => setActiveTab('nodes')}
        >
          📋 Nodes ({filteredNodes.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'cnl' ? 'active' : ''}`}
          onClick={() => setActiveTab('cnl')}
        >
          📝 CNL
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="graph-section">
              <h2 className="section-title">Graph Visualization</h2>
              <CytoscapeGraph />
            </div>
            
            <div className="graph-stats">
              <h2 className="section-title">Graph Statistics</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-number">{nodes?.length || 0}</div>
                  <div className="stat-label">Nodes</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{relations?.length || 0}</div>
                  <div className="stat-label">Relations</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{attributes?.length || 0}</div>
                  <div className="stat-label">Attributes</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'nodes' && (
          <div className="nodes-tab">
            <div className="section-header">
              <h2 className="section-title">Nodes ({filteredNodes.length})</h2>
              <div className="search-section">
                <input
                  type="text"
                  placeholder="Search nodes..."
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="nodes-grid">
              {filteredNodes.map(node => (
                <PublicNodeCard key={node.id} node={node} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cnl' && (
          <div className="cnl-tab">
            <h2 className="section-title">Controlled Natural Language (CNL)</h2>
            <div className="cnl-content">
              <pre className="cnl-text">{cnlText || 'No CNL content available'}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
