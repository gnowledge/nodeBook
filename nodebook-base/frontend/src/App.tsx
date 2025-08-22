import p2pIcon from './assets/p2p.svg';
import React, { useState, useEffect } from 'react';
import editorIcon from './assets/editor.svg';
import visualizationIcon from './assets/visualization.svg';
import jsonDataIcon from './assets/jsonData.svg';
import nodesIcon from './assets/nodes.svg';
import schemaIcon from './assets/schema.svg';
import peersIcon from './assets/peers.svg';
import './App.css';
import { NodeCard } from './NodeCard';
import { Visualization } from './Visualization';
import { GraphSwitcher } from './GraphSwitcher';
import { Menu } from './Menu';
import { DataView } from './DataView';
import { SchemaView } from './SchemaView';
import { CnlEditor } from './CnlEditor';
import { PeerTab } from './PeerTab';
import { JsonView } from './JsonView';
import { PageView } from './PageView';
import { Preferences } from './Preferences';
import type { Node, Edge, RelationType, AttributeType } from './types';
import { API_BASE_URL } from './api-config';

type ViewMode = 'editor' | 'visualization' | 'jsonData' | 'nodes' | 'schema' | 'peers';

interface AppProps {
  onLogout?: () => void;
  onGoToDashboard?: () => void;
  user?: any;
}

function App({ onLogout, onGoToDashboard, user }: AppProps) {
  // Helper function for authenticated API calls
  const authenticatedFetch = (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };
    
    // Only set Content-Type for requests that have a body
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }
    
    return fetch(url, {
      ...options,
      headers,
    });
  };

  const handleDeleteGraph = async () => {
    if (!activeGraphId) return;
    if (window.confirm(`Are you sure you want to delete graph "${activeGraphId}"? This action cannot be undone.`)) {
      try {
        const res = await authenticatedFetch(`${API_BASE_URL}/api/graphs/${activeGraphId}`, { method: 'DELETE' });
        if (res.ok) {
          setActiveGraphId(null);
          setActiveGraphKey(null);
          setNodes([]);
          setRelations([]);
          setAttributes([]);
          setCnlText(prev => {
            const newCnlText = { ...prev };
            delete newCnlText[activeGraphId];
            return newCnlText;
          });
          
          // Trigger a refresh of the graph list
          setRefreshKey(prev => prev + 1);
        } else {
          console.error('Failed to delete graph:', res.status);
          const errorData = await res.json().catch(() => ({}));
          alert(`Failed to delete graph: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error deleting graph:', error);
        alert('Failed to delete graph. Please try again.');
      }
    }
  };
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null);
  const [activeGraphKey, setActiveGraphKey] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [relations, setRelations] = useState<Edge[]>([]);
  const [attributes, setAttributes] = useState<AttributeType[]>([]);
  const [relationTypes, setRelationTypes] = useState<RelationType[]>([]);
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([]);
  const [nodeTypes, setNodeTypes] = useState<any[]>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [cnlText, setCnlText] = useState<{ [graphId: string]: string }>({});
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [activePage, setActivePage] = useState<string | null>(null);
  const [strictMode, setStrictMode] = useState(() => {
    const saved = localStorage.getItem('strictMode');
    return saved !== null ? JSON.parse(saved) : true; // Default to true
  });
  const [name, setName] = useState(() => localStorage.getItem('userName') || '');
  const [email, setEmail] = useState(() => localStorage.getItem('userEmail') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [publicationState, setPublicationState] = useState<'Private' | 'P2P' | 'Public'>('Private');

  useEffect(() => {
    localStorage.setItem('strictMode', JSON.stringify(strictMode));
  }, [strictMode]);

  useEffect(() => {
    localStorage.setItem('userName', name);
  }, [name]);

  useEffect(() => {
    localStorage.setItem('userEmail', email);
  }, [email]);

  const fetchGraph = (graphId: string) => {
    if (!graphId) return;
    
    // Fetch graph data (nodes, relations, attributes)
    authenticatedFetch(`${API_BASE_URL}/api/graphs/${graphId}/graph`)
      .then(res => res.json())
      .then(data => {
        setNodes(data.nodes || []);
        setRelations(data.relations || []);
        setAttributes(data.attributes || []);
      });
    
    // Fetch graph key
    authenticatedFetch(`${API_BASE_URL}/api/graphs/${graphId}/key`)
      .then(res => res.json())
      .then(data => setActiveGraphKey(data.key || null));
    
    // Fetch CNL text
    authenticatedFetch(`${API_BASE_URL}/api/graphs/${graphId}/cnl`)
      .then(res => res.json())
      .then(data => {
        setCnlText(prev => ({ ...prev, [graphId]: data.cnl || '' }));
      });
    
    // Fetch graph metadata including publication state
    authenticatedFetch(`${API_BASE_URL}/api/graphs`)
      .then(res => res.json())
      .then(graphs => {
        const currentGraph = graphs.find((g: any) => g.id === graphId);
        if (currentGraph) {
          setPublicationState(currentGraph.publication_state || 'Private');
        }
      })
      .catch(error => {
        console.error('Error fetching graph metadata:', error);
        // Keep current publication state if fetch fails
      });
  };

  const fetchSchemas = () => {
    authenticatedFetch(`${API_BASE_URL}/api/schema/relations`).then(res => res.json()).then(data => setRelationTypes(data));
    authenticatedFetch(`${API_BASE_URL}/api/schema/attributes`).then(res => res.json()).then(data => setAttributeTypes(data));
    authenticatedFetch(`${API_BASE_URL}/api/schema/nodetypes`).then(res => res.json()).then(data => setNodeTypes(data));
  };

  useEffect(() => {
    fetchSchemas();
  }, []);

  useEffect(() => {
    if (activeGraphId) {
      fetchGraph(activeGraphId);
    } else {
      setActiveGraphKey(null);
    }
  }, [activeGraphId]);

  const handleCnlChange = (value: string) => {
    if (activeGraphId) {
      setCnlText(prev => ({ ...prev, [activeGraphId]: value }));
    }
  };

  const handleCnlSubmit = async () => {
    if (!activeGraphId || !cnlText[activeGraphId] || !cnlText[activeGraphId].trim()) return;
    
    setIsSubmitting(true);
    const res = await authenticatedFetch(`${API_BASE_URL}/api/graphs/${activeGraphId}/cnl`, {
      method: 'POST',
      body: JSON.stringify({ cnlText: cnlText[activeGraphId], strictMode }),
    });
    setIsSubmitting(false);
    
    if (!res.ok) {
      const { errors } = await res.json();
      alert(`CNL Error:\n${errors.map((e: any) => `- ${e.message}`).join('\n')}`);
    } else {
      fetchGraph(activeGraphId);
    }
  };
  
  const handleDeleteNode = async (nodeId: string) => {
    if (window.confirm(`Are you sure you want to delete node ${nodeId}?`)) {
      await authenticatedFetch(`${API_BASE_URL}/api/graphs/${activeGraphId}/nodes/${nodeId}`, { method: 'DELETE' });
      setSelectedNodeId(null);
      fetchGraph(activeGraphId!);
    }
  };

  const handleSwitchGraph = (graphId: string) => {
    setActiveGraphId(graphId);
    setViewMode('nodes');
  };

  const handlePublicationStateChange = (newState: 'Private' | 'P2P' | 'Public') => {
    setPublicationState(newState);
    // The publication state change is handled transparently by the backend
    // After a successful change, refresh the publication state from the backend
    if (activeGraphId) {
      // Small delay to ensure backend has processed the change
      setTimeout(() => {
        authenticatedFetch(`${API_BASE_URL}/api/graphs`)
          .then(res => res.json())
          .then(graphs => {
            const currentGraph = graphs.find((g: any) => g.id === activeGraphId);
            if (currentGraph) {
              setPublicationState(currentGraph.publication_state || 'Private');
            }
          })
          .catch(error => {
            console.error('Error refreshing publication state:', error);
          });
      }, 100);
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="app-container">
      <div className="top-bar">
        <div className="top-bar-left">
          {onGoToDashboard && (
            <button
              onClick={onGoToDashboard}
              className="home-button"
              title="Go to Dashboard"
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                marginRight: '12px'
              }}
            >
              🏠 Dashboard
            </button>
          )}
          <GraphSwitcher 
            key={refreshKey}
            activeGraphId={activeGraphId} 
            onGraphSelect={setActiveGraphId} 
            author={name} 
            email={email}
          />
        </div>
        <div className="top-bar-right">
          {user && (
            <span className="user-info" style={{ marginRight: '12px', color: '#6b7280' }}>
              Welcome, {user.username}!
            </span>
          )}
          {onLogout && user && (
            <button
              onClick={onLogout}
              className="logout-btn"
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          )}
        </div>
      </div>

      <main className="main-content">
        <div className="visualization-container">
          <div className="tabs-container">
            <div className="vertical-nav">
              <div className="vertical-tabs">
                <Menu onSelectPage={setActivePage} />
                  <button className={`tab-button ${viewMode === 'editor' ? 'active' : ''}`} onClick={() => setViewMode('editor')} title="Editor">
                    <img src={editorIcon} alt="Editor" style={{margin:'auto'}} />
                  </button>
                  <button className={`tab-button ${viewMode === 'nodes' ? 'active' : ''}`} onClick={() => setViewMode('nodes')} title="Nodes">
                    <img src={nodesIcon} alt="Nodes" style={{margin:'auto'}} />
                  </button>
                  <button className={`tab-button ${viewMode === 'visualization' ? 'active' : ''}`} onClick={() => setViewMode('visualization')} title="Graph">
                    <img src={visualizationIcon} alt="Graph" style={{margin:'auto'}} />
                  </button>
                  <button className={`tab-button ${viewMode === 'schema' ? 'active' : ''}`} onClick={() => setViewMode('schema')} title="Schema">
                    <span style={{display:'flex',justifyContent:'center',alignItems:'center',width:'32px',height:'32px',borderRadius:'50%',background:'#e0e0e0',margin:'auto'}}>
                      <img src={schemaIcon} alt="Schema" style={{width:'20px',height:'20px'}} />
                    </span>
                  </button>
                  <button className={`tab-button ${viewMode === 'peers' ? 'active' : ''}`} onClick={() => setViewMode('peers')} title="Peer-to-Peer">
                    <img src={p2pIcon} alt="Peer-to-Peer" style={{margin:'auto', width:'24px', height:'24px'}} />
                  </button>
                  <button className={`tab-button ${viewMode === 'jsonData' ? 'active' : ''}`} onClick={() => setViewMode('jsonData')} title="JSON Data">
                    <span style={{fontWeight:600, fontSize:'1.3em', letterSpacing:'-2px', color:'#333', margin:'auto'}}>{'{-}'}</span>
                  </button>
                {activeGraphId && (
                  <button className="tab-button delete-graph-btn" onClick={handleDeleteGraph} title="Delete this graph">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="tab-content">
              {activeGraphId ? (
                <>
                  {viewMode === 'editor' && (
                    <div className="editor-container">
                      <CnlEditor
                        value={cnlText[activeGraphId] || ''}
                        onChange={handleCnlChange}
                        onSubmit={handleCnlSubmit}
                        disabled={!activeGraphId}
                        nodeTypes={nodeTypes}
                        relationTypes={relationTypes}
                        attributeTypes={attributeTypes}
                      />
                      <button className="submit-cnl-btn" onClick={handleCnlSubmit} disabled={!activeGraphId || isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit (Ctrl+Enter)'}
                      </button>
                    </div>
                  )}
                  {viewMode === 'visualization' && <Visualization nodes={nodes} relations={relations} attributes={attributes} onNodeSelect={setSelectedNodeId} />}
                  {viewMode === 'jsonData' && <JsonView data={{ nodes, relations, attributes }} />}
                  {viewMode === 'nodes' && <DataView 
                    activeGraphId={activeGraphId} 
                    nodes={nodes} 
                    relations={relations} 
                    attributes={attributes} 
                    onDataChange={() => fetchGraph(activeGraphId)} 
                    cnlText={cnlText[activeGraphId] || ''} 
                    onCnlChange={handleCnlChange} 
                    onSwitchGraph={handleSwitchGraph}
                    publication_state={publicationState}
                    onPublicationStateChange={handlePublicationStateChange}
                  />}
                  {viewMode === 'schema' && <SchemaView onSchemaChange={fetchSchemas} />}
                  {viewMode === 'peers' && <PeerTab activeGraphId={activeGraphId} graphKey={activeGraphKey} />}
                </>
              ) : (
                <div className="placeholder">Select or create a graph to begin. For examples of how to create graphs, check Menu-Examples/Help.</div>
              )}
            </div>
          </div>
        </div>
      </main>

      {activePage === 'Preferences' ? (
        <Preferences 
          strictMode={strictMode}
          onStrictModeChange={setStrictMode}
          name={name}
          onNameChange={setName}
          email={email}
          onEmailChange={setEmail}
          onClose={() => setActivePage(null)} 
        />
      ) : activePage && (
        <PageView page={activePage} onClose={() => setActivePage(null)} />
      )}
    </div>
  )
}

export default App
