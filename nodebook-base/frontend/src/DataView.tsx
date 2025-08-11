import React, { useState, useMemo, useEffect, useRef } from 'react';
import { NodeCard } from './NodeCard';
import { ImportContextModal } from './ImportContextModal';
import { SelectGraphModal } from './SelectGraphModal';
import { GraphDetail } from './GraphDetail';
import type { Node, Edge, AttributeType, Graph } from './types';
import './DataView.css';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';

cytoscape.use(dagre);

interface DataViewProps {
  activeGraphId: string;
  nodes: Node[];
  relations: Edge[];
  attributes: AttributeType[];
  onDataChange: () => void;
  cnlText: string;
  onCnlChange: (cnl: string) => void;
}

export function DataView({ activeGraphId, nodes, relations, attributes, onDataChange, cnlText, onCnlChange }: DataViewProps) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [nodeRegistry, setNodeRegistry] = useState<any>({});
  const [activeGraph, setActiveGraph] = useState<Graph | null>(null);
  
  const [selectingGraph, setSelectingGraph] = useState<{ nodeId: string, graphIds: string[] } | null>(null);
  const [importingNode, setImportingNode] = useState<{ localCnl: string, remoteCnl: string, localGraphId: string, remoteGraphId: string } | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const cyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/noderegistry')
      .then(res => res.json())
      .then(data => setNodeRegistry(data));
  }, []);

  useEffect(() => {
    if (activeGraphId) {
      fetch(`/api/graphs`)
        .then(res => res.json())
        .then((graphs: Graph[]) => {
          const currentGraph = graphs.find(g => g.id === activeGraphId);
          setActiveGraph(currentGraph || null);
        });
    }
  }, [activeGraphId]);

  useEffect(() => {
    if (nodes.length > 0) {
      generateAllImages();
    }
  }, [nodes, relations]);

  const generateAllImages = async () => {
    for (const node of nodes) {
      await generateAndUploadImage(node.id);
    }
  };

  const generateAndUploadImage = async (nodeId: string) => {
    if (!cyRef.current) return;

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const subgraphNodes = [node];
    const subgraphRelations = relations.filter(r => r.source_id === nodeId || r.target_id === nodeId);
    for (const rel of subgraphRelations) {
      if (!subgraphNodes.find(n => n.id === rel.source_id)) {
        const sourceNode = nodes.find(n => n.id === rel.source_id);
        if (sourceNode) subgraphNodes.push(sourceNode);
      }
      if (!subgraphNodes.find(n => n.id === rel.target_id)) {
        const targetNode = nodes.find(n => n.id === rel.target_id);
        if (targetNode) subgraphNodes.push(targetNode);
      }
    }

    const cy = cytoscape({
      container: cyRef.current,
      elements: {
        nodes: subgraphNodes.map(n => ({ data: { id: n.id, label: n.name } })),
        edges: subgraphRelations.map(r => ({ data: { source: r.source_id, target: r.target_id, label: r.name } }))
      },
      style: [
        { selector: 'node', style: { 'label': 'data(label)' } },
        { selector: 'edge', style: { 'label': 'data(label)', 'curve-style': 'bezier' } }
      ],
      layout: { name: 'dagre' },
    });

    const image = cy.png();
    await fetch(`/api/graphs/${activeGraphId}/nodes/${nodeId}/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });
  };

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
      url = `/api/graphs/${activeGraphId}/nodes/${item.id}`;
    } else if (type === 'relations') {
      url = `/api/graphs/${activeGraphId}/relations/${item.id}`;
    } else if (type === 'attributes') {
      url = `/api/graphs/${activeGraphId}/attributes/${item.id}`;
    }

    if (window.confirm(confirmMessage)) {
      await fetch(url, { method: 'DELETE' });
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
      const res = await fetch(`/api/graphs/${remoteGraphId}/nodes/${nodeId}/cnl`);
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

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/publish`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to publish');
      alert('Your site has been published! Check the public_html directory.');
    } catch (error) {
      console.error("Failed to publish:", error);
      alert("Error publishing site. See console for details.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSetAll = async (publication_mode: 'P2P' | 'Public') => {
    if (window.confirm(`This will set all nodes in this graph to ${publication_mode}. Are you sure?`)) {
      try {
        const res = await fetch(`/api/graphs/${activeGraphId}/publish/all`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publication_mode }),
        });
        if (!res.ok) throw new Error(`Failed to set all nodes to ${publication_mode}`);
        onDataChange();
      } catch (error) {
        console.error(`Failed to set all nodes to ${publication_mode}:`, error);
        alert(`Error setting all nodes to ${publication_mode}. See console for details.`);
      }
    }
  };

  return (
    <div className="data-view-container">
      <div ref={cyRef} style={{ display: 'none' }} />
      <GraphDetail graph={activeGraph} />
      <div className="data-view-header">
        <input
          type="text"
          placeholder="Search nodes..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="publish-actions">
          <button className="publish-btn" onClick={() => handleSetAll('P2P')}>Make All P2P</button>
          <button className="publish-btn" onClick={() => handleSetAll('Public')}>Make All Public</button>
          <button className="publish-btn" onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>
      <div className="data-view-grid">
        {filteredNodes.map(node => (
          <NodeCard
            key={node.id}
            node={node}
            graphId={activeGraphId}
            relations={relations}
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
