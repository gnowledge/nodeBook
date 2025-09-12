import { useEffect, useRef, useState } from 'react';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState, EditorSelection } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import { cnl } from './cnl-language';
import { markdown } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { autocompletion } from '@codemirror/autocomplete';

// Y.js imports
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { yCollab } from 'y-codemirror.next';

interface CollaborativeCNLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onAutoSave?: (value: string) => void;
  language?: 'cnl' | 'markdown' | 'javascript' | 'json';
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  nodeTypes?: any[];
  relationTypes?: any[];
  attributeTypes?: any[];
  graphId: string; // Required for room identification
  userId: string; // Required for user awareness
  userName?: string; // Optional user display name
  onInsertText?: (insertFunction: (text: string) => void) => void;
}

// CNL Auto-completion (same as original)
const cnlCompletions = [
  // Node syntax
  { label: 'Node Heading', type: 'snippet', apply: '# NodeName [Type]\n```description\nDescription here\n```\n' },
  { label: 'Graph Description', type: 'snippet', apply: '```graph-description\nGraph description here\n```\n' },
  
  // Relation syntax
  { label: 'Relation', type: 'snippet', apply: '< RelationName >\n' },
  { label: 'Attribute', type: 'snippet', apply: 'has AttributeName: value\n' },
  
  // Description blocks
  { label: 'Description Block', type: 'snippet', apply: '```description\nDescription content\n```\n' },
  { label: 'Graph Description Block', type: 'snippet', apply: '```graph-description\nGraph description content\n```\n' },
];

// Markdown Auto-completion
const markdownCompletions = [
  // Headers
  { label: 'H1', type: 'header', apply: '# ', info: 'Header 1' },
  { label: 'H2', type: 'header', apply: '## ', info: 'Header 2' },
  { label: 'H3', type: 'header', apply: '### ', info: 'Header 3' },
  { label: 'H4', type: 'header', apply: '#### ', info: 'Header 4' },
  { label: 'H5', type: 'header', apply: '##### ', info: 'Header 5' },
  { label: 'H6', type: 'header', apply: '###### ', info: 'Header 6' },
  
  // Text formatting
  { label: 'Bold', type: 'text', apply: '**text**', info: 'Bold text' },
  { label: 'Italic', type: 'text', apply: '*text*', info: 'Italic text' },
  { label: 'Strikethrough', type: 'text', apply: '~~text~~', info: 'Strikethrough text' },
  { label: 'Inline Code', type: 'code', apply: '`code`', info: 'Inline code' },
  
  // Lists
  { label: 'Bullet List', type: 'list', apply: '- ', info: 'Bullet list item' },
  { label: 'Numbered List', type: 'list', apply: '1. ', info: 'Numbered list item' },
  { label: 'Task List', type: 'list', apply: '- [ ] ', info: 'Task list item' },
  { label: 'Completed Task', type: 'list', apply: '- [x] ', info: 'Completed task' },
  
  // Links and media
  { label: 'Link', type: 'link', apply: '[text](url)', info: 'Create a link' },
  { label: 'Image', type: 'image', apply: '![alt](url)', info: 'Insert an image' },
  { label: 'Reference Link', type: 'link', apply: '[text][ref]\n\n[ref]: url', info: 'Reference-style link' },
  
  // Code blocks
  { label: 'Code Block', type: 'code', apply: '```\ncode here\n```\n', info: 'Code block' },
  { label: 'JavaScript Code', type: 'code', apply: '```javascript\n// code here\n```\n', info: 'JavaScript code block' },
  { label: 'JSON Code', type: 'code', apply: '```json\n{\n  "key": "value"\n}\n```\n', info: 'JSON code block' },
  { label: 'Python Code', type: 'code', apply: '```python\n# code here\n```\n', info: 'Python code block' },
  
  // Tables
  { label: 'Table', type: 'table', apply: '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n', info: 'Create a table' },
  
  // Horizontal rule
  { label: 'Horizontal Rule', type: 'separator', apply: '---\n', info: 'Horizontal rule' },
  
  // Blockquotes
  { label: 'Blockquote', type: 'quote', apply: '> ', info: 'Blockquote' },
  { label: 'Nested Blockquote', type: 'quote', apply: '>> ', info: 'Nested blockquote' },
];

// Smart context-aware auto-completion function
function createCompletion(language: string, nodeTypes: any[] | null = [], relationTypes: any[] | null = [], attributeTypes: any[] | null = []) {
  return function completion(context: any) {
    const { state, pos } = context;
    const line = state.doc.lineAt(pos);
    const lineText = line.text;
    const beforeCursor = lineText.slice(0, pos - line.from);
    const cursorPos = pos - line.from;
    
    // Get the word being typed - only trigger on meaningful input
    let word = context.matchBefore(/\w+/);
    if (!word || word.text.length < 2) return null; // Require at least 2 characters
    
    // Get completions based on language
    let completions = language === 'cnl' ? cnlCompletions : markdownCompletions;
    
    // First column context-aware suggestions
    if (beforeCursor.trim() === '') {
      if (language === 'cnl') {
        // CNL first column suggestions
        const firstColumnCompletions = [
          { label: '#', type: 'keyword', apply: '# ', info: 'Node heading' },
          { label: '<', type: 'keyword', apply: '< ', info: 'Relation' },
          { label: 'has', type: 'keyword', apply: 'has ', info: 'Attribute' },
          { label: '```description', type: 'block', apply: '```description\n', info: 'Description block' },
          { label: '```graph-description', type: 'block', apply: '```graph-description\n', info: 'Graph description block' }
        ];
        
        // Add node types if available
        if (nodeTypes && nodeTypes.length > 0) {
          nodeTypes.forEach(nodeType => {
            firstColumnCompletions.push({
              label: `[${nodeType.name}]`,
              type: 'type',
              apply: `[${nodeType.name}] `,
              info: `Node type: ${nodeType.description || nodeType.name}`
            });
          });
        }
        
        return {
          from: pos,
          options: firstColumnCompletions
        };
      } else {
        // Markdown first column suggestions
        return {
          from: pos,
          options: markdownCompletions.filter(comp => 
            comp.type === 'header' || comp.type === 'list' || comp.type === 'quote'
          )
        };
      }
    }
    
    // Language-specific logic
    if (language === 'cnl') {
      // CNL-specific logic
      const hasSemicolon = lineText.includes(';');
      if (hasSemicolon) return null; // Stop auto-completion for completed statements
      
      // Don't trigger completion if user is just typing at end of line
      if (cursorPos === line.length && lineText.trim() !== '') {
        return null;
      }
      
      // CNL completions for other contexts - only show if user is actively typing a word
      const filtered = cnlCompletions.filter(completion => 
        completion.label.toLowerCase().includes(word.text.toLowerCase()) &&
        word.text.length >= 2 // Only show if user has typed at least 2 characters
      );
      
      // Limit completions to avoid overwhelming the user
      if (filtered.length > 5) {
        filtered.splice(5); // Only show first 5 matches
      }
      
      return {
        from: word.from,
        options: filtered.map(completion => ({
          label: completion.label,
          type: completion.type,
          apply: completion.apply
        }))
      };
    }
    
    // Context-specific suggestions based on what user is typing
    if (language === 'cnl') {
      // Node type suggestions after #
      if (beforeCursor.match(/#\s+\w+\s*$/)) {
        if (nodeTypes && nodeTypes.length > 0) {
          return {
            from: pos,
            options: nodeTypes.map(nodeType => ({
              label: `[${nodeType.name}]`,
              type: 'type',
              apply: `[${nodeType.name}] `,
              info: `Node type: ${nodeType.description || nodeType.name}`
            }))
          };
        }
      }
      
      // Relation suggestions after <
      if (beforeCursor.match(/<\s*$/)) {
        if (relationTypes && relationTypes.length > 0) {
          return {
            from: pos,
            options: relationTypes.map(relType => ({
              label: `${relType.name}>`,
              type: 'relation',
              apply: `${relType.name}> `,
              info: `Relation: ${relType.description || relType.name}`
            }))
          };
        }
      }
      
      // Attribute suggestions after has
      if (beforeCursor.match(/has\s+$/)) {
        if (attributeTypes && attributeTypes.length > 0) {
          return {
            from: pos,
            options: attributeTypes.map(attrType => ({
              label: `${attrType.name}: `,
              type: 'attribute',
              apply: `${attrType.name}: `,
              info: `Attribute: ${attrType.description || attrType.name}`
            }))
          };
        }
      }
    }
    
    // Stop auto-completion when user types semicolon
    if (beforeCursor.includes(';')) {
      return null;
    }
    
    // Default completions
    return {
      from: pos,
      options: completions
    };
  };
}

export function CollaborativeCNLEditor({
  value,
  onChange,
  /* onAutoSave intentionally not used in live mode */
  language = 'cnl',
  /* placeholder unused */
  readOnly = false,
  className = '',
  nodeTypes = [],
  relationTypes = [],
  attributeTypes = [],
  graphId,
  userId,
  userName = 'Anonymous',
  onInsertText
}: CollaborativeCNLEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<Array<{ name: string; color: string }>>([]);
  const [localValue, setLocalValue] = useState(value);
  const [showSectionControls, setShowSectionControls] = useState(false);
  const [currentSectionLevel, setCurrentSectionLevel] = useState(0);
  const isApplyingRemoteRef = useRef(false);

  // Initialize Y.js document and WebRTC provider
  useEffect(() => {
    if (!graphId || !userId) return;

    // Clean up any existing instances first
    try {
      if (providerRef.current) {
        providerRef.current.destroy();
      }
    } catch (error) {
      console.warn('Error destroying provider:', error);
    } finally {
      providerRef.current = null;
    }
    try {
      if (ydocRef.current) {
        ydocRef.current.destroy();
      }
    } catch (error) {
      console.warn('Error destroying ydoc:', error);
    } finally {
      ydocRef.current = null;
    }

    // Create Y.js document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Create WebRTC provider with room name based on graphId
    const signalingUrl = (import.meta as any).env?.VITE_SIGNALING_URL || (window.location.protocol === 'https:'
      ? `wss://${window.location.host}/signaling`
      : 'ws://localhost:4444');
    const room = `nodebook-graph-${graphId}`;
    const provider = new WebrtcProvider(room, ydoc, {
      signaling: [signalingUrl]
    });

    providerRef.current = provider;

    // Set up awareness (user presence)
    provider.awareness.setLocalState({
      user: {
        name: userName,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`
      }
    });

    // Listen for connection status
    provider.on('status', (event: any) => {
      setIsConnected(event.status === 'connected');
    });

    // Listen for awareness changes (connected users)
    provider.awareness.on('change', () => {
      const states = Array.from(provider.awareness.getStates().values())
        .map((state: any) => state.user)
        .filter(Boolean);
      setConnectedUsers(states);
    });

    // Set up Y.js text synchronization
    const yText = ydoc.getText('content');
    
    // yCollab handles remote changes and selection; no manual observer needed

    // Set initial content
    if (value && yText.length === 0) {
      yText.insert(0, value);
    }

    // Cleanup function
    return () => {
      if (provider) {
        try { provider.disconnect(); } catch {}
        try { provider.destroy(); } catch (error) {
          console.warn('Error destroying provider in cleanup:', error);
        }
      }
      if (ydoc) {
        try {
          ydoc.destroy();
        } catch (error) {
          console.warn('Error destroying ydoc in cleanup:', error);
        }
      }
    };
  }, [graphId, userId, userName]);

  // Initialize CodeMirror editor
  useEffect(() => {
    if (!editorRef.current) return;
    const ydoc = ydocRef.current;
    const provider = providerRef.current;
    if (!ydoc || !provider) return;

    // Create language support
    let languageSupport;
    switch (language) {
      case 'markdown':
        languageSupport = markdown();
        break;
      case 'javascript':
        languageSupport = javascript();
        break;
      case 'json':
        languageSupport = json();
        break;
      default:
        languageSupport = cnl();
        break;
    }

    // Create editor state with collab binding
    const yText = ydoc.getText('content');
    const extensions = [
      lineNumbers(),
      languageSupport,
      autocompletion({ 
        override: [createCompletion(language, nodeTypes, relationTypes, attributeTypes)],
        activateOnTyping: true, // Show automatically as you type
        defaultKeymap: true,
        maxRenderedOptions: 10,
        closeOnBlur: true, // Close completion when editor loses focus
        activateOnTypingDelay: 300, // Delay before showing completions when typing
      }),
      keymap.of([
        // Tab for normal indentation
        { key: 'Tab', run: indentWithTab },
        
        
        // Enter key behavior - prevent unwanted autocompletion
        { key: 'Enter', run: (view) => {
          // Check if completion is active and user wants to select it
          const completion = view.state.facet(autocompletion);
          if (completion.length > 0) {
            // Let the default Enter handler work for completion selection
            return false;
          }
          
          // Normal Enter behavior - just insert newline
          const { from, to } = view.state.selection;
          const line = view.state.doc.lineAt(from);
          const lineText = line.text;
          const cursorPos = from - line.from;
          
          // Check if we're at the end of a line
          if (cursorPos === line.length) {
            // Get current indentation to maintain it on new line
            const indentMatch = lineText.match(/^(\s*)/);
            const currentIndent = indentMatch ? indentMatch[1] : '';
            
            // Insert newline with same indentation
            view.dispatch({
              changes: { from, to, insert: '\n' + currentIndent }
            });
            return true;
          }
          
          // Default Enter behavior
          return false;
        }},
        
        // Ctrl+Space for auto-completion
        { key: 'Ctrl-Space', run: (view) => {
          return false; // Let the default handler deal with it
        }}
      ]),
      
      // Update listener for section level tracking
      EditorView.updateListener.of((update) => {
        // Update section level when cursor moves
        if (update.selectionSet) {
          const level = getCurrentSectionLevel();
          setCurrentSectionLevel(level);
        }
      }),
      EditorView.theme({
        '&': {
          fontSize: '14px',
          fontFamily: '"Fira Code", "JetBrains Mono", "Consolas", monospace'
        },
        '.cm-content': {
          padding: '12px',
          minHeight: '200px',
          backgroundColor: '#ffffff',
          color: '#333333'
        },
        '.cm-focused': {
          outline: 'none'
        },
        '.cm-editor': {
          backgroundColor: '#ffffff',
          border: '1px solid #e1e5e9',
          borderRadius: '6px'
        },
        '.cm-scroller': {
          fontFamily: '"Fira Code", "JetBrains Mono", "Consolas", monospace'
        }
      }),
      yCollab(yText, provider.awareness as any, { undoManager: false }),
      readOnly ? EditorView.editable.of(false) : []
    ];

    const state = EditorState.create({
      doc: localValue,
      extensions: extensions
    });

    // Create editor view
    const view = new EditorView({
      state,
      parent: editorRef.current
    });

    viewRef.current = view;

    // Cleanup function
    return () => {
      if (view) {
        try {
          view.destroy();
        } catch (error) {
          console.warn('Error destroying view:', error);
        }
      }
    };
  }, [language, nodeTypes, relationTypes, attributeTypes, readOnly, onChange, localValue]);

  // Update editor content when value prop changes (from external sources)
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value, localValue]);

  // Section level detection and control functions
  const getCurrentSectionLevel = () => {
    const view = viewRef.current;
    if (!view) return 0;
    
    const state = view.state;
    const fromPos = Math.max(0, Math.min(state.selection.main.from, state.doc.length));
    const line = state.doc.lineAt(fromPos);
    const lineText = line.text;
    
    // Check if cursor is on a line with section markup
    const sectionMatch = lineText.match(/^(#+)/);
    const level = sectionMatch ? sectionMatch[1].length : 0;
    
    // Update state if it changed
    if (level !== currentSectionLevel) {
      setCurrentSectionLevel(level);
    }
    
    return level;
  };

  const insertSectionLevel = (level: number) => {
    const view = viewRef.current;
    if (!view || readOnly) return;
    
    try {
      view.focus();
      const state = view.state;
      const fromPos = Math.max(0, Math.min(state.selection.main.from, state.doc.length));
      const line = state.doc.lineAt(fromPos);
      const lineStart = Math.max(0, Math.min(line.from, state.doc.length));
      const lineText = line.text;
      
      // Get current section level
      const sectionMatch = lineText.match(/^(#+)/);
      const currentLevel = sectionMatch ? sectionMatch[1].length : 0;
      
      // Calculate new section level
      const newLevel = Math.max(0, Math.min(level, 8)); // Max 8 levels
      const sectionMarkup = newLevel > 0 ? '#'.repeat(newLevel) + ' ' : '';
      
      // Replace existing section markup or insert new
      if (sectionMatch) {
        // Replace existing section markup
        view.dispatch({
          changes: { 
            from: lineStart, 
            to: lineStart + sectionMatch[1].length, 
            insert: sectionMarkup 
          }
        });
      } else {
        // Insert new section markup at beginning of line
        view.dispatch({
          changes: { 
            from: lineStart, 
            to: lineStart, 
            insert: sectionMarkup 
          }
        });
      }
      
      // Hide section controls after action
      setShowSectionControls(false);
    } catch (err) {
      console.error('Failed to insert section level', err);
    }
  };

  const handleSectionButtonClick = () => {
    const currentLevel = getCurrentSectionLevel();
    
    if (currentLevel === 0) {
      // No section markup - insert single #
      insertSectionLevel(1);
    } else {
      // Has section markup - show controls
      setShowSectionControls(!showSectionControls);
    }
  };

  // Click outside handler to close section controls
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSectionControls && editorRef.current && !editorRef.current.contains(event.target as Node)) {
        setShowSectionControls(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSectionControls]);

  // Handle external text insertion
  useEffect(() => {
    if (onInsertText && viewRef.current) {
      console.log('CollaborativeCNLEditor: Setting up text insertion function');
      const insertText = (text: string) => {
        console.log('CollaborativeCNLEditor: insertText called with:', text);
        const view = viewRef.current;
        if (!view) return;
        
        const state = view.state;
        const fromPos = Math.max(0, Math.min(state.selection.main.from, state.doc.length));
        
        view.dispatch({
          changes: { from: fromPos, to: fromPos, insert: text },
          selection: EditorSelection.single(fromPos + text.length, fromPos + text.length)
        });
      };
      
      // Call the onInsertText function with our insert function
      onInsertText(insertText);
    }
  }, [onInsertText]);

  return (
    <div className={`collaborative-cnl-editor ${className}`}>
      {/* Section Control Toolbar */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 1,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '6px 8px',
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px'
      }}>
        {/* Section Heading - Context Aware */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            onClick={handleSectionButtonClick}
            title="Section Heading (Click for level controls)"
            style={{ 
              padding: '4px 8px', 
              border: '1px solid #d1d5db', 
              borderRadius: '4px', 
              background: showSectionControls ? '#3b82f6' : '#fff', 
              cursor: 'pointer', 
              color: showSectionControls ? '#fff' : '#333' 
            }}
            >
              # Heading {currentSectionLevel > 0 && `(${currentSectionLevel})`}
            </button>
          
          {/* Section Level Controls Dropdown */}
          {showSectionControls && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '0',
              zIndex: 1000,
              backgroundColor: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              padding: '4px',
              display: 'flex',
              gap: '4px',
              marginTop: '2px'
            }}>
              <button
                onClick={() => insertSectionLevel(currentSectionLevel - 1)}
                title="Decrease section level"
                style={{
                  padding: '4px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  background: '#fff',
                  cursor: 'pointer',
                  color: '#333',
                  fontSize: '12px'
                }}
              >
                -
              </button>
              <span style={{
                padding: '4px 8px',
                fontSize: '12px',
                color: '#666',
                display: 'flex',
                alignItems: 'center'
              }}>
                Level {currentSectionLevel}
              </span>
              <button
                onClick={() => insertSectionLevel(currentSectionLevel + 1)}
                title="Increase section level"
                style={{
                  padding: '4px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  background: '#fff',
                  cursor: 'pointer',
                  color: '#333',
                  fontSize: '12px'
                }}
              >
                +
              </button>
              <button
                onClick={() => insertSectionLevel(0)}
                title="Remove section markup"
                style={{
                  padding: '4px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  background: '#fff',
                  cursor: 'pointer',
                  color: '#dc2626',
                  fontSize: '12px'
                }}
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Collaboration Status Bar */}
      <div className="collaboration-status" style={{
        padding: '8px 12px',
        backgroundColor: isConnected ? '#e8f5e8' : '#fff3cd',
        border: `1px solid ${isConnected ? '#c3e6c3' : '#ffeaa7'}`,
        borderRadius: '4px 4px 0 0',
        fontSize: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <span style={{ 
            color: isConnected ? '#2d5a2d' : '#856404',
            fontWeight: 'bold'
          }}>
            {isConnected ? '🟢 Connected' : '🟡 Connecting...'}
          </span>
          {connectedUsers.length > 0 && (
            <span style={{ marginLeft: '12px', color: '#666' }}>
              {connectedUsers.length} user{connectedUsers.length !== 1 ? 's' : ''} online
            </span>
          )}
        </div>
        {connectedUsers.length > 0 && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {connectedUsers.map((user, index) => (
              <span
                key={index}
                style={{
                  backgroundColor: user.color,
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}
              >
                {user.name}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Editor */}
      <div ref={editorRef} style={{ border: '1px solid #e1e5e9', borderTop: 'none' }} />
    </div>
  );
}
