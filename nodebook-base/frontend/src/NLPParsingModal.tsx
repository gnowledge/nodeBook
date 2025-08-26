import React, { useState } from 'react';
import './NLPParsingModal.css';

interface NLPAnalysis {
  language: string;
  originalText: string;
  wordCount: number;
  sentenceCount: number;
  nouns: string[];
  verbs: string[];
  adjectives: string[];
  adverbs: string[];
  people: string[];
  places: string[];
  organizations: string[];
  numbers: string[];
  dates: string[];
  relations: Array<{
    from: string;
    to: string;
    verb: string;
    confidence: number;
    sentence: string;
    type: string;
  }>;
  attributes: Array<{
    entity: string;
    key: string;
    value: string;
    confidence: number;
    pattern: string;
  }>;
  processes: Array<{
    label: string;
    confidence: number;
    keyword: string;
    type: string;
  }>;
  states: Array<{
    label: string;
    prior: string;
    post: string;
    confidence: number;
    type: string;
  }>;
  functions: Array<{
    label: string;
    expression: string;
    confidence: number;
    keyword: string;
    type: string;
  }>;
  // New enhanced fields
  nounCategories: {
    properNouns: Array<{ text: string; type: string; confidence: number }>;
    commonNouns: Array<{ text: string; type: string; confidence: number }>;
    concepts: Array<{ text: string; type: string; confidence: number }>;
    measurements: Array<{ text: string; type: string; confidence: number }>;
  };
  logicalConnectives: Array<{
    word: string;
    type: string;
    function: string;
    confidence: number;
  }>;
  textType: string;
  complexity: string;
  graphBuildingPotential: string;
  prepositions: Array<{ word: string; function: string }>;
  conjunctions: Array<{ word: string; function: string }>;
  articles: Array<{ word: string; function: string }>;
}

interface NLPParsingModalProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  analysis: NLPAnalysis | null;
  isLoading: boolean;
  onParse: () => void;
}

export function NLPParsingModal({ isOpen, onClose, text, analysis, isLoading, onParse }: NLPParsingModalProps) {
  if (!isOpen) return null;

  const renderGraphSuggestions = () => {
    if (!analysis) return null;

    return (
      <div className="graph-suggestions">
        <h3>📊 Text Analysis Results</h3>
        
        {/* Text Analysis Summary */}
        <div className="analysis-summary">
          <h4>📈 Overview</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Text Type:</span>
              <span className="summary-value">{analysis.textType}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Complexity:</span>
              <span className="summary-value">{analysis.complexity}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Graph Potential:</span>
              <span className="summary-value">{analysis.graphBuildingPotential}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Words:</span>
              <span className="summary-value">{analysis.wordCount}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Sentences:</span>
              <span className="summary-value">{analysis.sentenceCount}</span>
            </div>
          </div>
        </div>

        {/* Parts of Speech */}
        <div className="suggestion-section">
          <h4>🏷️ Parts of Speech</h4>
          <div className="pos-grid">
            {analysis.nouns.length > 0 && (
              <div className="pos-category">
                <h5>Nouns ({analysis.nouns.length})</h5>
                <div className="pos-items">
                  {analysis.nouns.map((noun, index) => (
                    <span key={index} className="pos-item noun">{noun}</span>
                  ))}
                </div>
              </div>
            )}
            
            {analysis.verbs.length > 0 && (
              <div className="pos-category">
                <h5>Verbs ({analysis.verbs.length})</h5>
                <div className="pos-items">
                  {analysis.verbs.map((verb, index) => (
                    <span key={index} className="pos-item verb">{verb}</span>
                  ))}
                </div>
              </div>
            )}
            
            {analysis.adjectives.length > 0 && (
              <div className="pos-category">
                <h5>Adjectives ({analysis.adjectives.length})</h5>
                <div className="pos-items">
                  {analysis.adjectives.map((adj, index) => (
                    <span key={index} className="pos-item adjective">{adj}</span>
                  ))}
                </div>
              </div>
            )}
            
            {analysis.adverbs.length > 0 && (
              <div className="pos-category">
                <h5>Adverbs ({analysis.adverbs.length})</h5>
                <div className="pos-items">
                  {analysis.adverbs.map((adv, index) => (
                    <span key={index} className="pos-item adverb">{adv}</span>
                  ))}
                </div>
              </div>
            )}

            {analysis.prepositions && analysis.prepositions.length > 0 && (
              <div className="pos-category">
                <h5>Prepositions ({analysis.prepositions.length})</h5>
                <div className="pos-items">
                  {analysis.prepositions.map((prep, index) => (
                    <span key={index} className="pos-item preposition" title={prep.function}>
                      {prep.word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysis.conjunctions && analysis.conjunctions.length > 0 && (
              <div className="pos-category">
                <h5>Conjunctions ({analysis.conjunctions.length})</h5>
                <div className="pos-items">
                  {analysis.conjunctions.map((conj, index) => (
                    <span key={index} className="pos-item conjunction" title={conj.function}>
                      {conj.word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysis.articles && analysis.articles.length > 0 && (
              <div className="pos-category">
                <h5>Articles ({analysis.articles.length})</h5>
                <div className="pos-items">
                  {analysis.articles.map((article, index) => (
                    <span key={index} className="pos-item article" title={article.function}>
                      {article.word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Noun Categories */}
        <div className="suggestion-section">
          <h4>🏛️ Noun Categories</h4>
          <div className="category-grid">
            {analysis.nounCategories.properNouns.length > 0 && (
              <div className="category-item">
                <h5>🏛️ Proper Nouns ({analysis.nounCategories.properNouns.length})</h5>
                <div className="category-items">
                  {analysis.nounCategories.properNouns.map((noun, index) => (
                    <span key={index} className="category-item-text proper-noun">{noun.text}</span>
                  ))}
                </div>
              </div>
            )}
            
            {analysis.nounCategories.concepts.length > 0 && (
              <div className="category-item">
                <h5>💡 Concepts ({analysis.nounCategories.concepts.length})</h5>
                <div className="category-items">
                  {analysis.nounCategories.concepts.map((concept, index) => (
                    <span key={index} className="category-item-text concept">{concept.text}</span>
                  ))}
                </div>
              </div>
            )}
            
            {analysis.nounCategories.measurements.length > 0 && (
              <div className="category-item">
                <h5>📏 Measurements ({analysis.nounCategories.measurements.length})</h5>
                <div className="category-items">
                  {analysis.nounCategories.measurements.map((measurement, index) => (
                    <span key={index} className="category-item-text measurement">{measurement.text}</span>
                  ))}
                </div>
              </div>
            )}
            
            {analysis.nounCategories.commonNouns.length > 0 && (
              <div className="category-item">
                <h5>🔤 Common Nouns ({analysis.nounCategories.commonNouns.length})</h5>
                <div className="category-items">
                  {analysis.nounCategories.commonNouns.map((noun, index) => (
                    <span key={index} className="category-item-text common-noun">{noun.text}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Logical Connectives */}
        {analysis.logicalConnectives.length > 0 && (
          <div className="suggestion-section">
            <h4>🔗 Logical Connectives</h4>
            <div className="connective-items">
              {analysis.logicalConnectives.map((connective, index) => (
                <div key={index} className="connective-item">
                  <span className="connective-word">{connective.word}</span>
                  <span className="connective-function">→ {connective.function}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attributes */}
        {analysis.attributes.length > 0 && (
          <div className="suggestion-section">
            <h4>🏷️ Attributes & Properties</h4>
            <div className="attribute-items">
              {analysis.attributes.map((attr, index) => (
                <div key={index} className="attribute-item">
                  <span className="attribute-entity">{attr.entity}</span>
                  <span className="attribute-key">{attr.key}:</span>
                  <span className="attribute-value">{attr.value}</span>
                  <span className="attribute-pattern">({attr.pattern})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Functions */}
        {analysis.functions.length > 0 && (
          <div className="suggestion-section">
            <h4>🧮 Functions & Calculations</h4>
            <div className="function-items">
              {analysis.functions.map((func, index) => (
                <div key={index} className="function-item">
                  <span className="function-label">{func.label}</span>
                  <span className="function-expression">{func.expression}</span>
                  <span className="function-type">({func.type})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Learning Guidance */}
        <div className="learning-guidance">
          <h4>💡 Think About Building Your Graph</h4>
          <div className="guidance-content">
            <p>Use this analysis to think about:</p>
            <ul>
              <li>Which entities should be <strong>nodes</strong>?</li>
              <li>How should they be <strong>connected</strong>?</li>
              <li>What <strong>attributes</strong> should each node have?</li>
              <li>Which <strong>graph mode</strong> fits your content best?</li>
            </ul>
            <p className="guidance-note">💭 <em>Take your time to think about the relationships and structure!</em></p>
          </div>
        </div>
      </div>
    );
  };

  const renderLearningTips = () => {
    if (!analysis) return null;

    const tips = [];
    
    if (analysis.wordCount < 10) {
      tips.push('💡 Consider adding more detail to help with graph creation');
    }
    
    if (analysis.sentenceCount === 1) {
      tips.push('💡 Breaking text into multiple sentences can help identify different concepts');
    }
    
    if (analysis.verbs.length === 0) {
      tips.push('💡 Add action verbs to describe relationships between entities');
    }
    
    if (analysis.adjectives.length === 0) {
      tips.push('💡 Use descriptive adjectives to add attributes to entities');
    }

    if (tips.length === 0) {
      tips.push('✅ Great! Your text has good structure for graph building');
    }

    return (
      <div className="learning-tips">
        <h4>💡 Learning Tips:</h4>
        <ul>
          {tips.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="nlp-modal-overlay" onClick={onClose}>
      <div className="nlp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="nlp-modal-header">
          <h2>🧠 Text Analysis & Graph Suggestions</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="nlp-modal-content">
          {/* Text Input Section */}
          <div className="text-section">
            <h3>📝 Your Text:</h3>
            <div className="text-display">
              {text || 'No text provided'}
            </div>
            {!analysis && (
              <button 
                className="parse-btn" 
                onClick={onParse}
                disabled={isLoading || !text}
              >
                {isLoading ? '🔍 Analyzing...' : '🔍 Parse Text'}
              </button>
            )}
          </div>

          {/* Analysis Results Section */}
          {isLoading && (
            <div className="loading-section">
              <div className="loading-spinner"></div>
              <p>Analyzing your text...</p>
            </div>
          )}

          {analysis && (
            <div className="analysis-section">
              {/* Basic Stats */}
              <div className="basic-stats">
                <div className="stat-item">
                  <span className="stat-label">Words:</span>
                  <span className="stat-value">{analysis.wordCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Sentences:</span>
                  <span className="stat-value">{analysis.sentenceCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Language:</span>
                  <span className="stat-value">{analysis.language.toUpperCase()}</span>
                </div>
              </div>

              {/* Graph Suggestions */}
              {renderGraphSuggestions()}

              {/* Learning Tips */}
              {renderLearningTips()}

              {/* Cost Info */}
              <div className="cost-info">
                <span className="cost-label">💚 Analysis Cost:</span>
                <span className="cost-value">Free (Local Processing)</span>
              </div>
            </div>
          )}
        </div>

        <div className="nlp-modal-footer">
          <button className="close-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
