import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './api-config';

interface Graph {
  id: string;
  name: string;
}

interface GraphSwitcherProps {
  activeGraphId: string | null;
  onGraphSelect: (graphId: string) => void;
  author: string;
  email: string;
}

export function GraphSwitcher({ activeGraphId, onGraphSelect, author, email }: GraphSwitcherProps) {
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [newGraphName, setNewGraphName] = useState('');

  const fetchGraphs = async () => {
    const res = await fetch(`${API_BASE_URL}/api/graphs`);
    const data = await res.json();
    setGraphs(data);
    if (!activeGraphId && data.length > 0) {
      onGraphSelect(data[0].id);
    }
  };

  useEffect(() => {
    fetchGraphs();
  }, []);

  const handleCreateGraph = async () => {
    if (!newGraphName.trim()) return;
    const res = await fetch(`${API_BASE_URL}/api/graphs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGraphName, author, email }),
    });
    const newGraph = await res.json();
    setNewGraphName('');
    await fetchGraphs();
    onGraphSelect(newGraph.id);
  };

  const handleDeleteGraph = async (graphId: string) => {
    if (window.confirm(`Are you sure you want to delete graph "${graphId}"?`)) {
      await fetch(`${API_BASE_URL}/api/graphs/${graphId}`, { method: 'DELETE' });
      fetchGraphs();
    }
  };

  return (
    <div className="graph-switcher">
      <div className="tabs">
        {graphs.map(graph => (
          <div key={graph.id} className={`tab-button ${graph.id === activeGraphId ? 'active' : ''}`}>
            <span onClick={() => onGraphSelect(graph.id)}>{graph.name}</span>
            <button className="delete-graph-btn" onClick={() => handleDeleteGraph(graph.id)}>&times;</button>
          </div>
        ))}
      </div>
      <div className="graph-creator">
        <input
          type="text"
          value={newGraphName}
          onChange={(e) => setNewGraphName(e.target.value)}
          placeholder="New graph name..."
        />
        <button onClick={handleCreateGraph}>+</button>
      </div>
    </div>
  );
}