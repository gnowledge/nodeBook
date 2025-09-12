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
  // Graph mode props (for unified toolbar control)
  graphMode?: 'markdown' | 'mindmap' | 'richgraph' | 'strictgraph';
  onGraphModeChange?: (mode: 'markdown' | 'mindmap' | 'richgraph' | 'strictgraph') => void;
}

export function CnlEditor({ value, onChange, onSubmit, onSave, onAutoSave, onClose, disabled, nodeTypes, relationTypes, attributeTypes, graphId, editStatus, enableCollaboration = false, userId, userName, onCollaborationToggle, editorLanguage = 'cnl', graphMode = 'richgraph', onGraphModeChange }: CnlEditorProps) {
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
  const DropdownMenu = ({ title, icon, items, isOpen, onToggle, align = 'left', compact = false }: {
    title: string;
    icon: string;
    items: Array<{ label: string; icon: string; onClick: () => void; disabled?: boolean; title?: string }>;
    isOpen: boolean;
    onToggle: () => void;
    align?: 'left' | 'right';
    compact?: boolean;
  }) => (
    <div className={`dropdown-container ${align === 'right' ? 'align-right' : ''}`}>
      <button
        className={`dropdown-trigger ${isOpen ? 'active' : ''}`}
        onClick={onToggle}
        title={title}
        style={compact ? {
          padding: '6px',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          marginRight: '4px',
          borderRadius: '6px',
          border: '1px solid #d1d5db',
          background: '#fff',
          cursor: 'pointer',
          color: '#333'
        } : {}}
      >
        {icon} {!compact && `${title} ▼`}
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
          {/* Unified Menu - first on the left */}
          <DropdownMenu
            title="Menu"
            icon="☰"
            isOpen={activeDropdown === 'menu'}
            onToggle={() => setActiveDropdown(activeDropdown === 'menu' ? null : 'menu')}
            align="left"
            compact={true}
            items={[
              { label: '— Mode —', icon: '', onClick: () => {}, disabled: true },
              { label: `${graphMode === 'markdown' ? '✓ ' : ''}Markdown`, icon: '📝', onClick: () => onGraphModeChange && onGraphModeChange('markdown'), disabled: !graphId },
              { label: `${graphMode === 'mindmap' ? '✓ ' : ''}MindMap`, icon: '🧠', onClick: () => onGraphModeChange && onGraphModeChange('mindmap'), disabled: !graphId },
              { label: `${graphMode === 'richgraph' ? '✓ ' : ''}RichGraph`, icon: '🔗', onClick: () => onGraphModeChange && onGraphModeChange('richgraph'), disabled: !graphId },
              { label: `${graphMode === 'strictgraph' ? '✓ ' : ''}StrictGraph`, icon: '✅', onClick: () => onGraphModeChange && onGraphModeChange('strictgraph'), disabled: !graphId },
              { label: '— Version —', icon: '', onClick: () => {}, disabled: true },
              { label: 'View History', icon: '📜', onClick: () => { if (graphId) { setIsVersionControlOpen(true); setActiveDropdown(null); } }, disabled: !graphId, title: graphId ? 'View version history' : 'No graph selected' },
              { label: 'Compare Versions', icon: '🔍', onClick: () => console.log('Compare versions - coming soon'), disabled: !graphId },
              { label: '— Tools —', icon: '', onClick: () => {}, disabled: true },
              { label: 'Auto-Insert Descriptions', icon: '📝', onClick: handleAutoInsertDescriptions },
              { label: 'WordNet Definitions', icon: '📚', onClick: handleWordNetAutoDescription, disabled: disabled || isWordNetLoading || !value.trim() },
              { label: 'Parse Descriptions', icon: '🧠', onClick: handleNLPParse, disabled: disabled || isNLPLoading || !value.trim() },
              { label: '— Collaboration —', icon: '', onClick: () => {}, disabled: true },
              { label: enableCollaboration ? 'Disable Live' : 'Enable Live', icon: '👥', onClick: () => { if (onCollaborationToggle) onCollaborationToggle(!enableCollaboration); }, disabled: !(graphId && userId) },
              { label: 'Share (View link)', icon: '🔗', onClick: async () => {
                  if (!graphId) return;
                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`/api/collab/${graphId}/invite`, {
                      method: 'POST',
                      headers: token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ role: 'view' })
                    });
                    if (res.ok) {
                      const { token: inviteToken } = await res.json();
                      const link = `${window.location.origin}/#collab:${inviteToken}:${graphId}`;
                      await navigator.clipboard.writeText(link);
                      alert('View link copied to clipboard');
                    } else {
                      alert('Failed to create view link');
                    }
                  } catch (e) {
                    alert('Error creating view link');
                  }
                }, disabled: !graphId },
              { label: 'Share (Edit link)', icon: '✍️', onClick: async () => {
                  if (!graphId) return;
                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`/api/collab/${graphId}/invite`, {
                      method: 'POST',
                      headers: token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ role: 'edit' })
                    });
                    if (res.ok) {
                      const { token: inviteToken } = await res.json();
                      const link = `${window.location.origin}/#collab:${inviteToken}:${graphId}`;
                      await navigator.clipboard.writeText(link);
                      alert('Edit link copied to clipboard');
                    } else {
                      alert('Failed to create edit link');
                    }
                  } catch (e) {
                    alert('Error creating edit link');
                  }
                }, disabled: !graphId },
              { label: '— Collaboration —', icon: '', onClick: () => {}, disabled: true },
              { label: enableCollaboration ? 'Disable Live' : 'Enable Live', icon: '👥', onClick: () => { if (onCollaborationToggle) onCollaborationToggle(!enableCollaboration); }, disabled: !(graphId && userId) }
            ]}
          />

          {/* Edit Status Display */}
          {editStatus && (
            <div className="edit-status-display">
              <span 
                className={`status-indicator ${editStatus.isModified ? 'modified' : 'saved'}`}
                aria-label={editStatus.isModified ? 'Modified' : 'Saved'}
              >
                {editStatus.isModified ? '⚠️' : '✅'}
              </span>
            </div>
          )}

          {/* Iconized Undo/Redo */}
          <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
            <button
              className="toolbar-icon-btn"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Undo (Ctrl+Z)"
            >
              ↩️
            </button>
            <button
              className="toolbar-icon-btn"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo (Ctrl+Y)"
            >
              ↪️
            </button>
          </div>

          {/* Primary Actions - now inside toolbar-left for horizontal layout */}
          {onSave && (
            <button 
              className="toolbar-btn primary-btn save-btn"
              onClick={() => {
                console.log('Save button clicked, calling onSave');
                onSave();
              }}
              disabled={disabled || !value.trim()}
              title="Save CNL changes (Ctrl+S)"
              style={{
                padding: '6px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                marginRight: '4px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: '#fff',
                cursor: 'pointer',
                color: '#333'
              }}
            >
              💾
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
            style={{
              padding: '6px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              marginRight: '4px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: '#fff',
              cursor: 'pointer',
              color: '#333'
            }}
          >
            🚀
          </button>
          
          {onClose && (
            <button 
              className="toolbar-btn secondary-btn"
              onClick={() => {
                console.log('Close button clicked, calling onClose');
                onClose();
              }}
              title="Close and return to Dashboard"
              style={{
                padding: '6px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                marginRight: '4px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: '#fff',
                cursor: 'pointer',
                color: '#333'
              }}
            >
              🏠
            </button>
          )}
        </div>
      </div>

      {/* CodeMirror CNL Editor */}
      <div className="cnl-editor-main">
        {( (enableCollaboration || typeof window !== 'undefined' && !!localStorage.getItem('collabToken')) ) && graphId && userId ? (
          <CollaborativeCNLEditor
            value={value}
            onChange={onChange}
            onAutoSave={undefined}
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
