import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Node, Edge, AttributeType } from './types';

interface NodeCardProps {
  node: Node;
  relations: Edge[];
  attributes: AttributeType[];
  relationTypes: any[];
  attributeTypes: AttributeType[];
  onClose: () => void;
  onDelete: (nodeId: string) => void;
}

export function NodeCard({ node, relations, attributes, relationTypes, attributeTypes, onClose, onDelete }: NodeCardProps) {
  
  const outgoingRelations = relations.filter(edge => edge.source_id === node.id);
  const nodeAttributes = attributes.filter(attr => attr.source_id === node.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={onClose}>&times;</button>
            <div className="node-card" id={`node-${node.id}`}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                      <h2 className="node-title">{node.name || node.id}</h2>
                      {node.role && (
                        <small className="node-role">
                          Types: {[node.role, ...(node.parent_types || [])].join('; ')}
                        </small>
                      )}
                    </div>
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
                    {outgoingRelations.map(edge => (
                        <li key={edge.id}>{`${edge.name || 'related to'} → ${edge.target_id}`}</li>
                    ))}
                    </ul>

                    <h3 style={{marginTop: '2rem'}}>Attributes</h3>
                    <ul className="attributes-list">
                    {nodeAttributes.map(attr => (
                        <li key={attr.id}>{`${attr.name}: ${attr.value}${attr.unit ? ` ${attr.unit}` : ''}`}</li>
                    ))}
                    </ul>
                </div>
            </div>
        </div>
    </div>
  );
}
