import React, { useState, useMemo, useEffect } from 'react';
import { NodeCard } from './NodeCard';
import { ImportContextModal } from './ImportContextModal';
import type { Node, Edge, AttributeType } from './types';

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
  const [importingNode, setImportingNode] = useState<{ localCnl: string, remoteCnl: string } | null>(null);

  useEffect(() => {
    fetch('/api/noderegistry')
      .then(res => res.json())
      .then(data => setNodeRegistry(data));
  }, []);

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
    const nodeLines = [];
    let inNodeBlock = false;
    let nodeFound = false;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return '';

    // First attempt: Find by ID in a comment
    for (const line of lines) {
        if (line.startsWith('#') && line.includes(`id: ${nodeId}`)) {
            inNodeBlock = true;
            nodeFound = true;
        }
        if (inNodeBlock) {
            if (line.startsWith('#') && nodeLines.length > 0 && !line.includes(`id: ${nodeId}`)) {
                break;
            }
            nodeLines.push(line);
        }
    }

    if (nodeLines.length > 0) return nodeLines.join('\n');

    // Fallback: Find by node name
    inNodeBlock = false;
    for (const line of lines) {
        if (line.startsWith(`# ${node.name}`)) {
            inNodeBlock = true;
        }
        if (inNodeBlock) {
            if (line.startsWith('#') && nodeLines.length > 0) {
                break;
            }
            nodeLines.push(line);
        }
    }
    return nodeLines.join('\n');
  };

  const handleImportContext = async (nodeId: string) => {
    const registryEntry = nodeRegistry[nodeId];
    if (!registryEntry || registryEntry.graph_ids.length <= 1) return;

    const remoteGraphId = registryEntry.graph_ids.find((id: string) => id !== activeGraphId);
    if (!remoteGraphId) return;

    try {
      const res = await fetch(`/api/graphs/${remoteGraphId}/nodes/${nodeId}/cnl`);
      if (!res.ok) throw new Error('Failed to fetch remote CNL');
      const { cnl: remoteCnl } = await res.json();
      
      const localCnl = getCnlForNode(nodeId, cnlText);

      setImportingNode({ localCnl, remoteCnl });

    } catch (error) {
      console.error("Failed to import context:", error);
      alert("Error importing context. See console for details.");
    }
  };

  const handleMerge = (selectedLines: string) => {
    const newCnl = cnlText + '\n' + selectedLines;
    onCnlChange(newCnl);
    setImportingNode(null);
  };

  return (
    <div className="data-view-container">
      <div className="data-view-header">
        <input
          type="text"
          placeholder="Search nodes..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="data-view-grid">
        {filteredNodes.map(node => (
          <NodeCard
            key={node.id}
            node={node}
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
      {importingNode && (
        <ImportContextModal
          sourceCnl={importingNode.remoteCnl}
          targetCnl={importingNode.localCnl}
          onClose={() => setImportingNode(null)}
          onMerge={handleMerge}
        />
      )}
    </div>
  );
}
