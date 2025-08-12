import React, { useState, useMemo, useEffect } from 'react';
import { NodeCard } from './NodeCard';
import { ImportContextModal } from './ImportContextModal';
import { SelectGraphModal } from './SelectGraphModal';
import { GraphDetail } from './GraphDetail';
import type { Node, Edge, AttributeType, Graph } from './types';
import './DataView.css';

interface DataViewProps {
  activeGraphId: string;
  nodes: Node[];
  relations: Edge[];
  attributes: AttributeType[];
  onDataChange: () => void;
}

export function DataView({ activeGraphId, nodes, relations, attributes, onDataChange }: DataViewProps) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGraph, setActiveGraph] = useState<Graph | null>(null);
  
  // This functionality needs to be re-evaluated in a P2P context
  // const [selectingGraph, setSelectingGraph] = useState<{ nodeId: string, graphIds: string[] } | null>(null);
  // const [importingNode, setImportingNode] = useState<{ localCnl: string, remoteCnl: string, localGraphId: string, remoteGraphId: string } | null>(null);
  
  useEffect(() => {
    if (activeGraphId) {
      // This assumes a function that can get graph details by ID
      // We'll mock it for now.
      window.electronAPI.graphs.list().then((graphs: Graph[]) => {
        const currentGraph = graphs.find(g => g.id === activeGraphId);
        setActiveGraph(currentGraph || null);
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
      (node.role && node.role.toLowerCase().includes(lowercasedFilter)) ||
      (node.description && node.description.toLowerCase().includes(lowercasedFilter))
    );
  }, [nodes, searchTerm]);

  const handleDelete = async (type: 'nodes' | 'relations' | 'attributes', item: any) => {
    let confirmMessage = `Are you sure you want to delete this ${type.slice(0, -1)}?`;
    if (type === 'nodes') {
      confirmMessage += ' This will also delete all connected relations and attributes.';
    }

    if (window.confirm(confirmMessage)) {
      if (type === 'nodes') {
        await window.electronAPI.nodes.delete(activeGraphId, item.id);
      }
      // Deleting relations and attributes needs specific IPC handlers
      onDataChange();
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
        {/* Publishing functionality removed for now */}
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
            onImportContext={() => {}} // Placeholder
            nodeRegistry={{}} // Placeholder
          />
        ))}
      </div>
      {/* Modals for import/select are disabled for now */}
    </div>
  );
}
