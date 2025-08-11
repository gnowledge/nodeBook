import React, { useState, useMemo, useEffect } from 'react';
import { NodeCard } from './NodeCard';
import { ImportContextModal } from './ImportContextModal';
import { SelectGraphModal } from './SelectGraphModal';
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
  
  const [selectingGraph, setSelectingGraph] = useState<{ nodeId: string, graphIds: string[] } | null>(null);
  const [importingNode, setImportingNode] = useState<{ localCnl: string, remoteCnl: string, localGraphId: string, remoteGraphId: string } | null>(null);

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
    const nodeLines: string[] = [];
    let inNodeBlock = false;
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return '';

    const nodeName = node.name;
    const nodeIdRegex = new RegExp(`\\(id: ${nodeId}\\)`);

    for (const line of lines) {
        const isTopLevelHeader = line.startsWith('# ');

        if (inNodeBlock) {
            if (isTopLevelHeader) {
                break;
            }
            nodeLines.push(line);
        } else {
            if (isTopLevelHeader) {
                const hasId = nodeIdRegex.test(line);
                const nameMatch = line.startsWith(`# ${nodeName} `) || line === `# ${nodeName}`;
                if (hasId || nameMatch) {
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
      // If there's only one other graph, open the comparison modal directly
      handleGraphSelected(nodeId, otherGraphIds[0]);
    } else {
      // If there are multiple other graphs, open the selection modal
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
