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

  const fetchGraphs = async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/graphs`);
      if (res.ok) {
        const data = await res.json();
        setGraphs(Array.isArray(data) ? data : []);
        if (!activeGraphId && Array.isArray(data) && data.length > 0) {
          onGraphSelect(data[0].id);
        }

      } else {
        console.error('Failed to fetch graphs:', res.status);
        setGraphs([]);
      }
    } catch (error) {
      console.error('Error fetching graphs:', error);
      setGraphs([]);
    }
  };

  useEffect(() => {
    fetchGraphs();
  }, []);

  const handleCreateGraph = async () => {
    if (!newGraphName.trim()) return;
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/graphs`, {
        method: 'POST',
        body: JSON.stringify({ name: newGraphName, author, email }),
      });
      if (res.ok) {
        const newGraph = await res.json();
        setNewGraphName('');
        await fetchGraphs();
        onGraphSelect(newGraph.id);
      } else {
        console.error('Failed to create graph:', res.status);
      }
    } catch (error) {
      console.error('Error creating graph:', error);
    }
  };

  const handleDeleteGraph = async (graphId: string) => {
    if (window.confirm(`Are you sure you want to delete graph "${graphId}"?`)) {
      try {
        const res = await authenticatedFetch(`${API_BASE_URL}/api/graphs/${graphId}`, { method: 'DELETE' });
        if (res.ok) {
          await fetchGraphs();
        } else {
          console.error('Failed to delete graph:', res.status);
        }
      } catch (error) {
        console.error('Error deleting graph:', error);
      }
    }
  };

  return (
    <div className="graph-switcher">
      <div className="graph-dropdown-container">
        <select
          className="graph-dropdown"
          value={activeGraphId || ''}
          onChange={e => onGraphSelect(e.target.value)}
        >
          {graphs.map(graph => (
            <option key={graph.id} value={graph.id}>{graph.name}</option>
          ))}
        </select>
      </div>
      <div className="graph-creator">
        <input
          type="text"
          value={newGraphName}
          onChange={(e) => setNewGraphName(e.target.value)}
          placeholder="New graph name..."
        />
        <button onClick={handleCreateGraph} title="Create new graph">+</button>
      </div>
    </div>
  );
}