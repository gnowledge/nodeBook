import React, { useState, useMemo, useEffect } from 'react';
import { NodeCard } from './NodeCard';
import { ImportContextModal } from './ImportContextModal';
import { SelectGraphModal } from './SelectGraphModal';
import { GraphDetail } from './GraphDetail';
import type { Node, Edge, AttributeType, Graph } from './types';
import { API_BASE_URL } from './api-config';
import './DataView.css';

interface DataViewProps {
  activeGraphId: string;
  nodes: Node[];
  relations: Edge[];
  attributes: AttributeType[];
  onDataChange: () => void;
  cnlText: string;
  onCnlChange: (cnl: string) => void;
  publication_state?: 'Private' | 'P2P' | 'Public';
  onPublicationStateChange?: (newState: 'Private' | 'P2P' | 'Public') => void;
}

export function DataView({ 
  activeGraphId, 
  nodes, 
  relations, 
  attributes, 
  onDataChange, 
  cnlText, 
  onCnlChange,
  publication_state = 'Private',
  onPublicationStateChange 
}: DataViewProps) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [nodeRegistry, setNodeRegistry] = useState<any>({});
  const [activeGraph, setActiveGraph] = useState<Graph | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  
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
    
    // Merge with existing headers if any
    if (options.headers) {
      Object.assign(headers, options.headers);
    }
    
    return fetch(url, {
      ...options,
      headers,
    });
  };
  
  const [selectingGraph, setSelectingGraph] = useState<{ nodeId: string, graphIds: string[] } | null>(null);
  const [importingNode, setImportingNode] = useState<{ localCnl: string, remoteCnl: string, localGraphId: string, remoteGraphId: string } | null>(null);
  




 

  useEffect(() => {
    authenticatedFetch(`${API_BASE_URL}/api/noderegistry`)
      .then(res => res.json())
      .then(data => setNodeRegistry(data))
      .catch(error => {
        console.error('Failed to fetch node registry:', error);
        setNodeRegistry({});
      });
  }, []);

  useEffect(() => {
    if (activeGraphId) {
      authenticatedFetch(`${API_BASE_URL}/api/graphs`)
        .then(res => res.json())
        .then((graphs: Graph[]) => {
          const currentGraph = graphs.find(g => g.id === activeGraphId);
          setActiveGraph(currentGraph || null);
        })
        .catch(error => {
          console.error('Failed to fetch graphs:', error);
          setActiveGraph(null);
        });
    }
  }, [activeGraphId]);

  const filteredNodes = useMemo(() => {
    if (!searchTerm) {
      return nodes;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return nodes.filter(node =>
      node.name.toLowerCase().includes(lowercasedFilter) ||
      node.role.toLowerCase().includes(lowercasedFilter) ||
      (node.description && node.description.toLowerCase().includes(lowercasedFilter))
    );
  }, [nodes, searchTerm]);

  const handleDelete = async (type: 'nodes' | 'relations' | 'attributes', item: any) => {
    let confirmMessage = `Are you sure you want to delete this ${type.slice(0, -1)}?`;
    let url = '';
    if (type === 'nodes') {
      confirmMessage += ' This will also delete all connected relations and attributes.';
      url = `${API_BASE_URL}/api/graphs/${activeGraphId}/nodes/${item.id}`;
    } else if (type === 'relations') {
      url = `${API_BASE_URL}/api/graphs/${activeGraphId}/relations/${item.id}`;
    } else if (type === 'attributes') {
      url = `${API_BASE_URL}/api/graphs/${activeGraphId}/attributes/${item.id}`;
    }

    if (window.confirm(confirmMessage)) {
      await authenticatedFetch(url, { method: 'DELETE' });
      onDataChange();
    }
  };

  const getCnlForNode = (nodeId: string, cnl: string) => {
    const lines = cnl.split('\n');
    const nodeLines: string[] = [];
    let inNodeBlock = false;
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return '';

    const nodeName = node.name;
    const nodeNameRegex = new RegExp(`^# ${nodeName}`);

    for (const line of lines) {
        const isTopLevelHeader = line.startsWith('# ');

        if (inNodeBlock) {
            if (isTopLevelHeader) {
                break;
            }
            nodeLines.push(line);
        } else {
            if (isTopLevelHeader) {
                if (nodeNameRegex.test(line)) {
                    inNodeBlock = true;
                    nodeLines.push(line);
                }
            }
        }
    }
    return nodeLines.join('\n');
  };

  const handleImportContext = (nodeId: string) => {
    const registryEntry = nodeRegistry[nodeId];
    if (!registryEntry || registryEntry.graph_ids.length <= 1) return;

    const otherGraphIds = registryEntry.graph_ids.filter((id: string) => id !== activeGraphId);
    if (otherGraphIds.length === 1) {
      handleGraphSelected(nodeId, otherGraphIds[0]);
    } else {
      setSelectingGraph({ nodeId, graphIds: otherGraphIds });
    }
  };

  const handleGraphSelected = async (nodeId: string, remoteGraphId: string) => {
    setSelectingGraph(null);
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/graphs/${remoteGraphId}/nodes/${nodeId}/cnl`);
      if (!res.ok) throw new Error('Failed to fetch remote CNL');
      const { cnl: remoteCnl } = await res.json();
      
      const localCnl = getCnlForNode(nodeId, cnlText);

      setImportingNode({ localCnl, remoteCnl, localGraphId: activeGraphId, remoteGraphId });

    } catch (error) {
      console.error("Failed to import context:", error);
      alert("Error importing context. See console for details.");
    }
  };

  const handleCopy = (selectedLines: string) => {
    const newCnl = cnlText + '\n' + selectedLines;
    onCnlChange(newCnl);
    setImportingNode(null);
    alert("The selected CNL has been copied to the editor. Please review and parse the CNL to apply the changes.");
  };

  const handlePublicationStateChange = async (newState: 'Private' | 'P2P' | 'Public') => {
    if (!onPublicationStateChange) return;
    
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/graphs/${activeGraphId}/publication`, {
        method: 'PUT',
        body: JSON.stringify({ publication_state: newState }),
      });
      
      if (response.ok) {
        onPublicationStateChange(newState);
        // Refresh the graph data to show updated state
        onDataChange();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to update publication state: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating publication state:', error);
      alert('Failed to update publication state. Please try again.');
    }
  };

  const handlePublish = async () => {
    if (!activeGraphId) return;
    
    setIsPublishing(true);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/graphs/${activeGraphId}/publish`, {
        method: 'POST',
      });
      
      if (response.ok) {
        alert('Graph published successfully! It is now accessible to anonymous users.');
        // Refresh the graph data
        onDataChange();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to publish graph: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error publishing graph:', error);
      alert('Failed to publish graph. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };



  return (
    <div className="data-view-container">
      <GraphDetail graph={activeGraph} />
      <div className="data-view-header">
        <input
          type="text"
          placeholder="Search nodes..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="publication-controls">
          <div className="publication-status-widget">
            <label className="publication-status-label">Publication Status:</label>
            <div className="publication-status-options">
              <label className="publication-option">
                <input
                  type="radio"
                  name="publication-status"
                  value="Private"
                  checked={publication_state === 'Private'}
                  onChange={() => handlePublicationStateChange('Private')}
                  disabled={!onPublicationStateChange}
                />
                <span className="publication-option-label private">
                  🔒 Private
                </span>
              </label>
              <label className="publication-option">
                <input
                  type="radio"
                  name="publication-status"
                  value="P2P"
                  checked={publication_state === 'P2P'}
                  onChange={() => handlePublicationStateChange('P2P')}
                  disabled={!onPublicationStateChange}
                />
                <span className="publication-option-label p2p">
                  🔗 P2P
                </span>
              </label>
              <label className="publication-option">
                <input
                  type="radio"
                  name="publication-status"
                  value="Public"
                  checked={publication_state === 'Public'}
                  onChange={() => handlePublicationStateChange('Public')}
                  disabled={!onPublicationStateChange}
                />
                <span className="publication-option-label public">
                  🌐 Public
                </span>
              </label>
            </div>
          </div>
          
          {publication_state === 'Public' && (
            <div className="publish-section">
              <button 
                className="publish-button"
                onClick={handlePublish}
                disabled={isPublishing}
                title="Publish this graph to make it accessible to anonymous users"
              >
                {isPublishing ? 'Publishing...' : '📢 Publish Graph'}
              </button>
              <small className="publish-hint">
                Publishing exports graph data for public viewing
              </small>
            </div>
          )}
        </div>
      </div>
      <div className="data-view-grid">
        {filteredNodes.map(node => (
          <NodeCard
            key={node.id}
            node={node}
            allNodes={nodes}
            allRelations={relations}
            attributes={attributes}
            isActive={node.id === activeNodeId}
            onDelete={handleDelete}
            onSelectNode={setActiveNodeId}
            onImportContext={handleImportContext}
            nodeRegistry={nodeRegistry}
          />
        ))}
      </div>
      {selectingGraph && (
        <SelectGraphModal
          graphIds={selectingGraph.graphIds}
          onSelect={(graphId) => handleGraphSelected(selectingGraph.nodeId, graphId)}
          onClose={() => setSelectingGraph(null)}
        />
      )}
      {importingNode && (
        <ImportContextModal
          sourceCnl={importingNode.remoteCnl}
          targetCnl={importingNode.localCnl}
          sourceGraphId={importingNode.remoteGraphId}
          targetGraphId={importingNode.localGraphId}
          onClose={() => setImportingNode(null)}
          onMerge={handleCopy}
        />
      )}
    </div>
  );
}
