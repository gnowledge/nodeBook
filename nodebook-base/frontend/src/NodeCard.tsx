import React, { useState } from 'react';
import { MathJax } from 'better-react-mathjax';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Subgraph } from './Subgraph';
import { NLPParsingModal } from './NLPParsingModal';
import type { Node, Edge, AttributeType, Morph, Transition } from './types';
import { API_BASE_URL } from './api-config';
import { keycloakAuth } from './services/keycloakAuth';
import './NodeCard.css';

interface NodeCardProps {
  node: Node;
  allNodes: Node[];
  allRelations: Edge[];
  attributes: AttributeType[];
  isActive: boolean;
  onSelectNode: (nodeId: string) => void;
  onImportContext: (nodeId: string) => void;
  nodeRegistry: any;
  isPublic?: boolean; // Optional prop for public view mode
  graphId?: string; // Explicit graph id for actions
  onMorphChange?: (nodeId: string, morphId: string) => void; // Callback for morph changes
  onTransitionSimulate?: (transitionId: string) => void; // Callback for transition simulation
}

export function NodeCard({ node, allNodes, allRelations, attributes, isActive, onSelectNode, onImportContext, nodeRegistry, isPublic = false, graphId, onMorphChange, onTransitionSimulate }: NodeCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const subgraphSvgRef = React.useRef<string | null>(null);
  const registryEntry = nodeRegistry[node.id];
  
  // NLP parsing state
  const [isNLPModalOpen, setIsNLPModalOpen] = useState(false);
  const [nlpAnalysis, setNlpAnalysis] = useState(null);
  const [isNLPLoading, setIsNLPLoading] = useState(false);
  
  // Morph change state
  const [isChangingMorph, setIsChangingMorph] = useState(false);
  
  // Helper function for authenticated API calls with token refresh
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    // Ensure access token is valid (refresh if near expiry)
    await keycloakAuth.ensureValidToken();
    let token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      ...options.headers as Record<string, string>,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body) headers['Content-Type'] = headers['Content-Type'] || 'application/json';

    let res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      // Try to refresh and retry once
      const refreshed = await keycloakAuth.refreshAccessToken();
      token = localStorage.getItem('token');
      const retryHeaders: Record<string, string> = { ...headers };
      if (refreshed && token) {
        retryHeaders['Authorization'] = `Bearer ${token}`;
        res = await fetch(url, { ...options, headers: retryHeaders });
      }
    }
    return res;
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publication_mode: nextMode }),
    });
  };

  const handleSetPreview = async () => {
    try {
      if (!subgraphSvgRef.current) {
        alert('Preview not ready yet. Try again in a moment.');
        return;
      }
      const MEDIA_BACKEND_URL = (import.meta as any).env?.VITE_MEDIA_BACKEND_URL || '';
      const targetGraphId = graphId || (node as any).graphId;
      if (!targetGraphId) {
        throw new Error('Missing graphId for preview update');
      }
      const svgBlob = new Blob([subgraphSvgRef.current], { type: 'image/svg+xml' });
      const file = new File([svgBlob], `${targetGraphId}-${node.id}-${Date.now()}-preview.svg`, { type: 'image/svg+xml' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', `Preview for graph ${node.graphId} node ${node.id}`);
      const uploadRes = await fetch(`${MEDIA_BACKEND_URL}/api/media/upload`, { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadJson = await uploadRes.json();
      const fileId = uploadJson.fileId;
      const previewUrl = `${MEDIA_BACKEND_URL}/api/media/files/${fileId}`;

      const res = await authenticatedFetch(`${API_BASE_URL}/api/graphs/${targetGraphId}/preview`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview_url: previewUrl, node_id: node.id })
      });
      if (!res.ok) throw new Error('Failed to set preview');
      alert('Preview set for graph. It will show on the Dashboard.');
    } catch (e) {
      console.error('Set preview failed:', e);
      alert('Failed to set preview. See console for details.');
    }
  };

  const handleMorphChange = async (morphId: string) => {
    if (!graphId || isChangingMorph || !onMorphChange) return;

    setIsChangingMorph(true);
    try {
      console.log(`[NodeCard] Changing morph for node ${node.id} to ${morphId}`);
      
      // Update the node's nbh property locally for immediate UI update
      node.nbh = morphId;
      
      // Notify parent component to handle the API call and refresh graph data
      await onMorphChange(node.id, morphId);
      
      console.log(`[NodeCard] Morph change completed successfully`);
    } catch (error) {
      console.error('[NodeCard] Error changing morph:', error);
      alert(`Failed to change morph: ${error.message}`);
    } finally {
      setIsChangingMorph(false);
    }
  };

  const handleTransitionSimulate = () => {
    if (onTransitionSimulate) {
      onTransitionSimulate(node.id);
    }
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

              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  // Backend should already filter attributes and relations by active morph
  // Use all attributes and relations since backend filtering is now handled by morph registry
  const filteredAttributes = attributes.filter(attr => attr.source_id === node.id);
  const filteredRelations = allRelations.filter(rel => rel.source_id === node.id || rel.target_id === node.id);

  // Calculate subgraph data using Cytoscape's neighborhood concept
  const subgraphNodes = [node];
  
  // Add related nodes (targets of outgoing relations and sources of incoming relations)
  for (const rel of filteredRelations) {
    const otherNodeId = rel.source_id === node.id ? rel.target_id : rel.source_id;
    if (!subgraphNodes.find(n => n.id === otherNodeId)) {
      const otherNode = allNodes.find(n => n.id === otherNodeId);
      if (otherNode) subgraphNodes.push(otherNode);
    }
  }

  return (
    <div ref={cardRef} className={`node-card ${isActive ? 'active' : ''}`}>
      <div className="node-card-header">
        <h3>
          {(() => {
            // Show morph name if active morph is not basic
            if (node.morphs && node.nbh) {
              const activeMorph = node.morphs.find(m => m.morph_id === node.nbh);
              if (activeMorph && activeMorph.name !== 'basic') {
                return `${node.name} (${activeMorph.name})`;
              }
            }
            return node.name;
          })()}
        </h3>
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
      
      {/* Transition-specific content */}
      {node.role === 'Transition' && (
        <div className="transition-content">
          <div className="transition-info">
            <h4>Transition Process</h4>
            <p>This transition represents a process that transforms inputs to outputs.</p>
            
            {/* Prior States */}
            <div className="transition-states">
              <h5>Prior States (Inputs/Conditions):</h5>
              <ul>
                {allRelations
                  .filter(rel => rel.target_id === node.id && rel.name === 'has prior_state')
                  .map(rel => {
                    const priorNode = allNodes.find(n => n.id === rel.source_id);
                    return (
                      <li key={rel.id}>
                        <span className="state-node" onClick={() => onSelectNode(rel.source_id)}>
                          {priorNode?.name || rel.source_id}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>

            {/* Post States */}
            <div className="transition-states">
              <h5>Post States (Outputs/Results):</h5>
              <ul>
                {allRelations
                  .filter(rel => rel.target_id === node.id && rel.name === 'has post_state')
                  .map(rel => {
                    const postNode = allNodes.find(n => n.id === rel.source_id);
                    return (
                      <li key={rel.id}>
                        <span className="state-node" onClick={() => onSelectNode(rel.source_id)}>
                          {postNode?.name || rel.source_id}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>

            {/* Simulation Button */}
            {!isPublic && (
              <div className="transition-actions">
                <button 
                  className="transition-simulate-btn"
                  onClick={handleTransitionSimulate}
                  title="Simulate this transition process"
                >
                  ⚡ Simulate Transition
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="node-card-image">
        <Subgraph 
          key={`subgraph-${node.id}-${node.nbh || 'default'}`}
          nodes={subgraphNodes} 
          relations={filteredRelations} 
          attributes={filteredAttributes}
          onReady={({ exportSvg }) => { subgraphSvgRef.current = exportSvg(); }}
        />
      </div>

      {/* HTML display of relations and attributes for current morph */}
      {!isPublic && (filteredRelations.length > 0 || filteredAttributes.length > 0) && (
        <div className="node-morph-data">
          <h4>Current Morph Data</h4>
          
          {filteredAttributes.length > 0 && (
            <div className="morph-attributes">
              <h5>Attributes:</h5>
              <ul>
                {filteredAttributes.map(attr => (
                  <li key={attr.id}>
                    <strong>{attr.name}:</strong> {attr.value}
                    {attr.unit && <span> {attr.unit}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {filteredRelations.length > 0 && (
            <div className="morph-relations">
              <h5>Relations:</h5>
              <ul>
                {filteredRelations.map(rel => {
                  const otherNodeId = rel.source_id === node.id ? rel.target_id : rel.source_id;
                  const otherNode = allNodes.find(n => n.id === otherNodeId);
                  return (
                    <li key={rel.id}>
                      <strong>{rel.name}</strong> → {otherNode?.name || otherNodeId}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {node.description && (
        <div className="node-description">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{node.description}</ReactMarkdown>
          {!isPublic && (
            <>
              <button 
                className="parse-btn-small" 
                onClick={openNLPModal}
                title="Analyze text and get graph building suggestions"
              >
                🧠 Parse Text
              </button>
              <button 
                className="parse-btn-small" 
                onClick={handleSetPreview}
                title="Set this subgraph as the Dashboard preview"
              >
                🌄 Set as Preview
              </button>
            </>
          )}
        </div>
      )}
      
      {/* Morph Selector */}
      {node.morphs && node.morphs.length > 1 && !isPublic && (
        <div className="morph-selector">
          <div className="morph-selector-label">Current State:</div>
          <div className="morph-radio-group">
            {node.morphs.map(morph => (
              <label key={morph.morph_id} className="morph-radio-option">
                <input
                  type="radio"
                  name={`morph-${node.id}`}
                  value={morph.morph_id}
                  checked={(node.nbh || node.morphs[0]?.morph_id) === morph.morph_id}
                  onChange={(e) => handleMorphChange(e.target.value)}
                  disabled={isChangingMorph}
                />
                <span className="morph-radio-label">{morph.name}</span>
              </label>
            ))}
          </div>
          {isChangingMorph && <span className="morph-changing">Changing...</span>}
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