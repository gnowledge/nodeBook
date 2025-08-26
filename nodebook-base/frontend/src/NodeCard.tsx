import React, { useState } from 'react';
import { MathJax } from 'better-react-mathjax';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Subgraph } from './Subgraph';
import { NLPParsingModal } from './NLPParsingModal';
import type { Node, Edge, AttributeType, Morph } from './types';
import { API_BASE_URL } from './api-config';
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
  isPublic?: boolean; // Optional prop for public view mode
}

export function NodeCard({ node, allNodes, allRelations, attributes, isActive, onDelete, onSelectNode, onImportContext, nodeRegistry, isPublic = false }: NodeCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const registryEntry = nodeRegistry[node.id];
  
  // NLP parsing state
  const [isNLPModalOpen, setIsNLPModalOpen] = useState(false);
  const [nlpAnalysis, setNlpAnalysis] = useState(null);
  const [isNLPLoading, setIsNLPLoading] = useState(false);
  
  // Helper function for authenticated API calls
  const authenticatedFetch = (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };
    
    // Only set Content-Type for requests that have a body
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }
    
    return fetch(url, {
      ...options,
      headers,
    });
  };

  // NLP parsing function
  const handleNLPParse = async () => {
    if (!node.description) return;
    
    setIsNLPLoading(true);
    try {
      const nlpServiceUrl = import.meta.env.VITE_NLP_SERVICE_URL || 'http://localhost:3002';
      const response = await fetch(`${nlpServiceUrl}/api/nlp/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: node.description,
          language: 'en'
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setNlpAnalysis(result.analysis);
      } else {
        console.error('NLP analysis failed:', response.statusText);
      }
    } catch (error) {
      console.error('NLP analysis error:', error);
    } finally {
      setIsNLPLoading(false);
    }
  };

  // Open NLP modal
  const openNLPModal = () => {
    setIsNLPModalOpen(true);
    setNlpAnalysis(null); // Reset previous analysis
  };

  // Close NLP modal
  const closeNLPModal = () => {
    setIsNLPModalOpen(false);
    setNlpAnalysis(null);
  };

  React.useEffect(() => {
    if (isActive) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive]);

  const handlePublicationToggle = async () => {
    const modes = ['Private', 'P2P', 'Public'];
    const currentModeIndex = modes.indexOf(node.publication_mode || 'Private');
    const nextMode = modes[(currentModeIndex + 1) % modes.length];

    // Optimistic update
    node.publication_mode = nextMode;

    await authenticatedFetch(`${API_BASE_URL}/api/graphs/${node.graphId}/nodes/${node.id}/publication`, {
      method: 'PUT',
      body: JSON.stringify({ publication_mode: nextMode }),
    });
  };

  const renderMorphSection = (morph: Morph) => {
    const morphRelations = allRelations.filter(r => r.source_id === node.id && r.morph_ids.includes(morph.morph_id));
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
                {!attr.isDerived && !isPublic && <button className="delete-btn-small" onClick={() => onDelete('attributes', attr)}>&times;</button>}
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
                {!isPublic && <button className="delete-btn-small" onClick={() => onDelete('relations', rel)}>&times;</button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  // Calculate subgraph data
  const subgraphNodes = [node];
  const subgraphRelations = allRelations.filter(r => r.source_id === node.id || r.target_id === node.id);
  for (const rel of subgraphRelations) {
    const otherNodeId = rel.source_id === node.id ? rel.target_id : rel.source_id;
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
        <Subgraph nodes={subgraphNodes} relations={subgraphRelations} />
      </div>

      {node.description && (
        <div className="node-description">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{node.description}</ReactMarkdown>
          {!isPublic && (
            <button 
              className="parse-btn-small" 
              onClick={openNLPModal}
              title="Analyze text and get graph building suggestions"
            >
              🧠 Parse Text
            </button>
          )}
        </div>
      )}
      
      {node.morphs && node.morphs.map(morph => renderMorphSection(morph))}

      {registryEntry && registryEntry.graph_ids.length > 1 && (
        <div className="node-card-footer">
          <small>In graphs: {registryEntry.graph_ids.join(', ')}</small>
          {!isPublic && <button className="import-btn" onClick={() => onImportContext(node.id)}>Import Context</button>}
        </div>
      )}

      {/* NLP Parsing Modal */}
      <NLPParsingModal
        isOpen={isNLPModalOpen}
        onClose={closeNLPModal}
        text={node.description || ''}
        analysis={nlpAnalysis}
        isLoading={isNLPLoading}
        onParse={handleNLPParse}
      />
    </div>
  );
}