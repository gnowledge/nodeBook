import React, { useState, useMemo } from 'react';
import { NodeCard } from './NodeCard';
import type { Node, Edge, AttributeType } from './types';

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
          />
        ))}
      </div>
    </div>
  );
}