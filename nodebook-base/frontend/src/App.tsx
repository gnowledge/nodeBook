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
import { EditorHeader } from './EditorHeader';
import { PeerTab } from './PeerTab';
import { JsonView } from './JsonView';
import { PageView } from './PageView';
import { Preferences } from './Preferences';
import { TopBar } from './TopBar';
import { MediaManager } from './MediaManager';
import { GraphScore } from './GraphScore';
import { CompactScoreDisplay } from './CompactScoreDisplay';
import { SlideShow } from './SlideShow';
import { DraggableModal } from './DraggableModal';
import { calculateGraphScore } from './utils/graphScoring';
import { ensureDescriptionBlocks, extractDescriptionsForAnalysis, debugDescriptions } from './utils/cnlProcessor';
import { analyzeMultipleTexts, type NLPAnalysisResult, type NLPAnalysisError } from './services/nlpAnalysisService';
import { WordNetService } from './services/wordnetService';
import { WordNetDefinitionsPanel } from './WordNetDefinitionsPanel';
import { NLPSidePanel } from './NLPSidePanel';
import type { Node, Edge, RelationType, AttributeType, Attribute } from './types';
import { API_BASE_URL } from './api-config';
import { keycloakAuth } from './services/keycloakAuth';

type ViewMode = 'editor' | 'visualization' | 'slideshow' | 'jsonData' | 'nodes' | 'schema' | 'peers' | 'media' | 'score';

interface AppProps {
  onLogout?: () => void;
  onGoToDashboard?: () => void;
  user?: any;
}

function App({ onLogout, onGoToDashboard, user }: AppProps) {
  // Helper function for authenticated API calls with token refresh
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    // Ensure access token is valid (refresh if near expiry)
    await keycloakAuth.ensureValidToken();
    let token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      ...options.headers as Record<string, string>,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body) headers['Content-Type'] = headers['Content-Type'] || 'application/json';

    let res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      // Try to refresh and retry once
      const refreshed = await keycloakAuth.refreshAccessToken();
      token = localStorage.getItem('token');
      const retryHeaders: Record<string, string> = { ...headers };
      if (refreshed && token) {
        retryHeaders['Authorization'] = `Bearer ${token}`;
        res = await fetch(url, { ...options, headers: retryHeaders });
      }
    }
    return res;
  };

  // Collab-aware fetch: if a collaboration token exists, route to collab endpoints for graph reads/writes
  const collabFetch = (path: string, options: RequestInit = {}) => {
    const collabToken = localStorage.getItem('collabToken');
    const graphIdForPath = activeGraphId || localStorage.getItem('selectedGraphId') || '';
    if (collabToken && graphIdForPath) {
      if (path.endsWith(`/graphs/${graphIdForPath}/graph`)) {
        return fetch(`/api/collab/${collabToken}/graphs/${graphIdForPath}/graph`, options);
      }
      if (path.endsWith(`/graphs/${graphIdForPath}/cnl`)) {
        const method = (options.method || 'GET').toUpperCase();
        if (method === 'GET') {
          return fetch(`/api/collab/${collabToken}/graphs/${graphIdForPath}/cnl`, options);
        }
        if (method === 'POST') {
          return fetch(`/api/collab/${collabToken}/graphs/${graphIdForPath}/cnl`, {
            ...options,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
    return authenticatedFetch(path, options);
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
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [relationTypes, setRelationTypes] = useState<RelationType[]>([]);
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([]);
  const [nodeTypes, setNodeTypes] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isNodeCardOpen, setIsNodeCardOpen] = useState<boolean>(false);
  const [graphMode, setGraphMode] = useState<'markdown' | 'mindmap' | 'richgraph' | 'strictgraph'>('richgraph');
  // Single CNL text for the current graph
  const [cnlText, setCnlText] = useState<string>('');
  // Collaboration state
  const [enableCollaboration, setEnableCollaboration] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [isMobile, setIsMobile] = useState(false);
  const [activePage, setActivePage] = useState<string | null>(null);
  const [isVersionControlOpen, setIsVersionControlOpen] = useState(false);
  
  // Editor-specific state for tools
  const [isNLPPanelOpen, setIsNLPPanelOpen] = useState(false);
  const [nlpAnalysisResults, setNlpAnalysisResults] = useState<Array<any>>([]);
  const [isNLPLoading, setIsNLPLoading] = useState(false);
  const [nlpError, setNlpError] = useState<string | null>(null);
  
  const [isWordNetPanelOpen, setIsWordNetPanelOpen] = useState(false);
  const [wordNetTerms, setWordNetTerms] = useState<string[]>([]);
  
  // Morph change handler
  const handleMorphChange = async (nodeId: string, morphId: string) => {
    if (!activeGraphId) return;
    
    try {
      console.log(`[App] Changing morph for node ${nodeId} to ${morphId}`);
      
      const response = await authenticatedFetch(`/api/graphs/${activeGraphId}/nodes/${nodeId}/morph`, {
        method: 'POST',
        body: JSON.stringify({ morphId })
      });
      
      console.log(`[App] Morph change response:`, { status: response.status, ok: response.ok });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`[App] Morph change successful:`, result);
        
        // Refresh the graph data to show the updated morph
        fetchGraph(activeGraphId);
      } else {
        const errorText = await response.text();
        console.error(`[App] Morph change failed:`, { status: response.status, error: errorText });
        throw new Error(`Failed to change morph: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('[App] Error changing morph:', error);
      alert(`Failed to change morph: ${error.message}`);
    }
  };

  // Transition simulation handler
  const handleTransitionSimulate = async (transitionId: string) => {
    try {
      console.log(`[App] Simulating transition ${transitionId}`);
      
      // For now, we'll just show an alert. In the future, this could:
      // 1. Call a backend API to simulate the transition
      // 2. Update node states based on the transition
      // 3. Show animation or visual feedback
      
      const transitionNode = nodes.find(n => n.id === transitionId);
      if (transitionNode) {
        alert(`Simulating transition: ${transitionNode.name}\n\nThis would transform the prior states into post states according to the transition rules.`);
      }
      
    } catch (error) {
      console.error('[App] Error simulating transition:', error);
      alert('Failed to simulate transition. See console for details.');
    }
  };

  // Enhanced node selection handler
  const handleNodeSelect = (nodeId: string | null) => {
    if (nodeId) {
      // Clicking on a node: select it and open/keep modal open
      setSelectedNodeId(nodeId);
      setIsNodeCardOpen(true);
    } else {
      // Clicking on empty space: close modal but keep selected node for reference
      setIsNodeCardOpen(false);
    }
  };

  // Handler for closing the modal
  const handleCloseNodeCard = () => {
    setIsNodeCardOpen(false);
    setSelectedNodeId(null);
  };
  const [isWordNetLoading, setIsWordNetLoading] = useState(false);
  const [wordNetError, setWordNetError] = useState<string | null>(null);
  const [strictMode, setStrictMode] = useState<boolean>(false);
  const [insertTextFunction, setInsertTextFunction] = useState<((text: string) => void) | null>(null);
  const [defaultGraphMode, setDefaultGraphMode] = useState<'markdown' | 'mindmap' | 'richgraph' | 'strictgraph'>(() => {
    const saved = localStorage.getItem('defaultGraphMode');
    return (saved as any) || 'richgraph';
  });
  const [activeGraph, setActiveGraph] = useState<any>(null);
  const [graphs, setGraphs] = useState<any[]>([]);
  const [graphScore, setGraphScore] = useState<any>(null);
  const [name, setName] = useState(() => localStorage.getItem('userName') || '');
  const [email, setEmail] = useState(() => localStorage.getItem('userEmail') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [publicationState, setPublicationState] = useState<'Private' | 'P2P' | 'Public'>('Private');
  const [collabRole, setCollabRole] = useState<'view' | 'edit' | null>(null);

  useEffect(() => {
    localStorage.setItem('defaultGraphMode', defaultGraphMode);
  }, [defaultGraphMode]);

  // Track mobile breakpoint to render a single editor instance
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Resolve collaboration role from token (if present)
  useEffect(() => {
    const token = localStorage.getItem('collabToken');
    if (!token) {
      setCollabRole(null);
      return;
    }
    fetch(`/api/collab/resolve/${token}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => setCollabRole((data && (data.role === 'view' || data.role === 'edit')) ? data.role : null))
      .catch(() => setCollabRole(null));
  }, [activeGraphId]);

  useEffect(() => {
    localStorage.setItem('userName', name);
  }, [name]);

  useEffect(() => {
    localStorage.setItem('userEmail', email);
  }, [email]);

  const fetchGraph = (graphId: string) => {
    if (!graphId) return;
    
    // Fetch graph data (nodes, relations, attributes)
            collabFetch(`/api/graphs/${graphId}/graph`)
      .then(res => res.json())
      .then(data => {
        const graphNodes = data.nodes || [];
        const graphRelations = data.relations || [];
        const graphAttributes = data.attributes || [];
        const graphMode = data.mode || 'richgraph';
        
        setNodes(graphNodes);
        setRelations(graphRelations);
        setAttributes(graphAttributes);
        setGraphMode(graphMode);
        
        // Calculate graph score
        const score = calculateGraphScore(graphNodes, graphRelations, graphAttributes);
        setGraphScore(score);
      });
    
    // Fetch graph key
            authenticatedFetch(`/api/graphs/${graphId}/key`)
      .then(res => res.json())
      .then(data => setActiveGraphKey(data.key || null));
    
    // Fetch CNL text
    collabFetch(`/api/graphs/${graphId}/cnl`)
      .then(res => res.json())
      .then(data => {
        console.log('[App] Setting CNL text:', { graphId, cnlData: data.cnl, cnlLength: data.cnl?.length });
        const cnlContent = data.cnl || '';
        setCnlText(cnlContent);
      });
    
    // Fetch graph metadata including publication state and mode
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
          if (currentGraph.mode) setGraphMode(currentGraph.mode);
        } else {
          // If in collab mode, try to set activeGraph name from collab graph fetch
          const collabToken = localStorage.getItem('collabToken');
          if (collabToken) {
            collabFetch(`/api/graphs/${graphId}/graph`)
              .then(res => res.json())
              .then(info => {
                setActiveGraph({ id: graphId, name: info?.name || 'Shared Graph', mode: info?.mode || 'richgraph' });
                if (info?.mode) setGraphMode(info.mode);
              })
              .catch(() => {});
          }
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
    const res = await collabFetch(`/api/graphs/${activeGraphId}/cnl`, {
      method: 'POST',
      body: JSON.stringify({ cnlText: cnlText }),
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

  // Get current user info for collaboration
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser({
          id: payload.id || payload.userId || 'anonymous',
          name: payload.name || payload.username || 'Anonymous'
        });
      } catch (error) {
        console.error('Error parsing token:', error);
        setCurrentUser({ id: 'anonymous', name: 'Anonymous' });
      }
    }
  }, []);

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

  const handleCollaborationToggle = (enabled: boolean) => {
    setEnableCollaboration(enabled);
    console.log(`Collaboration ${enabled ? 'enabled' : 'disabled'}`);
  };

  // Editor-specific handler functions
  const handleAutoInsertDescriptions = () => {
    const enhancedCnl = ensureDescriptionBlocks(cnlText || '');
    
    if (enhancedCnl !== cnlText) {
      setCnlText(enhancedCnl);
    }
  };

  const handleNLPParse = async () => {
    if (!cnlText || !cnlText.trim()) {
      setNlpError('No CNL text to analyze');
      return;
    }

    setIsNLPLoading(true);
    setNlpError(null);
    setNlpAnalysisResults([]);

    try {
      // First, ensure description blocks are present
      const enhancedCnl = ensureDescriptionBlocks(cnlText);
      
      // Debug: Show what we're extracting
      debugDescriptions(enhancedCnl);
      
      // Extract descriptions for analysis
      const descriptions = extractDescriptionsForAnalysis(enhancedCnl);
      
      if (descriptions.length === 0) {
        setNlpError('No descriptions found in the CNL text. Please add description blocks to your nodes.');
        setIsNLPLoading(false);
        return;
      }

      // Analyze all descriptions
      const analysisResult = await analyzeMultipleTexts(descriptions);
      
      if (analysisResult.results.length > 0) {
        // Store all analysis results
        setNlpAnalysisResults(analysisResult.results);
        setIsNLPPanelOpen(true);
      } else {
        setNlpError('Failed to analyze the text. Please try again.');
      }
    } catch (error) {
      setNlpError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsNLPLoading(false);
    }
  };

  const handleWordNetAutoDescription = () => {
    if (!cnlText || !cnlText.trim()) {
      setWordNetError('No CNL text to analyze');
      return;
    }

    setIsWordNetLoading(true);
    setWordNetError(null);
    setWordNetTerms([]);

    try {
      const terms = WordNetService.extractTermsFromCNL(cnlText);
      setWordNetTerms(terms);
      setIsWordNetPanelOpen(true);
    } catch (error) {
      setWordNetError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsWordNetLoading(false);
    }
  };

  const handleInsertTextFunction = useCallback((insertFunction: (text: string) => void) => {
    console.log('handleInsertTextFunction called, setting insertTextFunction');
    console.log('insertFunction:', insertFunction);
    setInsertTextFunction(() => insertFunction);
  }, []);

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
                        {!isMobile && (
                        <div className={styles.desktopLayout}>
                          <div className={styles.editorSection}>
                            <EditorHeader
                              graphName={(() => {
                                const collabToken = localStorage.getItem('collabToken');
                                if (collabToken) {
                                  return activeGraph?.name || 'Shared Graph';
                                }
                                return graphs.find(g => g.id === activeGraphId)?.name || 'Unknown Graph';
                              })()}
                              graphId={activeGraphId}
                              graphMode={graphMode}
                              onGraphModeChange={setGraphMode}
                              onVersionControlOpen={() => setIsVersionControlOpen(true)}
                              enableCollaboration={enableCollaboration}
                              onCollaborationToggle={setEnableCollaboration}
                              userId={user?.id}
                              disabled={!activeGraphId || collabRole === 'view'}
                              isWordNetLoading={isWordNetLoading}
                              isNLPLoading={isNLPLoading}
                              value={cnlText || ''}
                              onAutoInsertDescriptions={handleAutoInsertDescriptions}
                              onWordNetAutoDescription={handleWordNetAutoDescription}
                              onNLPParse={handleNLPParse}
                            />
                            <CnlEditor
                              value={cnlText || ''}
                              onChange={handleCnlChange}
                              onSubmit={handleCnlSubmit}
                              onSave={handleCnlSave}
                              onAutoSave={handleCnlAutoSave}
                              onClose={onGoToDashboard}
                              disabled={!activeGraphId || collabRole === 'view'}
                              nodeTypes={nodeTypes}
                              relationTypes={relationTypes}
                              attributeTypes={attributeTypes}
                              graphId={activeGraphId}
                              editStatus={{
                                isModified: activeGraphId && cnlText ? true : false,
                                isSaved: false // We'll need to track this properly later
                              }}
                              enableCollaboration={enableCollaboration}
                              userId={currentUser?.id}
                              userName={currentUser?.name}
                              onCollaborationToggle={handleCollaborationToggle}
                              graphMode={graphMode}
                              onGraphModeChange={async (newMode) => {
                                if (!activeGraphId) return;
                                try {
                                  const res = await authenticatedFetch(`/api/graphs/${activeGraphId}/mode`, {
                                    method: 'PUT',
                                    body: JSON.stringify({ mode: newMode })
                                  });
                                  if (res.ok) {
                                    setGraphMode(newMode);
                                    fetchGraph(activeGraphId);
                                  } else {
                                    const err = await res.json().catch(() => ({}));
                                    alert(`Failed to set mode: ${err?.error || res.status}`);
                                  }
                                } catch (e) {
                                  alert('Network error while setting mode');
                                }
                              }}
                              isVersionControlOpen={isVersionControlOpen}
                              onVersionControlOpen={() => setIsVersionControlOpen(true)}
                              onVersionControlClose={() => setIsVersionControlOpen(false)}
                              onInsertText={handleInsertTextFunction}
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
                              <h3>{graphMode === 'markdown' ? 'Markdown Preview' : 'Graph Visualization'}</h3>
                            </div>
                            <div className={styles.visualizationWrapper}>
                              {graphMode === 'markdown' ? (
                                <DataView 
                                  activeGraphId={activeGraphId} 
                                  nodes={nodes} 
                                  relations={relations} 
                                  attributes={attributeTypes} 
                                  onDataChange={() => fetchGraph(activeGraphId)} 
                                  cnlText={cnlText || ''} 
                                  onCnlChange={handleCnlChange} 
                                  publication_state={publicationState}
                                  onPublicationStateChange={handlePublicationStateChange}
                                  graphMode={graphMode}
                                  onMorphChange={handleMorphChange}
                                />
                              ) : (
                                <>
                                  <Visualization nodes={nodes} relations={relations} attributes={attributes} onNodeSelect={handleNodeSelect} onMorphChange={handleMorphChange} graphMode={graphMode === 'strictgraph' ? 'richgraph' : graphMode} />
                                  <DraggableModal
                                    isOpen={isNodeCardOpen && !!selectedNode}
                                    onClose={handleCloseNodeCard}
                                    title={selectedNode ? `${selectedNode.name} ${selectedNode.role === 'Transition' ? '(Transition)' : ''}` : ''}
                                    initialPosition={{ x: 100, y: 100 }}
                                  >
                                    {selectedNode && (
                                      <NodeCard
                                        node={selectedNode}
                                        allNodes={nodes}
                                        allRelations={relations}
                                        attributes={attributes}
                                        isActive={false}
                                        onSelectNode={(nodeId) => console.log('Node selected:', nodeId)}
                                        onImportContext={(nodeId) => console.log('Import context:', nodeId)}
                                        nodeRegistry={{}}
                                        isPublic={false}
                                        graphId={activeGraphId || undefined}
                                        onMorphChange={handleMorphChange}
                                        onTransitionSimulate={handleTransitionSimulate}
                                      />
                                    )}
                                  </DraggableModal>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        )}
                        
                        {/* Mobile: Tabbed layout (hidden on desktop) */}
                        {isMobile && (
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
                            disabled={!activeGraphId || collabRole === 'view'}
                            nodeTypes={nodeTypes}
                            relationTypes={relationTypes}
                            attributeTypes={attributeTypes}
                            graphId={activeGraphId}
                            editStatus={{
                              isModified: activeGraphId && cnlText ? true : false,
                              isSaved: false // We'll need to track this properly later
                            }}
                            enableCollaboration={enableCollaboration}
                            userId={currentUser?.id}
                            userName={currentUser?.name}
                            onCollaborationToggle={handleCollaborationToggle}
                            graphMode={graphMode}
                            onGraphModeChange={async (newMode) => {
                              if (!activeGraphId) return;
                              try {
                                const res = await authenticatedFetch(`/api/graphs/${activeGraphId}/mode`, {
                                  method: 'PUT',
                                  body: JSON.stringify({ mode: newMode })
                                });
                                if (res.ok) {
                                  setGraphMode(newMode);
                                  fetchGraph(activeGraphId);
                                } else {
                                  const err = await res.json().catch(() => ({}));
                                  alert(`Failed to change mode: ${err.error || 'Unknown error'}`);
                                }
                              } catch (e) {
                                console.error('Failed to change mode', e);
                              }
                            }}
                            isVersionControlOpen={isVersionControlOpen}
                            onVersionControlOpen={() => setIsVersionControlOpen(true)}
                            onVersionControlClose={() => setIsVersionControlOpen(false)}
                            onInsertText={handleInsertTextFunction}
                          />
                        </div>
                        )}
                      </div>
                    )}
                    {viewMode === 'visualization' && (
                      <div className={styles.visualizationWrapper}>
                        <Visualization nodes={nodes} relations={relations} attributes={attributes} onNodeSelect={handleNodeSelect} onMorphChange={handleMorphChange} graphMode={graphMode === 'strictgraph' ? 'richgraph' : (graphMode === 'markdown' ? 'richgraph' : graphMode)} />
                        <DraggableModal
                          isOpen={isNodeCardOpen && !!selectedNode}
                          onClose={handleCloseNodeCard}
                          title={selectedNode ? `${selectedNode.name} ${selectedNode.role === 'Transition' ? '(Transition)' : ''}` : ''}
                          initialPosition={{ x: 150, y: 150 }}
                        >
                          {selectedNode && (
                            <NodeCard
                              node={selectedNode}
                              allNodes={nodes}
                              allRelations={relations}
                              attributes={attributes}
                              isActive={false}
                              onSelectNode={(nodeId) => console.log('Node selected:', nodeId)}
                              onImportContext={(nodeId) => console.log('Import context:', nodeId)}
                              nodeRegistry={{}}
                              isPublic={false}
                              graphId={activeGraphId || undefined}
                              onMorphChange={handleMorphChange}
                              onTransitionSimulate={handleTransitionSimulate}
                            />
                          )}
                        </DraggableModal>
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
                      attributes={attributeTypes} 
                      onDataChange={() => fetchGraph(activeGraphId)} 
                      cnlText={cnlText || ''} 
                      onCnlChange={handleCnlChange} 
                      // Graph switching removed
                      publication_state={publicationState}
                      onPublicationStateChange={handlePublicationStateChange}
                      graphMode={graphMode}
                      onMorphChange={handleMorphChange}
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
            name={name}
            onNameChange={setName}
            email={email}
            onEmailChange={setEmail}
            defaultGraphMode={defaultGraphMode}
            onDefaultGraphModeChange={setDefaultGraphMode}
            onClose={() => setActivePage(null)} 
          />
        ) : activePage && (
          <PageView page={activePage} onClose={() => setActivePage(null)} />
        )}

        {/* NLP Analysis Panel */}
        {isNLPPanelOpen && (
          <NLPSidePanel
            isOpen={isNLPPanelOpen}
            onClose={() => setIsNLPPanelOpen(false)}
            analysisResults={nlpAnalysisResults}
            isLoading={isNLPLoading}
            error={nlpError}
          />
        )}

        {/* WordNet Definitions Panel */}
        {isWordNetPanelOpen && (
          <WordNetDefinitionsPanel
            isOpen={isWordNetPanelOpen}
            onClose={() => setIsWordNetPanelOpen(false)}
            terms={wordNetTerms}
            onDefinitionSelect={(term, definition) => {
              // Insert the definition text into the CNL editor
              console.log('WordNet onDefinitionSelect called:', { term, definition, insertTextFunction: !!insertTextFunction });
              if (insertTextFunction) {
                const textToInsert = `\n${term}: ${definition}\n`;
                console.log('Inserting text:', textToInsert);
                insertTextFunction(textToInsert);
              } else {
                console.warn('Insert text function not available');
              }
            }}
            isLoading={isWordNetLoading}
          />
        )}
      </div>
    </div>
  )
}

export default App
