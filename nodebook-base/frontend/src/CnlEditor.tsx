import React, { useEffect, useState } from 'react';
import { CNLEditor } from './CNLEditorComponent';
import { CollaborativeCNLEditor } from './CollaborativeCNLEditor';
import type { RelationType, AttributeType, NodeType } from './types';
import { NLPSidePanel } from './NLPSidePanel';
import { WordNetDefinitionsPanel } from './WordNetDefinitionsPanel';
import { VersionControl } from './components/VersionControl';
import { ensureDescriptionBlocks, extractDescriptionsForAnalysis, debugDescriptions } from './utils/cnlProcessor';
import { analyzeMultipleTexts, type NLPAnalysisResult, type NLPAnalysisError } from './services/nlpAnalysisService';
import { WordNetService } from './services/wordnetService';
import './CnlEditor.css';

interface CnlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSave?: () => void;
  onAutoSave?: (value: string) => void;
  onClose?: () => void;
  disabled: boolean;
  nodeTypes: NodeType[];
  relationTypes: RelationType[];
  attributeTypes: AttributeType[];
  graphId?: string;
  editStatus?: {
    isModified: boolean;
    isSaved: boolean;
  };
  // Collaboration props
  enableCollaboration?: boolean;
  userId?: string;
  userName?: string;
  onCollaborationToggle?: (enabled: boolean) => void;
  editorLanguage?: 'cnl' | 'markdown';
}

export function CnlEditor({ value, onChange, onSubmit, onSave, onAutoSave, onClose, disabled, nodeTypes, relationTypes, attributeTypes, graphId, editStatus, enableCollaboration = false, userId, userName, onCollaborationToggle, editorLanguage = 'cnl' }: CnlEditorProps) {
  // Debug logging
  console.log('[CnlEditor] Props:', { value, valueLength: value?.length, disabled, graphId });
  
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

  // Dropdown menu state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Version control state
  const [isVersionControlOpen, setIsVersionControlOpen] = useState(false);

  // Close dropdown when clicking outside or pressing ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveDropdown(null);
      }
    };

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [activeDropdown]);

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
    setWordNetTerms([]);

    try {
      const terms = WordNetService.extractTermsFromCNL(value);
      
      if (terms.length > 0) {
        setWordNetTerms(terms);
        setIsWordNetPanelOpen(true);
      } else {
        setWordNetError('No terms found for WordNet lookup. Please add some nodes to your CNL.');
      }
    } catch (error) {
      setWordNetError(error instanceof Error ? error.message : 'Failed to extract terms from CNL');
    } finally {
      setIsWordNetLoading(false);
    }
  };

  // Handle definition selection from WordNet
  const handleDefinitionSelect = (term: string, definition: string) => {
    // Find the node in the CNL and add the definition
    const lines = value.split('\n');
    const updatedLines = lines.map(line => {
      if (line.trim().startsWith('#') && line.toLowerCase().includes(term.toLowerCase())) {
        // Check if the node already has a description block
        if (!line.includes('```description')) {
          return `${line}\n\`\`\`description\n${definition}\n\`\`\``;
        }
      }
      return line;
    });
    
    onChange(updatedLines.join('\n'));
  };

  // Undo/Redo functionality
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      onChange(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      onChange(history[historyIndex + 1]);
    }
  };

  // Update history when value changes
  useEffect(() => {
    if (value !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(value);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [value]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            if (onSave) onSave();
            break;
          case 'Enter':
            event.preventDefault();
            onSubmit();
            break;
          case 'z':
            event.preventDefault();
            handleUndo();
            break;
          case 'y':
            event.preventDefault();
            handleRedo();
            break;
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSubmit, handleUndo, handleRedo]);

  // Dropdown menu component
  const DropdownMenu = ({ title, icon, items, isOpen, onToggle }: {
    title: string;
    icon: string;
    items: Array<{ label: string; icon: string; onClick: () => void; disabled?: boolean; title?: string }>;
    isOpen: boolean;
    onToggle: () => void;
  }) => (
    <div className="dropdown-container">
      <button
        className={`dropdown-trigger ${isOpen ? 'active' : ''}`}
        onClick={onToggle}
        title={title}
      >
        {icon} {title} ▼
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          {items.map((item, index) => (
            <button
              key={index}
              className={`dropdown-item ${item.disabled ? 'disabled' : ''}`}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  onToggle();
                }
              }}
              disabled={item.disabled}
              title={item.title}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="cnl-editor-container">
      {/* Editor Toolbar */}
      <div className="cnl-editor-toolbar">
        <div className="toolbar-left">
          {/* Edit Status Display */}
          {editStatus && (
            <div className="edit-status-display">
              <span className={`status-indicator ${editStatus.isModified ? 'modified' : 'saved'}`}>
                {editStatus.isModified ? '⚠️ Modified' : '✅ Saved'}
              </span>
            </div>
          )}
          
          {/* Collaboration Toggle */}
          {graphId && userId && (
            <button
              className={`collaboration-toggle ${enableCollaboration ? 'active' : ''}`}
              onClick={() => {
                if (onCollaborationToggle) {
                  onCollaborationToggle(!enableCollaboration);
                }
              }}
              title={enableCollaboration ? 'Disable collaboration' : 'Enable live collaboration'}
              style={{
                padding: '4px 8px',
                margin: '0 8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: enableCollaboration ? '#e3f2fd' : '#fff',
                color: enableCollaboration ? '#1976d2' : '#666',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {enableCollaboration ? '👥 Live' : '👤 Solo'}
            </button>
          )}
          
          {/* Edit Menu */}
          <DropdownMenu
            title="Edit"
            icon="✏️"
            isOpen={activeDropdown === 'edit'}
            onToggle={() => setActiveDropdown(activeDropdown === 'edit' ? null : 'edit')}
            items={[
              {
                label: 'Undo',
                icon: '↩️',
                onClick: handleUndo,
                disabled: historyIndex <= 0,
                title: 'Undo (Ctrl+Z)'
              },
              {
                label: 'Redo',
                icon: '↪️',
                onClick: handleRedo,
                disabled: historyIndex >= history.length - 1,
                title: 'Redo (Ctrl+Y)'
              }
            ]}
          />

          {/* Tools Menu */}
          <DropdownMenu
            title="Tools"
            icon="🔧"
            isOpen={activeDropdown === 'tools'}
            onToggle={() => setActiveDropdown(activeDropdown === 'tools' ? null : 'tools')}
            items={[
              {
                label: 'Auto-Insert Descriptions',
                icon: '📝',
                onClick: handleAutoInsertDescriptions,
                title: 'Automatically insert description blocks for nodes'
              },
              {
                label: 'WordNet Definitions',
                icon: '📚',
                onClick: handleWordNetAutoDescription,
                disabled: disabled || isWordNetLoading || !value.trim(),
                title: 'Get WordNet definitions for nodes'
              },
              {
                label: 'Parse Descriptions',
                icon: '🧠',
                onClick: handleNLPParse,
                disabled: disabled || isNLPLoading || !value.trim(),
                title: 'Analyze description blocks with NLP'
              }
            ]}
          />

          {/* Version Control Menu */}
          <DropdownMenu
            title="Version"
            icon="📋"
            isOpen={activeDropdown === 'version'}
            onToggle={() => setActiveDropdown(activeDropdown === 'version' ? null : 'version')}
            items={[
              {
                label: 'View History',
                icon: '📜',
                onClick: () => {
                  if (graphId) {
                    setIsVersionControlOpen(true);
                    setActiveDropdown(null);
                  }
                },
                disabled: !graphId,
                title: graphId ? 'View version history' : 'No graph selected'
              },
              {
                label: 'Compare Versions',
                icon: '🔍',
                onClick: () => console.log('Compare versions - coming soon'),
                disabled: !graphId,
                title: graphId ? 'Compare different versions' : 'No graph selected'
              }
            ]}
          />
        </div>

        <div className="toolbar-right">
          {/* Primary Actions & Mode switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12 }}>
            <label style={{ fontSize: 12, color: '#6b7280' }}>Editor mode:</label>
            <select
              value={editorLanguage}
              onChange={(e) => {
                // Switch editor language locally; actual graph mode change is handled elsewhere
                // Parent can pass editorLanguage based on graph mode
              }}
              style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', color: '#374151' }}
              disabled
              title="Graph mode determines editor; change mode in Nodes/Data view"
            >
              <option value="cnl">CNL</option>
              <option value="markdown">Markdown</option>
            </select>
          </div>
          {onSave && (
            <button 
              className="toolbar-btn primary-btn save-btn"
              onClick={() => {
                console.log('Save button clicked, calling onSave');
                onSave();
              }}
              disabled={disabled || !value.trim()}
              title="Save CNL changes (Ctrl+S)"
            >
              💾 Save
            </button>
          )}
          
          <button 
            className="toolbar-btn primary-btn submit-btn"
            onClick={() => {
              console.log('Submit button clicked, calling onSubmit with value:', value);
              onSubmit();
            }}
            disabled={disabled}
            title="Submit CNL to build graph (Ctrl+Enter)"
          >
            🚀 Submit
          </button>
          
          {onClose && (
            <button 
              className="toolbar-btn secondary-btn close-btn"
              onClick={() => {
                console.log('Close button clicked, calling onClose');
                onClose();
              }}
              title="Close and return to Dashboard"
            >
              🏠 Close
            </button>
          )}
        </div>
      </div>

      {/* CodeMirror CNL Editor */}
      <div className="cnl-editor-main">
        {enableCollaboration && graphId && userId ? (
          <CollaborativeCNLEditor
            value={value}
            onChange={onChange}
            onAutoSave={onAutoSave}
            language={editorLanguage}
            readOnly={disabled}
            placeholder="Start typing your CNL... Use # for nodes, < > for relations, has for attributes"
            nodeTypes={nodeTypes}
            relationTypes={relationTypes}
            attributeTypes={attributeTypes}
            graphId={graphId}
            userId={userId}
            userName={userName || 'Anonymous'}
          />
        ) : (
          <CNLEditor
            value={value}
            onChange={onChange}
            onAutoSave={onAutoSave}
            language={editorLanguage}
            readOnly={disabled}
            placeholder="Start typing your CNL... Use # for nodes, < > for relations, has for attributes"
            nodeTypes={nodeTypes}
            relationTypes={relationTypes}
            attributeTypes={attributeTypes}
          />
        )}
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

      {/* Version Control Panel */}
      {graphId && (
        <VersionControl
          graphId={graphId}
          isOpen={isVersionControlOpen}
          onClose={() => setIsVersionControlOpen(false)}
        />
      )}
    </div>
  );
}
