import React, { useEffect, useState } from 'react';
import { CNLEditor } from './CNLEditorComponent';
import { CollaborativeCNLEditor } from './CollaborativeCNLEditor';
import type { RelationType, AttributeType, NodeType } from './types';
import { VersionControl } from './components/VersionControl';
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
  // Version control props
  isVersionControlOpen?: boolean;
  onVersionControlOpen?: () => void;
  onVersionControlClose?: () => void;
}

export function CnlEditor({ value, onChange, onSubmit, onSave, onAutoSave, onClose, disabled, nodeTypes, relationTypes, attributeTypes, graphId, editStatus, enableCollaboration = false, userId, userName, onCollaborationToggle, editorLanguage = 'cnl', graphMode = 'richgraph', onGraphModeChange, isVersionControlOpen = false, onVersionControlOpen, onVersionControlClose }: CnlEditorProps) {
  // Debug logging
  console.log('[CnlEditor] Props:', { value, valueLength: value?.length, disabled, graphId });
  
  // Undo functionality
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  

  




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


  return (
    <div className="cnl-editor-container">
      {/* Editor Toolbar */}
      <div className="cnl-editor-toolbar">
        <div className="toolbar-left">

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


      {/* Version Control Panel */}
      {graphId && (
        <VersionControl
          graphId={graphId}
          isOpen={isVersionControlOpen}
          onClose={() => onVersionControlClose && onVersionControlClose()}
        />
      )}
    </div>
  );
}
