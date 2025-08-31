import React, { useEffect, useState } from 'react';
import { CNLEditor } from './CNLEditorComponent';
import type { RelationType, AttributeType, NodeType } from './types';
import { NLPSidePanel } from './NLPSidePanel';
import { WordNetDefinitionsPanel } from './WordNetDefinitionsPanel';
import { ensureDescriptionBlocks, extractDescriptionsForAnalysis, debugDescriptions } from './utils/cnlProcessor';
import { analyzeMultipleTexts, type NLPAnalysisResult, type NLPAnalysisError } from './services/nlpAnalysisService';
import { WordNetService } from './services/wordnetService';
import './CnlEditor.css';

interface CnlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSave?: () => void;
  disabled: boolean;
  nodeTypes: NodeType[];
  relationTypes: RelationType[];
  attributeTypes: AttributeType[];
}

export function CnlEditor({ value, onChange, onSubmit, onSave, disabled, nodeTypes, relationTypes, attributeTypes }: CnlEditorProps) {
  // Undo functionality
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // NLP Analysis State
  const [isNLPPanelOpen, setIsNLPPanelOpen] = useState(false);
  const [nlpAnalysisResults, setNlpAnalysisResults] = useState<Array<NLPAnalysisResult | NLPAnalysisError>>([]);
  const [isNLPLoading, setIsNLPLoading] = useState(false);
  const [nlpError, setNlpError] = useState<string | null>(null);

  // WordNet Auto-Description State
  const [isWordNetPanelOpen, setIsWordNetPanelOpen] = useState(false);
  const [wordNetTerms, setWordNetTerms] = useState<string[]>([]);
  const [isWordNetLoading, setIsWordNetLoading] = useState(false);
  const [wordNetError, setWordNetError] = useState<string | null>(null);
  

  


  // Handle NLP Analysis
  const handleNLPParse = async () => {
    if (!value.trim()) {
      setNlpError('No CNL text to analyze');
      return;
    }

    setIsNLPLoading(true);
    setNlpError(null);
    setNlpAnalysisResults([]);

    try {
      // First, ensure description blocks are present
      const enhancedCnl = ensureDescriptionBlocks(value);
      
      // Debug: Show what we're extracting
      debugDescriptions(enhancedCnl);
      
      // Extract descriptions for analysis
      const descriptions = extractDescriptionsForAnalysis(enhancedCnl);
      
      if (descriptions.length === 0) {
        setNlpError('No descriptions found in the CNL text. Please add description blocks to your nodes.');
        setIsNLPLoading(false);
        return;
      }

      // Analyze all descriptions
      const analysisResult = await analyzeMultipleTexts(descriptions);
      
      if (analysisResult.results.length > 0) {
        // Store all analysis results
        setNlpAnalysisResults(analysisResult.results);
        setIsNLPPanelOpen(true);
      } else {
        setNlpError('Failed to analyze the text. Please try again.');
      }
    } catch (error) {
      setNlpError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsNLPLoading(false);
    }
  };

  // Auto-insert description blocks when needed
  const handleAutoInsertDescriptions = () => {
    const enhancedCnl = ensureDescriptionBlocks(value);
    
    if (enhancedCnl !== value) {
      onChange(enhancedCnl);
    }
  };

  // Handle WordNet auto-description
  const handleWordNetAutoDescription = async () => {
    if (!value.trim()) {
      setWordNetError('No CNL text to analyze');
      return;
    }

    setIsWordNetLoading(true);
    setWordNetError(null);

    try {
      // Extract terms that need descriptions
      const terms = WordNetService.extractTermsFromCNL(value);
      
      if (terms.length === 0) {
        setWordNetError('All nodes already have descriptions. Great work!');
        setIsWordNetLoading(false);
        return;
      }

      setWordNetTerms(terms);
      setIsWordNetPanelOpen(true);
    } catch (error) {
      setWordNetError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsWordNetLoading(false);
    }
  };

  // Handle definition selection from WordNet
  const handleDefinitionSelect = (term: string, definition: string) => {
    try {
      console.log('Before WordNet insertion:', value);
      const updatedCnl = WordNetService.insertDescription(value, term, definition);
      console.log('After WordNet insertion:', updatedCnl);
      onChange(updatedCnl);
    } catch (error) {
      console.error('Error inserting definition:', error);
      setWordNetError('Failed to insert definition. Please try again.');
    }
  };

  // Track changes for undo functionality
  useEffect(() => {
    if (value !== (history[historyIndex] || '')) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(value);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [value]);

  // Undo function
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };

  // Redo function
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };

  // Add Ctrl+Enter shortcut for submission and Ctrl+Z for undo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        onSubmit();
      } else if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        handleUndo();
      } else if (event.ctrlKey && event.key === 'y') {
        event.preventDefault();
        handleRedo();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSubmit, handleUndo, handleRedo]);

  return (
    <div className="cnl-editor-container">
      {/* Editor Toolbar */}
      <div className="cnl-editor-toolbar">
                    <div className="toolbar-left">
              <button
                className="toolbar-btn undo-btn"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="Undo (Ctrl+Z)"
              >
                ↩️ Undo
              </button>
              <button
                className="toolbar-btn redo-btn"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="Redo (Ctrl+Y)"
              >
                ↪️ Redo
              </button>
              <button
                className="toolbar-btn auto-insert-btn"
                onClick={handleAutoInsertDescriptions}
                title="Automatically insert description blocks for nodes that don't have them"
              >
                📝 Auto-Insert Descriptions
              </button>
              <button
                className="toolbar-btn wordnet-btn"
                onClick={handleWordNetAutoDescription}
                disabled={disabled || isWordNetLoading || !value.trim()}
                title="Get WordNet definitions for nodes without descriptions"
              >
                {isWordNetLoading ? '🔍 Analyzing...' : '📚 WordNet Definitions'}
              </button>
            </div>
        
        <div className="toolbar-right">
          <button 
            className="toolbar-btn parse-btn"
            onClick={handleNLPParse}
            disabled={disabled || isNLPLoading || !value.trim()}
            title="Analyze description blocks with NLP to help build your graph"
          >
            {isNLPLoading ? '🔍 Analyzing...' : '🧠 Parse Descriptions'}
          </button>
          
          {onSave && (
            <button 
              className="toolbar-btn save-btn"
              onClick={() => {
                console.log('Save button clicked, calling onSave');
                onSave();
              }}
              disabled={disabled || !value.trim()}
              title="Save CNL changes (Ctrl+S)"
            >
              💾 Save CNL
            </button>
          )}
          
          <button 
            className="toolbar-btn submit-btn"
            onClick={() => {
              console.log('Submit button clicked, calling onSubmit with value:', value);
              onSubmit();
            }}
            disabled={disabled}
            title="Submit CNL to build graph (Ctrl+Enter)"
          >
            🚀 Submit to Build Graph
          </button>
        </div>
      </div>

      {/* CodeMirror CNL Editor */}
      <div className="cnl-editor-main">
        <CNLEditor
          value={value}
          onChange={onChange}
          language="cnl"
          readOnly={disabled}
          placeholder="Start typing your CNL... Use # for nodes, < > for relations, has for attributes"
          nodeTypes={nodeTypes}
          relationTypes={relationTypes}
          attributeTypes={attributeTypes}
        />
      </div>

                  {/* NLP Side Panel */}
            <NLPSidePanel
              isOpen={isNLPPanelOpen}
              onClose={() => setIsNLPPanelOpen(false)}
              analysisResults={nlpAnalysisResults}
              isLoading={isNLPLoading}
            />

            {/* WordNet Definitions Panel */}
            <WordNetDefinitionsPanel
              isOpen={isWordNetPanelOpen}
              onClose={() => setIsWordNetPanelOpen(false)}
              terms={wordNetTerms}
              onDefinitionSelect={handleDefinitionSelect}
              isLoading={isWordNetLoading}
            />
      


      {/* Error Display */}
      {nlpError && (
        <div className="nlp-error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{nlpError}</span>
          <button 
            className="error-close-btn"
            onClick={() => setNlpError(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* WordNet Error Display */}
      {wordNetError && (
        <div className="wordnet-error-banner">
          <span className="error-icon">📚</span>
          <span className="error-message">{wordNetError}</span>
          <button 
            className="error-close-btn"
            onClick={() => setWordNetError(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
