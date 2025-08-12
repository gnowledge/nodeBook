import React, { useState, useEffect } from 'react';
import './App.css';
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

type ViewMode = 'editor' | 'visualization' | 'jsonData' | 'nodes' | 'schema' | 'peers';

function App() {
  const [activeGraphId, setActiveGraphId] = useState<string | null>('default'); // Start with default
  const [activeGraphKey, setActiveGraphKey] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [relations, setRelations] = useState<Edge[]>([]);
  const [attributes, setAttributes] = useState<AttributeType[]>([]);
  const [relationTypes, setRelationTypes] = useState<RelationType[]>([]);
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([]);
  const [nodeTypes, setNodeTypes] = useState<any[]>([]);
  const [cnlText, setCnlText] = useState<{ [graphId: string]: string }>({});
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [activePage, setActivePage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User and Editor Preferences
  const [strictMode, setStrictMode] = useState(() => JSON.parse(localStorage.getItem('strictMode') || 'true'));
  const [name, setName] = useState(() => localStorage.getItem('userName') || '');
  const [email, setEmail] = useState(() => localStorage.getItem('userEmail') || '');

  useEffect(() => { localStorage.setItem('strictMode', JSON.stringify(strictMode)); }, [strictMode]);
  useEffect(() => { localStorage.setItem('userName', name); }, [name]);
  useEffect(() => { localStorage.setItem('userEmail', email); }, [email]);

  const fetchGraph = async (graphId: string) => {
    if (!graphId) return;
    const graphData = await window.electronAPI.graphs.getGraph(graphId);
    setNodes(graphData.nodes || []);
    setRelations(graphData.relations || []);
    setAttributes(graphData.attributes || []);
    const key = await window.electronAPI.graphs.getKey(graphId);
    setActiveGraphKey(key || null);
    // CNL text is managed locally for now
  };

  const fetchSchemas = async () => {
    const [rels, attrs, nodeTs] = await Promise.all([
      window.electronAPI.schema.get('relations'),
      window.electronAPI.schema.get('attributes'),
      window.electronAPI.schema.get('nodetypes'),
    ]);
    setRelationTypes(rels);
    setAttributeTypes(attrs);
    setNodeTypes(nodeTs);
  };

  useEffect(() => {
    fetchSchemas();
  }, []);

  useEffect(() => {
    if (activeGraphId) {
      fetchGraph(activeGraphId);
    } else {
      setNodes([]);
      setRelations([]);
      setAttributes([]);
      setActiveGraphKey(null);
    }
  }, [activeGraphId]);

  const handleCnlChange = (value: string) => {
    if (activeGraphId) {
      setCnlText(prev => ({ ...prev, [activeGraphId]: value }));
    }
  };

  const handleCnlSubmit = async () => {
    if (!activeGraphId || !cnlText[activeGraphId]?.trim()) return;
    
    setIsSubmitting(true);
    const result = await window.electronAPI.cnl.submit(activeGraphId, cnlText[activeGraphId], strictMode);
    setIsSubmitting(false);
    
    if (!result.success) {
      alert(`CNL Error:\n${result.errors.map((e: any) => `- ${e.message}`).join('\n')}`);
    } else {
      fetchGraph(activeGraphId); // Refresh graph data after successful submit
    }
  };
  
  const handleDeleteNode = async (nodeId: string) => {
    if (activeGraphId && window.confirm(`Are you sure you want to delete node ${nodeId}?`)) {
      await window.electronAPI.nodes.delete(activeGraphId, nodeId);
      fetchGraph(activeGraphId);
    }
  };

  return (
    <div className="app-container">
      <div className="top-bar">
        <GraphSwitcher activeGraphId={activeGraphId} onGraphSelect={setActiveGraphId} author={name} email={email} />
      </div>

      <main className="main-content">
        <div className="visualization-container">
          <div className="tabs-container">
            <div className="tabs">
              <button className={`tab-button ${viewMode === 'editor' ? 'active' : ''}`} onClick={() => setViewMode('editor')}>Editor</button>
              <button className={`tab-button ${viewMode === 'visualization' ? 'active' : ''}`} onClick={() => setViewMode('visualization')}>Visualization</button>
              <button className={`tab-button ${viewMode === 'jsonData' ? 'active' : ''}`} onClick={() => setViewMode('jsonData')}>JSON Data</button>
              <button className={`tab-button ${viewMode === 'nodes' ? 'active' : ''}`} onClick={() => setViewMode('nodes')}>Nodes</button>
              <button className={`tab-button ${viewMode === 'schema' ? 'active' : ''}`} onClick={() => setViewMode('schema')}>Schema</button>
              <button className={`tab-button ${viewMode === 'peers' ? 'active' : ''}`} onClick={() => setViewMode('peers')}>Peers</button>
            </div>
            <Menu onSelectPage={setActivePage} />
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
                {viewMode === 'visualization' && <Visualization nodes={nodes} relations={relations} attributes={attributes} onNodeSelect={() => {}} />}
                {viewMode === 'jsonData' && <JsonView data={{ nodes, relations, attributes }} />}
                {viewMode === 'nodes' && <DataView activeGraphId={activeGraphId} nodes={nodes} relations={relations} attributes={attributes} onDataChange={() => fetchGraph(activeGraphId)} />}
                {viewMode === 'schema' && <SchemaView onSchemaChange={fetchSchemas} />}
                {viewMode === 'peers' && <PeerTab activeGraphId={activeGraphId} graphKey={activeGraphKey} />}
              </>
            ) : (
              <div className="placeholder">Select or create a graph to begin.</div>
            )}
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

export default App;