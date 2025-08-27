import React, { useState, useEffect } from 'react';
import { WordNetService } from './services/wordnetService';
import type { WordNetResult, WordNetDefinition } from './services/wordnetService';
import './WordNetDefinitionsPanel.css';

interface WordNetDefinitionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  terms: string[];
  onDefinitionSelect: (term: string, definition: string) => void;
  isLoading?: boolean;
}

export function WordNetDefinitionsPanel({ 
  isOpen, 
  onClose, 
  terms, 
  onDefinitionSelect,
  isLoading = false 
}: WordNetDefinitionsPanelProps) {
  const [definitions, setDefinitions] = useState<WordNetResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDefinitions, setSelectedDefinitions] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (isOpen && terms.length > 0) {
      fetchDefinitions();
    }
  }, [isOpen, terms]);

  const fetchDefinitions = async () => {
    if (terms.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await WordNetService.getBatchDefinitions({ terms, maxResults: 3 });
      setDefinitions(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch definitions');
      console.error('Error fetching WordNet definitions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDefinitionSelect = (term: string, definition: string) => {
    setSelectedDefinitions(prev => new Map(prev.set(term, definition)));
  };

  const handleApplyAll = () => {
    selectedDefinitions.forEach((definition, term) => {
      onDefinitionSelect(term, definition);
    });
    onClose();
  };

  const handleApplySelected = (term: string) => {
    const definition = selectedDefinitions.get(term);
    if (definition) {
      onDefinitionSelect(term, definition);
    }
  };

  const getDefinitionTypeColor = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'concept': return '#3b82f6'; // blue
      case 'instance': return '#10b981'; // green
      case 'attribute': return '#f59e0b'; // amber
      case 'process': return '#8b5cf6'; // purple
      case 'entity': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const getDefinitionTypeIcon = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'concept': return '💡';
      case 'instance': return '🔍';
      case 'attribute': return '🏷️';
      case 'process': return '⚙️';
      case 'entity': return '🔵';
      default: return '📝';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="wordnet-panel-overlay">
      <div className="wordnet-panel">
        <div className="panel-header">
          <h3>📚 WordNet Definitions</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="panel-content">
          {loading && (
            <div className="loading-section">
              <div className="loading-spinner"></div>
              <p>Fetching definitions from WordNet...</p>
            </div>
          )}

          {error && (
            <div className="error-section">
              <h4>❌ Error</h4>
              <p>{error}</p>
              <button onClick={fetchDefinitions} className="retry-btn">
                🔄 Retry
              </button>
            </div>
          )}

          {!loading && !error && definitions.length > 0 && (
            <>
              <div className="info-section">
                <p>
                  <strong>Found {definitions.length} terms</strong> that need descriptions. 
                  Select the best definition for each term to auto-fill your CNL.
                </p>
                <p className="note">
                  💡 <strong>Learning Tip:</strong> Read each definition carefully to understand 
                  the concept before building your graph. This helps you think critically about 
                  how to represent knowledge.
                </p>
              </div>

              <div className="definitions-list">
                {definitions.map((result) => (
                  <div key={result.term} className="term-section">
                    <h4 className="term-title">
                      📍 {result.term}
                      <span className="term-info">
                        {result.wordNetInfo.synsets} synsets • {result.wordNetInfo.hypernyms} hypernyms • {result.wordNetInfo.hyponyms} hyponyms
                      </span>
                    </h4>
                    
                    <div className="definitions-options">
                      {result.definitions.map((definition) => (
                        <div 
                          key={definition.id} 
                          className={`definition-option ${
                            selectedDefinitions.get(result.term) === definition.text ? 'selected' : ''
                          }`}
                          onClick={() => handleDefinitionSelect(result.term, definition.text)}
                        >
                          <div className="definition-header">
                            <span className="definition-type" style={{ color: getDefinitionTypeColor(definition.type) }}>
                              {getDefinitionTypeIcon(definition.type)} {definition.type}
                            </span>
                            <span className="confidence-badge">
                              {Math.round(definition.confidence * 100)}% confidence
                            </span>
                          </div>
                          <p className="definition-text">{definition.text}</p>
                        </div>
                      ))}
                    </div>

                    {selectedDefinitions.has(result.term) && (
                      <div className="selected-definition">
                        <span className="selected-label">✅ Selected:</span>
                        <span className="selected-text">
                          {selectedDefinitions.get(result.term)}
                        </span>
                        <button 
                          onClick={() => handleApplySelected(result.term)}
                          className="apply-btn"
                        >
                          🚀 Apply This Definition
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="panel-actions">
                <button 
                  onClick={handleApplyAll}
                  disabled={selectedDefinitions.size === 0}
                  className="apply-all-btn"
                >
                  🚀 Apply All Selected Definitions ({selectedDefinitions.size})
                </button>
                <button onClick={onClose} className="cancel-btn">
                  Cancel
                </button>
              </div>
            </>
          )}

          {!loading && !error && definitions.length === 0 && (
            <div className="empty-section">
              <h4>✨ All Good!</h4>
              <p>All nodes in your CNL already have descriptions. Great work!</p>
              <p className="tip">
                💡 <strong>Tip:</strong> You can still manually edit descriptions 
                or add new nodes to get WordNet suggestions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
