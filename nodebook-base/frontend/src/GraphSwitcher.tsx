import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './api-config';
import styles from './GraphSwitcher.module.css';

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
  const [graphMode, setGraphMode] = useState<'richgraph' | 'mindmap'>('richgraph');
  const [showModeSelector, setShowModeSelector] = useState(false);

  // Helper function for authenticated API calls
  const authenticatedFetch = (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
    };
    
    // Only set Content-Type for requests that have a body
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Merge with any existing headers from options
    if (options.headers) {
      Object.assign(headers, options.headers);
    }
    
    return fetch(url, {
      ...options,
      headers,
    });
  };

  const fetchGraphs = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No authentication token, skipping graph fetch');
        setGraphs([]);
        return;
      }

      const res = await authenticatedFetch(`/api/graphs`);
      if (res.ok) {
        const data = await res.json();
        // Handle both array format and {success: true, graphs: [...]} format
        const graphsArray = Array.isArray(data) ? data : (data.graphs || []);
        setGraphs(graphsArray);
        if (!activeGraphId && graphsArray.length > 0) {
          onGraphSelect(graphsArray[0].id);
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
      const res = await authenticatedFetch(`/api/graphs`, {
        method: 'POST',
        body: JSON.stringify({ 
          name: newGraphName, 
          author, 
          email,
          mode: graphMode 
        }),
      });
      if (res.ok) {
        const newGraph = await res.json();
        setNewGraphName('');
        setShowModeSelector(false);
        await fetchGraphs();
        // Fix: Access the graph ID from the correct structure {success: true, graph: {id: ...}}
        const graphId = newGraph.graph?.id || newGraph.id;
        onGraphSelect(graphId);
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
        const res = await authenticatedFetch(`/api/graphs/${graphId}`, { method: 'DELETE' });
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
    <div className={styles.graphSwitcher}>
      <div className={styles.graphDropdownContainer}>
        <select
          className={styles.graphDropdown}
          value={activeGraphId || ''}
          onChange={e => onGraphSelect(e.target.value)}
        >
          {graphs.map(graph => (
            <option key={graph.id} value={graph.id}>{graph.name}</option>
          ))}
        </select>
      </div>
      <div className={styles.graphCreator}>
        <input
          type="text"
          value={newGraphName}
          onChange={(e) => setNewGraphName(e.target.value)}
          placeholder="New graph name..."
        />
        <button 
          onClick={() => setShowModeSelector(!showModeSelector)} 
          title="Select graph mode"
          className={styles.modeButton}
        >
          {graphMode === 'mindmap' ? '🧠' : '🔗'}
        </button>
        <button onClick={handleCreateGraph} title="Create new graph">+</button>
        
        {showModeSelector && (
          <div className={styles.modeSelector}>
            <div className={styles.modeOption}>
              <input
                type="radio"
                id="richgraph"
                name="mode"
                value="richgraph"
                checked={graphMode === 'richgraph'}
                onChange={(e) => setGraphMode(e.target.value as 'richgraph' | 'mindmap')}
              />
              <label htmlFor="richgraph">🔗 Rich Graph (Advanced)</label>
            </div>
            <div className={styles.modeOption}>
              <input
                type="radio"
                id="mindmap"
                name="mode"
                value="mindmap"
                checked={graphMode === 'mindmap'}
                onChange={(e) => setGraphMode(e.target.value as 'richgraph' | 'mindmap')}
              />
              <label htmlFor="mindmap">🧠 MindMap (Beginner)</label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}