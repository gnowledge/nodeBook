import React from 'react';
import { NodeCard } from './NodeCard';
import type { Node, Edge, AttributeType } from './types';
import './NodeCardModal.css';

interface NodeCardModalProps {
  node: Node;
  allNodes: Node[];
  allRelations: Edge[];
  attributes: AttributeType[];
  onClose: () => void;
  nodeRegistry: any;
}

export function NodeCardModal({ 
  node, 
  allNodes, 
  allRelations, 
  attributes, 
  onClose, 
  nodeRegistry 
}: NodeCardModalProps) {
  
  const handleSelectNode = (nodeId: string) => {
    // For now, just log the selection. In the future, this could navigate to that node
    console.log('Node selected in modal:', nodeId);
  };

  const handleImportContext = (nodeId: string) => {
    // For now, just log the import. In the future, this could trigger import logic
    console.log('Import context for node:', nodeId);
  };

  return (
    <div className="node-card-modal-overlay" onClick={onClose}>
      <div className="node-card-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="node-card-modal-header">
          <h3>Node Details</h3>
          <button className="node-card-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="node-card-modal-body">
          <NodeCard
            node={node}
            allNodes={allNodes}
            allRelations={allRelations}
            attributes={attributes}
            isActive={false}
            onSelectNode={handleSelectNode}
            onImportContext={handleImportContext}
            nodeRegistry={nodeRegistry}
            isPublic={false}
          />
        </div>
      </div>
    </div>
  );
}
