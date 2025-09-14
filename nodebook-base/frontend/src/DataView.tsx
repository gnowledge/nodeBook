import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  graphMode?: 'markdown' | 'mindmap' | 'richgraph' | 'strictgraph';
  onMorphChange?: (nodeId: string, morphId: string) => void;
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
  onPublicationStateChange,
  graphMode = 'richgraph',
  onMorphChange
}: DataViewProps) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [nodeRegistry, setNodeRegistry] = useState<any>({});
  const [activeGraph, setActiveGraph] = useState<Graph | null>(null);
  // Publishing flow deprecated; publication_state alone governs visibility
  
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
        .then((data: any) => {
          // Handle both array format and {success: true, graphs: [...]} format
          const graphs = Array.isArray(data) ? data : (data.graphs || []);
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

  // Compose a single markdown document by extracting description blocks from CNL
  const composeMarkdownFromCnl = (cnl: string): string => {
    if (!cnl) return '';
    const lines = cnl.split('\n');
    const blocks: string[] = [];
    let introBlock: string[] = [];
    let currentDesc: string[] = [];
    let lastHeading: string | null = null;
    let inDesc = false;
    let inGraphDesc = false;
    for (const raw of lines) {
      const line = raw;
      // Track latest heading (preserve level and text)
      const headingMatch = line.match(/^\s*(#+)\s*(.+)$/);
      if (headingMatch && !inDesc) {
        // Normalize to H3 to match NodeCard visual weight
        lastHeading = `### ${headingMatch[2].trim()}`;
        continue;
      }
      // Graph description block (top intro)
      if (line.trim() === '```graph-description') {
        inGraphDesc = true;
        introBlock = [];
        continue;
      }
      if (inGraphDesc && line.trim() === '```') {
        inGraphDesc = false;
        continue;
      }
      if (inGraphDesc) {
        introBlock.push(line);
        continue;
      }
      if (line.trim() === '```description') {
        inDesc = true;
        currentDesc = [];
        continue;
      }
      if (inDesc && line.trim() === '```') {
        inDesc = false;
        const parts: string[] = [];
        if (lastHeading) parts.push(lastHeading);
        if (currentDesc.length > 0) parts.push(currentDesc.join('\n'));
        if (parts.length > 0) blocks.push(parts.join('\n\n'));
        currentDesc = [];
        continue;
      }
      if (inDesc) {
        currentDesc.push(line);
      }
    }
    const intro = introBlock.length > 0 ? introBlock.join('\n') : '';
    // Fallback: if no description blocks, render entire CNL as document prefixed by intro if present
    if (blocks.length === 0) {
      const prefix = intro ? `${intro}\n\n` : '';
      return `${prefix}${cnl}`;
    }
    const body = blocks.join('\n\n');
    return intro ? `${intro}\n\n${body}` : body;
  };

  // Mode switching moved to Editor menu for single source of truth

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

  // Removed publish handler



  return (
    <div className="data-view-container">
      <GraphDetail graph={activeGraph} />
      <div className="data-view-header">
        {graphMode !== 'markdown' && (
          <input
            type="text"
            placeholder="Search nodes..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        )}
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
          
          {/* Publish step removed: Public state alone controls exposure */}
        </div>
      </div>
      {graphMode === 'markdown' ? (
        <div className="markdown-document" style={{ padding: '16px' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{composeMarkdownFromCnl(cnlText)}</ReactMarkdown>
        </div>
      ) : (
        <div className="data-view-grid">
          {filteredNodes.map(node => (
            <NodeCard
              key={node.id}
              node={node}
              allNodes={nodes}
              allRelations={relations}
              attributes={attributes}
              isActive={node.id === activeNodeId}
              onSelectNode={setActiveNodeId}
              onImportContext={handleImportContext}
              nodeRegistry={nodeRegistry}
              graphId={activeGraphId}
              onMorphChange={onMorphChange}
            />
          ))}
        </div>
      )}
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
