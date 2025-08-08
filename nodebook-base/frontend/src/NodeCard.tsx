import React from 'react';
import { MathJax } from 'better-react-mathjax';
import type { Node, Edge, AttributeType, Morph } from './types';
import './NodeCard.css';

interface NodeCardProps {
  node: Node;
  relations: Edge[];
  attributes: AttributeType[];
  isActive: boolean;
  onDelete: (type: 'nodes' | 'relations' | 'attributes', item: any) => void;
  onSelectNode: (nodeId: string) => void;
}

export function NodeCard({ node, relations, attributes, isActive, onDelete, onSelectNode }: NodeCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isActive) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive]);

  const renderMorphSection = (morph: Morph) => {
    const morphRelations = relations.filter(r => r.source_id === node.id && r.morph_ids.includes(morph.morph_id));
    const morphAttributes = attributes.filter(a => a.source_id === node.id && a.morph_ids.includes(morph.morph_id));

    if (morphRelations.length === 0 && morphAttributes.length === 0) {
      return null;
    }

    return (
      <div key={morph.morph_id} className="node-card-section">
        <h4>{morph.name}</h4>
        {morphAttributes.length > 0 && (
          <ul>
            {morphAttributes.map(attr => (
              <li key={attr.id}>
                <MathJax><strong>{attr.name}:</strong> {attr.value} {attr.unit || ''}</MathJax>
                <button className="delete-btn-small" onClick={() => onDelete('attributes', attr)}>&times;</button>
              </li>
            ))}
          </ul>
        )}
        {morphRelations.length > 0 && (
          <ul>
            {morphRelations.map(rel => (
              <li key={rel.id}>
                <span>
                  <strong>{rel.name}</strong> &rarr; 
                  <a href="#" className="relation-target" onClick={(e) => { e.preventDefault(); onSelectNode(rel.target_id); }}>
                    {rel.target_id}
                  </a>
                </span>
                <button className="delete-btn-small" onClick={() => onDelete('relations', rel)}>&times;</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div ref={cardRef} className={`node-card ${isActive ? 'active' : ''}`}>
      <div className="node-card-header">
        <h3>{node.name}</h3>
        <span className="node-role">{node.role}</span>
      </div>
      {node.description && <p className="node-description">{node.description}</p>}
      
      {node.morphs.map(morph => renderMorphSection(morph))}
    </div>
  );
}