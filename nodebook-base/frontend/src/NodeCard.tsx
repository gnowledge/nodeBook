import React from 'react';
import { MathJax } from 'better-react-mathjax';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Node, Edge, AttributeType, Morph } from './types';
import './NodeCard.css';

interface NodeCardProps {
  node: Node;
  graphId: string;
  relations: Edge[];
  attributes: AttributeType[];
  isActive: boolean;
  onDelete: (type: 'nodes' | 'relations' | 'attributes', item: any) => void;
  onSelectNode: (nodeId: string) => void;
  onImportContext: (nodeId: string) => void;
  nodeRegistry: any;
}

export function NodeCard({ node, graphId, relations, attributes, isActive, onDelete, onSelectNode, onImportContext, nodeRegistry }: NodeCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const registryEntry = nodeRegistry[node.id];

  React.useEffect(() => {
    if (isActive) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive]);

  const handlePublicationToggle = async () => {
    const modes = ['Private', 'P2P', 'Public'];
    const currentModeIndex = modes.indexOf(node.publication_mode || 'Private');
    const nextMode = modes[(currentModeIndex + 1) % modes.length];

    if (nextMode === 'P2P' && !window.confirm('This will make the node available to your peers. Are you sure?')) {
      return;
    }
    if (nextMode === 'Public' && !window.confirm('This will make the node publicly accessible on the web. Are you sure?')) {
      return;
    }

    // This is an optimistic update. A more robust solution would handle errors.
    node.publication_mode = nextMode;

    await fetch(`/api/graphs/${graphId}/nodes/${node.id}/publication`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publication_mode: nextMode }),
    });
  };

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
        <div className="node-card-header-actions">
          <button 
            className={`publication-toggle ${node.publication_mode?.toLowerCase()}`}
            onClick={handlePublicationToggle}
            title={`Publication Mode: ${node.publication_mode || 'Private'}`}
          >
            <span>{node.publication_mode || 'Private'}</span>
          </button>
          <span className="node-role">{node.role}</span>
        </div>
      </div>
      <div className="node-card-image">
        <img src={`/public_html/images/${node.id}.png?t=${new Date().getTime()}`} alt={`Subgraph for ${node.name}`} />
      </div>
      {node.description && (
        <div className="node-description">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{node.description}</ReactMarkdown>
        </div>
      )}
      
      {node.morphs.map(morph => renderMorphSection(morph))}

      {registryEntry && registryEntry.graph_ids.length > 1 && (
        <div className="node-card-footer">
          <small>In graphs: {registryEntry.graph_ids.join(', ')}</small>
          <button className="import-btn" onClick={() => onImportContext(node.id)}>Import Context</button>
        </div>
      )}
    </div>
  );
}