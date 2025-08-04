import { useState, useEffect } from 'react';
import './App.css';
import { NodeCard } from './NodeCard';
import { Visualization } from './Visualization';
import { ViewGraphData } from './ViewGraphData';
import type { Node, Edge, RelationType, AttributeType } from './types';

type ViewMode = 'visualization' | 'jsonData';

function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [relations, setRelations] = useState<Edge[]>([]);
  const [attributes, setAttributes] = useState<AttributeType[]>([]);
  const [relationTypes, setRelationTypes] = useState<RelationType[]>([]);
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [cnlText, setCnlText] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('visualization');

  const fetchGraph = () => {
    fetch('/api/graph')
      .then(res => res.json())
      .then(data => {
        setNodes(data.nodes || []);
        setRelations(data.relations || []);
        setAttributes(data.attributes || []);
      });
  };

  useEffect(() => {
    fetch('/api/schema/relations').then(res => res.json()).then(data => setRelationTypes(data));
    fetch('/api/schema/attributes').then(res => res.json()).then(data => setAttributeTypes(data));
    fetchGraph();
  }, []);

  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'graph') {
        setNodes(data.payload.nodes || []);
        setRelations(data.payload.relations || []);
        setAttributes(data.payload.attributes || []);
      }
    };
    return () => ws.close();
  }, []);

  const handleCnlSubmit = async () => {
    if (!cnlText.trim()) return;
    await fetch('/api/cnl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnlText }),
    });
    setCnlText('');
  };
  
  const handleDeleteNode = async (nodeId: string) => {
    if (window.confirm(`Are you sure you want to delete node ${nodeId}?`)) {
      await fetch(`/api/nodes/${nodeId}`, { method: 'DELETE' });
      setSelectedNodeId(null);
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="app-container">
      <header className="header">
        <img src="/logo.png" alt="NodeBook Logo" className="logo" />
        <div className="workspace">
          <textarea
            className="cnl-textarea"
            value={cnlText}
            onChange={(e) => setCnlText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleCnlSubmit();
              }
            }}
            placeholder={'# A Node...\n  <has relation> Another Node\n  has attribute: some value\n\n(Submit with Ctrl+Enter)'}
          />
        </div>
      </header>

      <main className="visualization-container">
        <div className="tabs">
          <button 
            className={`tab-button ${viewMode === 'visualization' ? 'active' : ''}`}
            onClick={() => setViewMode('visualization')}
          >
            Visualization
          </button>
          <button 
            className={`tab-button ${viewMode === 'jsonData' ? 'active' : ''}`}
            onClick={() => setViewMode('jsonData')}
          >
            JSON Data
          </button>
        </div>
        <div className="tab-content">
          {viewMode === 'visualization' && <Visualization nodes={nodes} relations={relations} attributes={attributes} onNodeSelect={setSelectedNodeId} />}
          {viewMode === 'jsonData' && <ViewGraphData nodes={nodes} relations={relations} attributes={attributes} />}
        </div>
      </main>

      {selectedNode && (
        <NodeCard 
          node={selectedNode}
          edges={relations}
          relationTypes={relationTypes}
          attributeTypes={attributeTypes}
          onClose={() => setSelectedNodeId(null)}
          onDelete={handleDeleteNode}
        />
      )}
    </div>
  )
}

export default App
