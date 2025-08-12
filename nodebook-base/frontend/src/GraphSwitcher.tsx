import React, { useState, useEffect } from 'react';

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
    const data = await window.electronAPI.graphs.list();
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
    const newGraph = await window.electronAPI.graphs.create(newGraphName);
    setNewGraphName('');
    await fetchGraphs();
    onGraphSelect(newGraph.id);
  };

  const handleDeleteGraph = async (graphId: string) => {
    const graphToDelete = graphs.find(g => g.id === graphId);
    if (graphToDelete && window.confirm(`Are you sure you want to delete graph "${graphToDelete.name}"?`)) {
      await window.electronAPI.graphs.delete(graphId);
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