import { useState, useEffect } from 'react';
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

type ViewMode = 'editor' | 'visualization' | 'jsonData' | 'nodes' | 'schema' | 'peers';

function App() {
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null);
  const [activeGraphKey, setActiveGraphKey] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [relations, setRelations] = useState<Edge[]>([]);
  const [attributes, setAttributes] = useState<AttributeType[]>([]);
  const [relationTypes, setRelationTypes] = useState<RelationType[]>([]);
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([]);
  const [nodeTypes, setNodeTypes] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [cnlText, setCnlText] = useState<{ [graphId: string]: string }>({});
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [activePage, setActivePage] = useState<string | null>(null);
  const [strictMode, setStrictMode] = useState(() => {
    const saved = localStorage.getItem('strictMode');
    return saved !== null ? JSON.parse(saved) : true; // Default to true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem('strictMode', JSON.stringify(strictMode));
  }, [strictMode]);

  const fetchGraph = (graphId: string) => {
    if (!graphId) return;
    fetch(`/api/graphs/${graphId}/graph`)
      .then(res => res.json())
      .then(data => {
        setNodes(data.nodes || []);
        setRelations(data.relations || []);
        setAttributes(data.attributes || []);
      });
    fetch(`/api/graphs/${graphId}/key`)
      .then(res => res.json())
      .then(data => setActiveGraphKey(data.key || null));
    fetch(`/api/graphs/${graphId}/cnl`)
      .then(res => res.json())
      .then(data => {
        setCnlText(prev => ({ ...prev, [graphId]: data.cnl || '' }));
      });
  };

  const fetchSchemas = () => {
    fetch('/api/schema/relations').then(res => res.json()).then(data => setRelationTypes(data));
    fetch('/api/schema/attributes').then(res => res.json()).then(data => setAttributeTypes(data));
    fetch('/api/schema/nodetypes').then(res => res.json()).then(data => setNodeTypes(data));
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
    const res = await fetch(`/api/graphs/${activeGraphId}/cnl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      await fetch(`/api/graphs/${activeGraphId}/nodes/${nodeId}`, { method: 'DELETE' });
      setSelectedNodeId(null);
      fetchGraph(activeGraphId!);
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="app-container">
      <div className="top-bar">
        <GraphSwitcher activeGraphId={activeGraphId} onGraphSelect={setActiveGraphId} />
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
                {viewMode === 'visualization' && <Visualization nodes={nodes} relations={relations} attributes={attributes} onNodeSelect={setSelectedNodeId} />}
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
          onClose={() => setActivePage(null)} 
        />
      ) : activePage && (
        <PageView page={activePage} onClose={() => setActivePage(null)} />
      )}
    </div>
  )
}

export default App