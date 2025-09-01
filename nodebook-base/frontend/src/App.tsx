import p2pIcon from './assets/p2p.svg';
import React, { useState, useEffect, useCallback } from 'react';
import editorIcon from './assets/editor.svg';
import visualizationIcon from './assets/visualization.svg';
import jsonDataIcon from './assets/jsonData.svg';
import nodesIcon from './assets/nodes.svg';
import schemaIcon from './assets/schema.svg';
import peersIcon from './assets/peers.svg';
import trashIcon from './assets/trash_icon.png';
import styles from './App.module.css';
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
import { TopBar } from './TopBar';
import { MediaManager } from './MediaManager';
import { GraphScore } from './GraphScore';
import { CompactScoreDisplay } from './CompactScoreDisplay';
import { SlideShow } from './SlideShow';
import { calculateGraphScore } from './utils/graphScoring';
import type { Node, Edge, RelationType, AttributeType } from './types';
import { API_BASE_URL } from './api-config';

type ViewMode = 'editor' | 'visualization' | 'slideshow' | 'jsonData' | 'nodes' | 'schema' | 'peers' | 'media' | 'score';

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
        const res = await authenticatedFetch(`/api/graphs/${activeGraphId}`, { method: 'DELETE' });
        if (res.ok) {
          setActiveGraphId(null);
          setActiveGraphKey(null);
          setNodes([]);
          setRelations([]);
          setAttributes([]);
                  setCnlText(''); // Clear CNL text when deleting graph
          
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
  const [nodeTypes, setNodeTypes] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // Single CNL text for the current graph
  const [cnlText, setCnlText] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [activePage, setActivePage] = useState<string | null>(null);
  const [strictMode, setStrictMode] = useState(() => {
    const saved = localStorage.getItem('strictMode');
    return saved !== null ? JSON.parse(saved) : true; // Default to true
  });
  const [activeGraph, setActiveGraph] = useState<any>(null);
  const [graphs, setGraphs] = useState<any[]>([]);
  const [graphScore, setGraphScore] = useState<any>(null);
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
            authenticatedFetch(`/api/graphs/${graphId}/graph`)
      .then(res => res.json())
      .then(data => {
        const graphNodes = data.nodes || [];
        const graphRelations = data.relations || [];
        const graphAttributes = data.attributes || [];
        
        setNodes(graphNodes);
        setRelations(graphRelations);
        setAttributes(graphAttributes);
        
        // Calculate graph score
        const score = calculateGraphScore(graphNodes, graphRelations, graphAttributes);
        setGraphScore(score);
      });
    
    // Fetch graph key
            authenticatedFetch(`/api/graphs/${graphId}/key`)
      .then(res => res.json())
      .then(data => setActiveGraphKey(data.key || null));
    
    // Fetch CNL text
    authenticatedFetch(`/api/graphs/${graphId}/cnl`)
      .then(res => res.json())
      .then(data => {
        console.log('[App] Setting CNL text:', { graphId, cnlData: data.cnl, cnlLength: data.cnl?.length });
        const cnlContent = data.cnl || '';
        setCnlText(cnlContent);
      });
    
    // Fetch graph metadata including publication state
    authenticatedFetch(`/api/graphs`)
      .then(res => res.json())
      .then((data: any) => {
        // Handle both array format and {success: true, graphs: [...]} format
        const graphsArray = Array.isArray(data) ? data : (data.graphs || []);
        setGraphs(graphsArray);
        const currentGraph = graphsArray.find((g: any) => g.id === graphId);
        if (currentGraph) {
          setActiveGraph(currentGraph);
          setPublicationState(currentGraph.publication_state || 'Private');
        }
      })
      .catch(error => {
        console.error('Error fetching graph metadata:', error);
        // Keep current publication state if fetch fails
      });
  };

  const fetchSchemas = () => {
    authenticatedFetch(`/api/schema/relations`).then(res => res.json()).then(data => setRelationTypes(data));
    authenticatedFetch(`/api/schema/attributes`).then(res => res.json()).then(data => setAttributeTypes(data));
    authenticatedFetch(`/api/schema/nodetypes`).then(res => res.json()).then(data => setNodeTypes(data));
  };

  useEffect(() => {
    fetchSchemas();
  }, []);

  // Check for selected graph ID from Dashboard navigation
  useEffect(() => {
    const selectedGraphId = localStorage.getItem('selectedGraphId');
    if (selectedGraphId && !activeGraphId) {
      setActiveGraphId(selectedGraphId);
      // Clear the stored ID to avoid conflicts
      localStorage.removeItem('selectedGraphId');
    }
  }, [activeGraphId]);

  useEffect(() => {
    if (activeGraphId) {
      fetchGraph(activeGraphId);
    } else {
      setActiveGraphKey(null);
      setGraphScore(null);
    }
  }, [activeGraphId]);

  // Recalculate score when graph data changes
  useEffect(() => {
    if (nodes.length > 0 || relations.length > 0 || attributes.length > 0) {
      const score = calculateGraphScore(nodes, relations, attributes);
      setGraphScore(score);
    }
  }, [nodes, relations, attributes]);

  const handleCnlChange = (value: string) => {
    console.log('[App] handleCnlChange called:', { 
      value: value.substring(0, 100) + '...', 
      valueLength: value.length,
      activeGraphId,
      previousValue: cnlText.substring(0, 100) + '...',
      previousLength: cnlText.length
    });
    
    if (activeGraphId) {
      console.log('[App] Setting cnlText for graph:', activeGraphId);
      setCnlText(value);
      console.log('[App] Updated cnlText state for graph:', activeGraphId);
    } else {
      console.warn('[App] handleCnlChange called but no activeGraphId!');
    }
  };

  const handleCnlSave = async () => {
    if (!activeGraphId || !cnlText || !cnlText.trim()) return;
    
    try {
      const res = await authenticatedFetch(`/api/graphs/${activeGraphId}/cnl`, {
        method: 'PUT',
        body: JSON.stringify({ cnlText: cnlText }),
      });
      
      if (!res.ok) {
        const responseData = await res.json();
        let errorMessage = 'Unknown error occurred while saving CNL.';
        
        if (responseData.errors && Array.isArray(responseData.errors)) {
          errorMessage = responseData.errors.map((e: any) => `- ${e.message}`).join('\n');
        } else if (responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData.error) {
          errorMessage = responseData.error;
        }
        
        alert(`Save Error:\n${errorMessage}`);
      } else {
        // Save successful
        console.log('CNL saved successfully');
      }
    } catch (error) {
      console.error('Error saving CNL:', error);
      alert('Error saving CNL. Please try again.');
    }
  };

  const handleCnlAutoSave = useCallback(async (value: string) => {
    if (!activeGraphId) return;
    
    try {
      console.log('[Auto-save] Starting auto-save for graph:', activeGraphId);
      console.log('[Auto-save] Value to save length:', value.length);
      
      const res = await authenticatedFetch(`/api/graphs/${activeGraphId}/cnl`, {
        method: 'PUT',
        body: JSON.stringify({ cnlText: value })
      });
      
      if (res.ok) {
        console.log('[Auto-save] CNL auto-saved successfully for graph:', activeGraphId);
        // Update the saved state silently (no user notification)
        setCnlText(value);
        console.log('[Auto-save] Updated cnlText state for graph:', activeGraphId);
      } else {
        console.warn('[Auto-save] Auto-save failed:', res.status);
      }
    } catch (error) {
      console.warn('[Auto-save] Auto-save error:', error);
      // Don't show error to user for auto-save failures
    }
  }, [activeGraphId]);

  const handleCnlSubmit = async () => {
    if (!activeGraphId || !cnlText || !cnlText.trim()) return;
    
    // Check if CNL has been saved (compare with current state)
    if (!cnlText || !cnlText.trim()) {
      alert('Please enter some CNL content before submitting.');
      return;
    }
    
    setIsSubmitting(true);
    const res = await authenticatedFetch(`/api/graphs/${activeGraphId}/cnl`, {
      method: 'POST',
      body: JSON.stringify({ cnlText: cnlText, strictMode }),
    });
    setIsSubmitting(false);
    
    if (!res.ok) {
      const { errors } = await res.json();
      alert(`CNL Error:\n${errors.map((e: any) => `- ${e.message}`).join('\n')}`);
    } else {
      fetchGraph(activeGraphId);
      // Score will be calculated in fetchGraph
    }
  };
  
  const handleDeleteNode = async (nodeId: string) => {
    if (window.confirm(`Are you sure you want to delete node ${nodeId}?`)) {
      await authenticatedFetch(`/api/graphs/${activeGraphId}/nodes/${nodeId}`, { method: 'DELETE' });
      setSelectedNodeId(null);
      fetchGraph(activeGraphId!);
      // Score will be recalculated in fetchGraph
    }
  };

  // Graph switching removed - App is single-graph only

  const handlePublicationStateChange = (newState: 'Private' | 'P2P' | 'Public') => {
    setPublicationState(newState);
    // The publication state change is handled transparently by the backend
    // After a successful change, refresh the publication state from the backend
    if (activeGraphId) {
      // Small delay to ensure backend has processed the change
      setTimeout(() => {
        authenticatedFetch(`/api/graphs`)
          .then(res => res.json())
          .then((data: any) => {
            // Handle both array format and {success: true, graphs: [...]} format
            const graphs = Array.isArray(data) ? data : (data.graphs || []);
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
    <div className={styles.container}>
      <TopBar
        isAuthenticated={!!user}
        user={user}
        onGoToDashboard={onGoToDashboard || (() => {})}
        onGoToApp={() => {}} // Already in app
        onShowAuth={() => {}} // Not needed in app
        onLogout={onLogout || (() => {})}
        currentView="app"
        onSelectPage={setActivePage}
      />

      <div className={styles.content}>
        <main className={styles.mainContent}>
          <div className={styles.visualizationContainer}>
            <div className={styles.tabsContainer}>
              <div className={styles.verticalNav}>
                <div className={styles.verticalTabs}>
                  <Menu onSelectPage={setActivePage} />
                    <button className={`${styles.tabButton} ${viewMode === 'editor' ? styles.active : ''}`} onClick={() => setViewMode('editor')} title="Editor">
                      <img src={editorIcon} alt="Editor" className={styles.tabButtonIcon} />
                    </button>
                    <button className={`${styles.tabButton} ${viewMode === 'nodes' ? styles.active : ''}`} onClick={() => setViewMode('nodes')} title="Nodes">
                      <img src={nodesIcon} alt="Nodes" className={styles.tabButtonIcon} />
                    </button>
                    <button className={`${styles.tabButton} ${viewMode === 'visualization' ? styles.active : ''}`} onClick={() => setViewMode('visualization')} title="Graph">
                      <img src={visualizationIcon} alt="Graph" className={styles.tabButtonIcon} />
                    </button>
                    <button className={`${styles.tabButton} ${viewMode === 'slideshow' ? styles.active : ''}`} onClick={() => setViewMode('slideshow')} title="SlideShow">
                      <span className={styles.slideshowIcon}>🎬</span>
                    </button>
                    <button className={`${styles.tabButton} ${viewMode === 'schema' ? styles.active : ''}`} onClick={() => setViewMode('schema')} title="Schema">
                      <span className={styles.schemaIcon}>
                        <img src={schemaIcon} alt="Schema" className={styles.schemaIconImg} />
                      </span>
                    </button>
                    <button className={`${styles.tabButton} ${viewMode === 'peers' ? styles.active : ''}`} onClick={() => setViewMode('peers')} title="Peer-to-Peer">
                      <img src={p2pIcon} alt="Peer-to-Peer" className={styles.p2pIcon} />
                    </button>
                    <button className={`${styles.tabButton} ${viewMode === 'media' ? styles.active : ''}`} onClick={() => setViewMode('media')} title="Media">
                      <span className={styles.mediaIcon}>📁</span>
                    </button>
                    <button className={`${styles.tabButton} ${viewMode === 'jsonData' ? styles.active : ''}`} onClick={() => setViewMode('jsonData')} title="JSON Data">
                      <span className={styles.jsonIcon}>{'{-}'}</span>
                    </button>
                  {activeGraphId && (
                    <>
                      <button className={`${styles.tabButton} ${viewMode === 'score' ? styles.active : ''}`} onClick={() => setViewMode('score')} title="Graph Score">
                        <span className={styles.scoreIcon}>📊</span>
                      </button>
                      <button className={`${styles.tabButton} ${styles.deleteGraphBtn}`} onClick={handleDeleteGraph} title="Delete this graph">
                        <img src={trashIcon} alt="Delete" className={styles.deleteIcon} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className={styles.tabContent}>
                {activeGraphId ? (
                  <>
                    {viewMode === 'editor' && (
                      <div className={styles.editorContainer}>
                        {/* Desktop: Side-by-side layout */}
                        <div className={styles.desktopLayout}>
                          <div className={styles.editorSection}>
                            <div className={styles.editorHeader}>
                              <div className={styles.editorTitle}>
                                <h3>Working on: {graphs.find(g => g.id === activeGraphId)?.name || 'Unknown Graph'}</h3>
                              </div>
                            </div>
                            <CnlEditor
                              value={cnlText || ''}
                              onChange={handleCnlChange}
                              onSubmit={handleCnlSubmit}
                              onSave={handleCnlSave}
                              onAutoSave={handleCnlAutoSave}
                              onClose={onGoToDashboard}
                              disabled={!activeGraphId}
                              nodeTypes={nodeTypes}
                              relationTypes={relationTypes}
                              attributeTypes={attributeTypes}
                              graphId={activeGraphId}
                              editStatus={{
                                isModified: activeGraphId && cnlText ? true : false,
                                isSaved: false // We'll need to track this properly later
                              }}
                            />
                            
                            {/* Score widget at bottom of Editor */}
                            {activeGraphId && graphScore && (
                              <div className={styles.editorScoreWidget}>
                                <CompactScoreDisplay 
                                  score={graphScore}
                                  isVisible={true}
                                />
                              </div>
                            )}
                          </div>
                          
                          <div className={styles.graphSection}>
                            <div className={styles.graphHeader}>
                              <h3>Graph Visualization</h3>
                            </div>
                            <div className={styles.visualizationWrapper}>
                              <Visualization nodes={nodes} relations={relations} attributes={attributes} onNodeSelect={setSelectedNodeId} />
                              {selectedNode && (
                                <div className={styles.selectedNodeCard}>
                                  <NodeCard
                                    node={selectedNode}
                                    allNodes={nodes}
                                    allRelations={relations}
                                    attributes={attributeTypes}
                                    isActive={false}
                                    onSelectNode={(nodeId) => console.log('Node selected:', nodeId)}
                                    onImportContext={(nodeId) => console.log('Import context:', nodeId)}
                                    nodeRegistry={{}}
                                    isPublic={false}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Mobile: Tabbed layout (hidden on desktop) */}
                        <div className={styles.mobileLayout}>
                          <div className={styles.editorHeader}>
                            <div className={styles.editorTitle}>
                              <h3>Working on: {graphs.find(g => g.id === activeGraphId)?.name || 'Unknown Graph'}</h3>
                            </div>
                          </div>
                          <CnlEditor
                            value={cnlText || ''}
                            onChange={handleCnlChange}
                            onSubmit={handleCnlSubmit}
                            onSave={handleCnlSave}
                            onAutoSave={handleCnlAutoSave}
                            onClose={onGoToDashboard}
                            disabled={!activeGraphId}
                            nodeTypes={nodeTypes}
                            relationTypes={relationTypes}
                            attributeTypes={attributeTypes}
                            graphId={activeGraphId}
                            editStatus={{
                              isModified: activeGraphId && cnlText ? true : false,
                              isSaved: false // We'll need to track this properly later
                            }}
                          />
                          
                          {/* Score widget at bottom of Editor */}
                          {activeGraphId && graphScore && (
                            <div className={styles.editorScoreWidget}>
                              <CompactScoreDisplay 
                                score={graphScore}
                                isVisible={true}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {viewMode === 'visualization' && (
                      <div className={styles.visualizationWrapper}>
                        <Visualization nodes={nodes} relations={relations} attributes={attributes} onNodeSelect={setSelectedNodeId} />
                        {selectedNode && (
                          <div className={styles.selectedNodeCard}>
                            <NodeCard
                              node={selectedNode}
                              allNodes={nodes}
                              allRelations={relations}
                              attributes={attributeTypes}
                              isActive={false}
                              onSelectNode={(nodeId) => console.log('Node selected:', nodeId)}
                              onImportContext={(nodeId) => console.log('Import context:', nodeId)}
                              nodeRegistry={{}}
                              isPublic={false}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {viewMode === 'slideshow' && (
                      <SlideShow
                        nodes={nodes}
                        relations={relations}
                        attributes={attributeTypes}
                        cnlText={cnlText || ''}
                      />
                    )}
                    {viewMode === 'jsonData' && <JsonView data={{ nodes, relations, attributes }} />}
                    {viewMode === 'nodes' && <DataView 
                      activeGraphId={activeGraphId} 
                      nodes={nodes} 
                      relations={relations} 
                      attributes={attributes} 
                      onDataChange={() => fetchGraph(activeGraphId)} 
                      cnlText={cnlText || ''} 
                      onCnlChange={handleCnlChange} 
                      // Graph switching removed
                      publication_state={publicationState}
                      onPublicationStateChange={handlePublicationStateChange}
                    />}
                    {viewMode === 'schema' && <SchemaView onSchemaChange={fetchSchemas} />}
                    {viewMode === 'peers' && <PeerTab activeGraphId={activeGraphId} graphKey={activeGraphKey} />}
                    {viewMode === 'media' && (
                      <div className={styles.mediaContainer}>
                        <MediaManager 
                          graphId={activeGraphId}
                          showUpload={true}
                          showList={true}
                        />
                      </div>
                    )}
                    {viewMode === 'score' && (
                      <div className={styles.scoreContainer}>
                        <GraphScore 
                          score={graphScore}
                          graphName={activeGraph?.name}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.placeholder}>Select or create a graph to begin. For examples of how to create graphs, check Menu-Examples/Help.</div>
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
    </div>
  )
}

export default App
