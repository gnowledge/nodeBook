import React, { useState, useMemo, useEffect } from 'react';
import type { Node, Edge, Attribute, Graph } from './types';
import { API_BASE_URL } from './api-config';
import CytoscapeComponent from 'react-cytoscapejs';
import { cytoscapeStylesheet, cytoscapeLayouts, getNodeType } from './cytoscape-styles';
import './DataView.css';
import './GraphViewPublic.css';

interface GraphViewPublicProps {
  activeGraphId: string;
  nodes: Node[];
  relations: Edge[];
  attributes: Attribute[];
  cnlText: string;
  onGoToDashboard?: () => void; // Add navigation callback
}

export function GraphViewPublic({ 
  activeGraphId, 
  nodes, 
  relations, 
  attributes, 
  cnlText,
  onGoToDashboard 
}: GraphViewPublicProps) {
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
    
    const elements: any[] = [];
    
    // Add nodes
    nodes.forEach(node => {
      const nodeType = getNodeType(node.role || '');
      elements.push({
        data: {
          id: node.id,
          label: node.name || node.id,
          role: node.role,
          description: node.description,
          type: nodeType // Add type for styling
        },
        classes: `node-${nodeType}` // Add class for styling
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
          layout={cytoscapeLayouts.dagre}
          cy={(cy: any) => {
            if (cy) {
              console.log('Cytoscape instance created:', cy);
              
              // Add event listeners
              cy.on('tap', 'node', (evt: any) => {
                const node = evt.target;
                console.log('Node clicked:', node.data());
              });
              
              cy.on('tap', 'edge', (evt: any) => {
                const edge = evt.target;
                console.log('Edge clicked:', edge.data());
              });
            }
          }}
        />
      </div>
    );
  };

  // Cytoscape Subgraph component for node neighborhoods
  const CytoscapeSubgraph = ({ nodeId }: { nodeId: string }) => {
    const nodeRelations = relations.filter(r => r.source_id === nodeId || r.target_id === nodeId);
    
    // Get connected nodes
    const connectedNodeIds = new Set<string>();
    connectedNodeIds.add(nodeId); // Include the central node
    
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

    // Transform data to Cytoscape format for subgraph
    const subgraphElements = connectedNodes.map(node => ({
      data: {
        id: node.id,
        label: node.name || node.id,
        role: node.role,
        type: getNodeType(node.role || ''),
        isCentral: node.id === nodeId
      },
      classes: `node-${getNodeType(node.role || '')} ${node.id === nodeId ? 'central-node' : 'connected-node'}`
    }));

    // Add edges for the subgraph
    const subgraphEdges = nodeRelations.map(rel => ({
      data: {
        id: rel.id,
        source: rel.source_id,
        target: rel.target_id,
        label: rel.name
      },
      classes: 'subgraph-edge'
    }));

    const allElements = [...subgraphElements, ...subgraphEdges];

    return (
      <div className="cytoscape-subgraph-container">
        <CytoscapeComponent
          elements={allElements}
          style={{ width: '100%', height: '200px' }}
          stylesheet={cytoscapeStylesheet}
          layout={cytoscapeLayouts.dagre}
          cy={(cy: any) => {
            if (cy) {
              // Highlight central node
              cy.nodes('[isCentral = "true"]').addClass('central-node');
            }
          }}
        />
      </div>
    );
  };

  // Simple NodeCard component for public view
  const PublicNodeCard = ({ node }: { node: any }) => {
    const nodeRelations = relations.filter(r => r.source_id === node.id || r.target_id === node.id);
    const nodeAttributes = attributes.filter(a => a.source_id === node.id);

    // Helper function to scroll to a specific node card
    const scrollToNode = (nodeId: string) => {
      const element = document.getElementById(`node-card-${nodeId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    return (
      <div className="public-node-card" id={`node-card-${node.id}`}>
        <div className="node-card-header">
          <h3 className="node-name">{node.name || node.id}</h3>
          {node.role && <span className="node-role">{node.role}</span>}
        </div>
        
        {/* Subgraph Visualization */}
        <div className="node-subgraph">
          <h4>Subgraph:</h4>
          <CytoscapeSubgraph nodeId={node.id} />
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
              {nodeRelations.map(rel => {
                const isOutgoing = rel.source_id === node.id;
                const targetId = isOutgoing ? rel.target_id : rel.source_id;
                const relationText = isOutgoing ? `${rel.name} →` : `← ${rel.name}`;
                
                return (
                  <li key={rel.id}>
                    <span>
                      <strong>{relationText}</strong>
                      <a 
                        href="#" 
                        className="relation-target" 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          scrollToNode(targetId); 
                        }}
                      >
                        {targetId}
                      </a>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="graph-view-public">
      {/* Consolidated Header Information */}
      <div className="graph-header">
        <div className="header-content">
          <div className="header-left">
            <button 
              className="dashboard-back-button"
              onClick={onGoToDashboard || (() => window.history.back())}
              title="Back to Dashboard"
            >
              ← Back to Dashboard
            </button>
          </div>
          <div className="header-center">
            <h1 className="graph-title">{activeGraph?.name || 'Loading...'}</h1>
            {activeGraph?.description && (
              <p className="graph-description">{activeGraph.description}</p>
            )}
          </div>
          <div className="header-right">
            <div className="graph-meta">
              {activeGraph?.author && <span className="graph-author">By: {activeGraph.author}</span>}
              {activeGraph?.email && <span className="graph-email">Contact: {activeGraph.email}</span>}
              <span className="graph-status">Status: Public</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Moved closer to header */}
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
      
      {/* Footer */}
      <footer className="graph-footer">
        <p>
          NodeBook is free and open source software released under{' '}
          <a 
            href="https://github.com/gnowledge/nodeBook" 
            target="_blank" 
            rel="noopener noreferrer"
            className="footer-link"
          >
            AGPL
          </a>
        </p>
      </footer>
    </div>
  );
}
