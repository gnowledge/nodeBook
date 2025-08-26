import React from 'react';
import './NLPSidePanel.css';

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
  prepositions: Array<{ word: string; type: string; function: string; confidence: number }>;
  conjunctions: Array<{ word: string; type: string; function: string; confidence: number }>;
  articles: Array<{ word: string; type: string; function: string; confidence: number }>;
  textType: string;
  complexity: string;
  graphBuildingPotential: string;
}

interface NLPSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResults: Array<NLPAnalysisResult | NLPAnalysisError>;
  isLoading: boolean;
}

export function NLPSidePanel({ isOpen, onClose, analysisResults, isLoading }: NLPSidePanelProps) {
  if (!isOpen) return null;

  const renderGraphSuggestions = () => {
    if (!analysisResults || analysisResults.length === 0) return null;

    return (
      <div className="graph-suggestions">
        <h3>📊 Text Analysis Results</h3>
        
        {/* Learning Guidance - Moved to Top */}
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
        
        {/* Multiple Analysis Results */}
        {analysisResults.map((result, index) => {
          if ('error' in result) {
            return (
              <div key={index} className="analysis-error">
                <h4>❌ Analysis {index + 1} - Error</h4>
                <p>{result.message}</p>
              </div>
            );
          }
          
          const analysis = result.analysis;
          return (
            <div key={index} className="analysis-section">
              <h4>📝 Description Block {index + 1}</h4>
              <div className="description-preview">
                <strong>Text:</strong> {analysis.originalText.substring(0, 100)}...
              </div>
              
              {/* Text Analysis Summary */}
              <div className="analysis-summary">
                <h5>📈 Overview</h5>
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
                <h5>🏷️ Parts of Speech</h5>
                <div className="pos-grid">
                  {analysis.nouns.length > 0 && (
                    <div className="pos-category">
                      <h6>Nouns ({analysis.nouns.length})</h6>
                      <div className="pos-items">
                        {analysis.nouns.map((noun, idx) => (
                          <span key={idx} className="pos-item noun">{noun}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {analysis.verbs.length > 0 && (
                    <div className="pos-category">
                      <h6>Verbs ({analysis.verbs.length})</h6>
                      <div className="pos-items">
                        {analysis.verbs.map((verb, idx) => (
                          <span key={idx} className="pos-item verb">{verb}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {analysis.adjectives.length > 0 && (
                    <div className="pos-category">
                      <h6>Adjectives ({analysis.adjectives.length})</h6>
                      <div className="pos-items">
                        {analysis.adjectives.map((adj, idx) => (
                          <span key={idx} className="pos-item adjective">{adj}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {analysis.adverbs.length > 0 && (
                    <div className="pos-category">
                      <h6>Adverbs ({analysis.adverbs.length})</h6>
                      <div className="pos-items">
                        {analysis.adverbs.map((adv, idx) => (
                          <span key={idx} className="pos-item adverb">{adv}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.prepositions && analysis.prepositions.length > 0 && (
                    <div className="pos-category">
                      <h6>Prepositions ({analysis.prepositions.length})</h6>
                      <div className="pos-items">
                        {analysis.prepositions.map((prep, idx) => (
                          <span key={idx} className="pos-item preposition" title={prep.function}>
                            {prep.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.conjunctions && analysis.conjunctions.length > 0 && (
                    <div className="pos-category">
                      <h6>Conjunctions ({analysis.conjunctions.length})</h6>
                      <div className="pos-items">
                        {analysis.conjunctions.map((conj, idx) => (
                          <span key={idx} className="pos-item conjunction" title={conj.function}>
                            {conj.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.articles && analysis.articles.length > 0 && (
                    <div className="pos-category">
                      <h6>Articles ({analysis.articles.length})</h6>
                      <div className="pos-items">
                        {analysis.articles.map((article, idx) => (
                          <span key={idx} className="pos-item article" title={article.function}>
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
                <h5>🏛️ Noun Categories</h5>
                <div className="category-grid">
                  {analysis.nounCategories.properNouns.length > 0 && (
                    <div className="category-item">
                      <h6>🏛️ Proper Nouns ({analysis.nounCategories.properNouns.length})</h6>
                      <div className="category-items">
                        {analysis.nounCategories.properNouns.map((noun, idx) => (
                          <span key={idx} className="category-item-text proper-noun">{noun.text}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {analysis.nounCategories.concepts.length > 0 && (
                    <div className="category-item">
                      <h6>💡 Concepts ({analysis.nounCategories.concepts.length})</h6>
                      <div className="category-items">
                        {analysis.nounCategories.concepts.map((concept, idx) => (
                          <span key={idx} className="category-item-text concept">{concept.text}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {analysis.nounCategories.measurements.length > 0 && (
                    <div className="category-item">
                      <h6>📏 Measurements ({analysis.nounCategories.measurements.length})</h6>
                      <div className="category-items">
                        {analysis.nounCategories.measurements.map((measurement, idx) => (
                          <span key={idx} className="category-item-text measurement">{measurement.text}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {analysis.nounCategories.commonNouns.length > 0 && (
                    <div className="category-item">
                      <h6>🔤 Common Nouns ({analysis.nounCategories.commonNouns.length})</h6>
                      <div className="category-items">
                        {analysis.nounCategories.commonNouns.map((noun, idx) => (
                          <span key={idx} className="category-item-text common-noun">{noun.text}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Logical Connectives */}
              {analysis.logicalConnectives.length > 0 && (
                <div className="suggestion-section">
                  <h5>🔗 Logical Connectives</h5>
                  <div className="connective-items">
                    {analysis.logicalConnectives.map((connective, idx) => (
                      <div key={idx} className="connective-item">
                        <span className="connective-word">{connective.word}</span>
                        <span className="connective-function">→ {connective.function}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}



              {/* Functions */}
              {analysis.functions.length > 0 && (
                <div className="suggestion-section">
                  <h5>🧮 Functions & Calculations</h5>
                  <div className="function-items">
                    {analysis.functions.map((func, idx) => (
                      <div key={idx} className="function-item">
                        <span className="function-label">{func.label}</span>
                        <span className="function-expression">{func.expression}</span>
                        <span className="function-type">({func.type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`nlp-side-panel ${isOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <h3>🧠 Text Analysis</h3>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </div>
      
      <div className="panel-content">
        {isLoading && (
          <div className="loading-section">
            <div className="loading-spinner"></div>
            <p>Analyzing your text...</p>
          </div>
        )}

        {analysisResults && analysisResults.length > 0 && renderGraphSuggestions()}
      </div>
    </div>
  );
}
