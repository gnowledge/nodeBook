import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Node, Edge, AttributeType } from './types';

interface NodeCardProps {
  node: Node;
  edges: Edge[];
  relationTypes: any[]; // Keep this simple for now
  attributeTypes: AttributeType[];
  onClose: () => void;
  onDelete: (nodeId: string) => void;
}

export function NodeCard({ node, edges, relationTypes, attributeTypes, onClose, onDelete }: NodeCardProps) {
  
  // This logic is now simplified as the backend provides the correct data structure
  const relations = edges.filter(edge => edge.source_id === node.id);
  const attributes = node.attributes || {}; // Assuming attributes are directly on the node object

  return (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={onClose}>&times;</button>
            <div className="node-card" id={`node-${node.id}`}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h2 className="node-title">{node.name || node.id}</h2>
                    <button onClick={() => onDelete(node.id)} style={{background: 'darkred'}}>Delete Node</button>
                </div>

                {node.description && (
                    <div className="node-description">
                        <h3>Description</h3>
                        <ReactMarkdown>{node.description}</ReactMarkdown>
                    </div>
                )}

                <div className="node-neighborhood">
                    <h3>Relations</h3>
                    <ul className="relations-list">
                    {relations.map(edge => (
                        <li key={edge.id}>{`${edge.name || 'related to'} → ${edge.target_id}`}</li>
                    ))}
                    </ul>

                    <h3 style={{marginTop: '2rem'}}>Attributes</h3>
                    <ul className="attributes-list">
                    {Object.entries(attributes).map(([key, value]) => (
                        <li key={key}>{`${key}: ${value}`}</li>
                    ))}
                    </ul>
                </div>
            </div>
        </div>
    </div>
  );
}
