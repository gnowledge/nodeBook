import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import { cnl } from './cnl-language';
import { markdown } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { autocompletion } from '@codemirror/autocomplete';

// Y.js imports
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

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
  onAutoSave,
  language = 'cnl',
  placeholder = 'Start typing...',
  readOnly = false,
  className = '',
  nodeTypes = [],
  relationTypes = [],
  attributeTypes = [],
  graphId,
  userId,
  userName = 'Anonymous'
}: CollaborativeCNLEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<Array<{ name: string; color: string }>>([]);
  const [localValue, setLocalValue] = useState(value);

  // Initialize Y.js document and WebRTC provider
  useEffect(() => {
    if (!graphId || !userId) return;

    // Clean up any existing instances first
    if (providerRef.current) {
      try {
        providerRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying provider:', error);
      }
      providerRef.current = null;
    }
    if (ydocRef.current) {
      try {
        ydocRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying ydoc:', error);
      }
      ydocRef.current = null;
    }

    // Create Y.js document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Create WebRTC provider with room name based on graphId
    const provider = new WebrtcProvider(`nodebook-graph-${graphId}`, ydoc, {
      signaling: ['ws://localhost:4444'], // Local signaling server
      password: null, // No password for now
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
    
    // Listen for remote changes
    yText.observe((event: any) => {
      const newValue = yText.toString();
      if (newValue !== localValue) {
        setLocalValue(newValue);
        onChange(newValue);
      }
    });

    // Set initial content
    if (value && yText.length === 0) {
      yText.insert(0, value);
    }

    // Cleanup function
    return () => {
      if (provider) {
        try {
          provider.destroy();
        } catch (error) {
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
  }, [graphId, userId, userName, value, onChange, localValue]);

  // Initialize CodeMirror editor
  useEffect(() => {
    if (!editorRef.current) return;

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
        default:
        languageSupport = cnl();
    }

    // Create editor state with minimal extensions
    const extensions = [
      lineNumbers(),
      languageSupport,
      autocompletion({ 
        override: [createCompletion(language, nodeTypes, relationTypes, attributeTypes)],
        activateOnTyping: true,
        defaultKeymap: true,
        maxRenderedOptions: 10
      }),
      keymap.of([indentWithTab]),
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
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString();
          setLocalValue(newValue);
          onChange(newValue);
          
          // Auto-save if callback provided
          if (onAutoSave) {
            onAutoSave(newValue);
          }
          
          // Update Y.js document if available
          if (ydocRef.current) {
            const yText = ydocRef.current.getText('content');
            const currentYText = yText.toString();
            if (newValue !== currentYText) {
              yText.delete(0, yText.length);
              yText.insert(0, newValue);
            }
          }
        }
      }),
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
  }, [language, nodeTypes, relationTypes, attributeTypes, readOnly, onChange, onAutoSave, localValue]);

  // Update editor content when value prop changes (from external sources)
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value, localValue]);

  return (
    <div className={`collaborative-cnl-editor ${className}`}>
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
