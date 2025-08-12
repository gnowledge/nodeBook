import React from 'react';
import { MathJax } from 'better-react-mathjax';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Subgraph } from './Subgraph';
import type { Node, Edge, AttributeType, Morph } from './types';
import './NodeCard.css';

interface NodeCardProps {
  node: Node;
  allNodes: Node[];
  allRelations: Edge[];
  attributes: AttributeType[];
  isActive: boolean;
  onDelete: (type: 'nodes' | 'relations' | 'attributes', item: any) => void;
  onSelectNode: (nodeId: string) => void;
  onImportContext: (nodeId: string) => void;
  nodeRegistry: any;
}

export function NodeCard({ node, allNodes, allRelations, attributes, isActive, onDelete, onSelectNode, onImportContext, nodeRegistry }: NodeCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const registryEntry = nodeRegistry[node.id];

  React.useEffect(() => {
    if (isActive) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive]);

  const renderMorphSection = (morph: Morph) => {
    const morphRelations = allRelations.filter(r => r.source === node.id); // Simplified
    const morphAttributes = attributes.filter(a => a.source_id === node.id); // Simplified

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
                <MathJax>
                  <strong>{attr.name}:</strong> {attr.value} {attr.unit || ''}
                  {attr.isDerived && <span className="derived-indicator"> (fx)</span>}
                </MathJax>
                {!attr.isDerived && <button className="delete-btn-small" onClick={() => onDelete('attributes', attr)}>&times;</button>}
              </li>
            ))}
          </ul>
        )}
        {morphRelations.length > 0 && (
          <ul>
            {morphRelations.map(rel => (
              <li key={rel.id}>
                <span>
                  <strong>{rel.label}</strong> &rarr; 
                  <a href="#" className="relation-target" onClick={(e) => { e.preventDefault(); onSelectNode(rel.target); }}>
                    {rel.target}
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

  // Calculate subgraph data
  const subgraphNodes = [node];
  const subgraphRelations = allRelations.filter(r => r.source === node.id || r.target === node.id);
  for (const rel of subgraphRelations) {
    const otherNodeId = rel.source === node.id ? rel.target : rel.source;
    if (!subgraphNodes.find(n => n.id === otherNodeId)) {
      const otherNode = allNodes.find(n => n.id === otherNodeId);
      if (otherNode) subgraphNodes.push(otherNode);
    }
  }

  return (
    <div ref={cardRef} className={`node-card ${isActive ? 'active' : ''}`}>
      <div className="node-card-header">
        <h3>{node.name}</h3>
        <div className="node-card-header-actions">
          <span className="node-role">{node.role}</span>
        </div>
      </div>
      
      <div className="node-card-image">
        <Subgraph nodes={subgraphNodes} relations={subgraphRelations} />
      </div>

      {node.description && (
        <div className="node-description">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{node.description}</ReactMarkdown>
        </div>
      )}
      
      {/* Morph rendering needs to be adapted to the new data structure */}
      {/* {node.morphs.map(morph => renderMorphSection(morph))} */}

      {registryEntry && registryEntry.graph_ids.length > 1 && (
        <div className="node-card-footer">
          <small>In graphs: {registryEntry.graph_ids.join(', ')}</small>
          <button className="import-btn" onClick={() => onImportContext(node.id)}>Import Context</button>
        </div>
      )}
    </div>
  );
}