import React, { useEffect, useRef, useState } from 'react';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import { cnl, cnlHighlightStyle } from './cnl-language';
import { markdown } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';

import { autocompletion } from '@codemirror/autocomplete';

interface CNLEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'cnl' | 'markdown' | 'javascript' | 'json';
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

// CNL Auto-completion
const cnlCompletions = [
  // Node syntax
  { label: 'Node Heading', type: 'snippet', apply: '# NodeName [Type]\n```description\nDescription here\n```\n' },
  { label: 'Graph Description', type: 'snippet', apply: '```graph-description\nGraph description here\n```\n' },
  
  // Relations
  { label: 'is a', type: 'keyword', apply: '<is a> Target;' },
  { label: 'located in', type: 'keyword', apply: '<located in> Target;' },
  { label: 'works for', type: 'keyword', apply: '<works for> Target;' },
  { label: 'has', type: 'keyword', apply: 'has attribute: value;' },
  
  // Attributes
  { label: 'has mass', type: 'snippet', apply: 'has mass: ++approximately++ value *kg* [certain];' },
  { label: 'has color', type: 'snippet', apply: 'has color: *color* [observed];' },
  { label: 'has temperature', type: 'snippet', apply: 'has temperature: ++roughly++ value *K* [measured];' },
  { label: 'has population', type: 'snippet', apply: 'has population: *some* value *billion* [estimated];' },
  
  // Modifiers
  { label: 'approximately', type: 'modifier', apply: '++approximately++' },
  { label: 'roughly', type: 'modifier', apply: '++roughly++' },
  { label: 'certain', type: 'modality', apply: '[certain]' },
  { label: 'observed', type: 'modality', apply: '[observed]' },
  { label: 'measured', type: 'modality', apply: '[measured]' },
  { label: 'estimated', type: 'modality', apply: '[estimated]' },
  
  // Units
  { label: 'kg', type: 'unit', apply: '*kg*' },
  { label: 'K', type: 'unit', apply: '*K*' },
  { label: 'billion', type: 'unit', apply: '*billion*' },
  { label: 'meters', type: 'unit', apply: '*m*' },
  { label: 'seconds', type: 'unit', apply: '*s*' }
];

// Auto-completion function
function cnlCompletion(context: any) {
  let word = context.matchBefore(/\w*/);
  if (!word) return null;
  
  return {
    from: word.from,
    options: cnlCompletions.filter(completion => 
      completion.label.toLowerCase().includes(word.text.toLowerCase())
    )
  };
}

export function CNLEditor({ 
  value, 
  onChange, 
  language = 'cnl', 
  placeholder = 'Start typing your CNL...',
  readOnly = false,
  className = ''
}: CNLEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [showMarkdownToolbar, setShowMarkdownToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!editorRef.current) return;

    // Determine language support
    let languageSupport;
    switch (language) {
      case 'cnl':
        languageSupport = cnl();
        break;
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
    }

    // Create editor state
    const state = EditorState.create({
      doc: value || placeholder,
      extensions: [
        // Basic editor features
        lineNumbers(),
        
        // Language support
        languageSupport,
        
        // Keymaps
        keymap.of([
          indentWithTab,
          // Ctrl+Space for auto-completion
          { key: 'Ctrl-Space', run: (view) => {
            // Simple approach: just show the completion dropdown
            // This will work with the existing autocompletion setup
            return false; // Let the default handler deal with it
          }},
          // Markdown shortcuts
          { key: 'Ctrl-b', run: (view) => { insertMarkdown('**', '**'); return true; }},
          { key: 'Ctrl-i', run: (view) => { insertMarkdown('*', '*'); return true; }},
          { key: 'Ctrl-k', run: (view) => { insertMarkdownBlock('link'); return true; }},
          { key: 'Ctrl-l', run: (view) => { insertMarkdownBlock('list'); return true; }},
          { key: 'Ctrl-q', run: (view) => { insertMarkdownBlock('quote'); return true; }},
          { key: 'Ctrl-`', run: (view) => { insertMarkdown('`', '`'); return true; }}
        ]),
        
        // Update listener
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !readOnly) {
            onChange(update.state.doc.toString());
          }
        }),
        
        // Click listener for markdown toolbar
        EditorView.domEventHandlers({
          click: (event, view) => {
            // Check if we're in a description block
            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
            if (pos !== null) {
              const line = view.state.doc.lineAt(pos);
              const lineText = line.text;
              
              // Find if we're inside a description block (not on the opening/closing lines)
              let inDescriptionBlock = false;
              let descriptionStart = -1;
              
              // Look backwards to find the start of description block
              for (let i = line.number - 1; i >= 1; i--) {
                const prevLine = view.state.doc.line(i);
                if (prevLine.text.trim() === '```description') {
                  descriptionStart = i;
                  break;
                } else if (prevLine.text.trim() === '```' && !prevLine.text.includes('description')) {
                  // Found a code block, but not description
                  break;
                }
              }
              
              // Look forwards to find the end of description block
              if (descriptionStart > 0) {
                for (let i = descriptionStart + 1; i <= view.state.doc.lines; i++) {
                  const nextLine = view.state.doc.line(i);
                  if (nextLine.text.trim() === '```') {
                    // We're inside a description block
                    if (line.number > descriptionStart && line.number < i) {
                      inDescriptionBlock = true;
                    }
                    break;
                  }
                }
              }
              
              // Show toolbar only if we're inside a description block (not on the boundary lines)
              if (inDescriptionBlock && lineText.trim() !== '```description' && lineText.trim() !== '```') {
                const coords = view.coordsAtPos(pos);
                if (coords) {
                  setToolbarPosition({ 
                    top: coords.top + window.scrollY, 
                    left: coords.left + window.scrollX 
                  });
                  setShowMarkdownToolbar(true);
                }
              } else {
                // Hide toolbar if we're not in a description block
                setShowMarkdownToolbar(false);
              }
            }
          }
        }),
        
        // Editor theme
        EditorView.theme({
          '&': {
            fontSize: '14px',
            height: '100%'
          },
          '.cm-content': {
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            padding: '16px'
          },
          '.cm-scroller': {
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
          }
        }),
        
        // Apply CNL highlighting for CNL language
        ...(language === 'cnl' ? [EditorView.theme(cnlHighlightStyle)] : []),
        
        // Auto-completion for CNL
        ...(language === 'cnl' ? [
          autocompletion({ 
            override: [cnlCompletion],
            activateOnTyping: true, // Show automatically as you type
            defaultKeymap: false // Disable default Enter behavior
          }),
          // Custom keymap for Tab selection instead of Enter
          keymap.of([
            { key: 'Tab', run: (view) => {
              // Check if completion is active
              const completion = view.state.facet(autocompletion);
              if (completion.length > 0) {
                // Use Tab to select completion
                return false; // Let the default Tab handler work for completion
              }
              // Normal Tab indentation when no completion
              return indentWithTab(view);
            }},
            // Keep Shift+Tab for outdent
            { key: 'Shift-Tab', run: (view) => {
              // Outdent logic
              const { from, to } = view.state.selection;
              const line = view.state.doc.lineAt(from);
              const indent = line.text.match(/^\s*/)[0];
              if (indent.length > 0) {
                const newIndent = indent.slice(2); // Remove 2 spaces
                view.dispatch({
                  changes: { from: line.from, to: line.from + indent.length, insert: newIndent }
                });
                return true;
              }
              return false;
            }}
          ])
        ] : []),
        
        // Custom light theme
        EditorView.theme({
          '&': {
            fontSize: '14px',
            height: '100%'
          },
          '.cm-content': {
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            padding: '16px',
            color: '#333',
            backgroundColor: '#ffffff'
          },
          '.cm-scroller': {
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
          },
          '.cm-line': {
            color: '#333'
          },
          '.cm-cursor': {
            borderLeftColor: '#333'
          },
          '.cm-selectionBackground': {
            backgroundColor: '#b3d4fc'
          },
          '.cm-lineNumbers': {
            color: '#999'
          },
          '.cm-activeLine': {
            backgroundColor: '#f8f9fa'
          },
          // Auto-completion dropdown styling
          '.cm-tooltip.cm-tooltip-autocomplete': {
            backgroundColor: '#ffffff',
            border: '1px solid #ddd',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          },
          '.cm-tooltip.cm-tooltip-autocomplete > ul': {
            backgroundColor: '#ffffff'
          },
          '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
            color: '#333',
            backgroundColor: '#ffffff'
          },
          '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
            backgroundColor: '#e3f2fd',
            color: '#1976d2'
          },
          '.cm-tooltip.cm-tooltip-autocomplete > ul > li:hover': {
            backgroundColor: '#f5f5f5'
          }
        }),
        
        // Read-only mode
        ...(readOnly ? [EditorState.readOnly.of(true)] : [])
      ]
    });

    // Create editor view
    const view = new EditorView({
      state,
      parent: editorRef.current
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [language, readOnly]);

  // Update content when value changes externally
  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      const transaction = viewRef.current.state.update({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value
        }
      });
      viewRef.current.dispatch(transaction);
    }
  }, [value]);

  // Markdown formatting functions
  const insertMarkdown = (before: string, after: string = '') => {
    if (!viewRef.current) return;
    
    const { from, to } = viewRef.current.state.selection;
    const selectedText = viewRef.current.state.sliceDoc(from, to);
    const newText = before + selectedText + after;
    
    viewRef.current.dispatch({
      changes: { from, to, insert: newText },
      selection: { anchor: from + before.length, head: from + before.length + selectedText.length }
    });
  };

  const insertMarkdownBlock = (blockType: string) => {
    if (!viewRef.current) return;
    
    const { from } = viewRef.current.state.selection;
    const line = viewRef.current.state.doc.lineAt(from);
    const lineStart = line.from;
    
    let insertText = '';
    switch (blockType) {
      case 'heading':
        insertText = '## Section Heading';
        break;
      case 'bold':
        insertText = '**bold text**';
        break;
      case 'italic':
        insertText = '*italic text*';
        break;
      case 'code':
        insertText = '`code`';
        break;
      case 'link':
        insertText = '[link text](url)';
        break;
      case 'list':
        insertText = '- list item';
        break;
      case 'numbered':
        insertText = '1. numbered item';
        break;
      case 'quote':
        insertText = '> quoted text';
        break;
      case 'codeblock':
        insertText = '```\ncode block\n```';
        break;
    }
    
    viewRef.current.dispatch({
      changes: { from: lineStart, insert: insertText + '\n' },
      selection: { anchor: lineStart + insertText.length, head: lineStart + insertText.length }
    });
  };

  return (
    <div className="cnl-editor-wrapper" style={{ position: 'relative', height: '100%' }}>
      {/* Markdown Toolbar */}
      {showMarkdownToolbar && (
        <div 
          className="markdown-toolbar"
          style={{
            position: 'absolute',
            top: toolbarPosition.top - 50,
            left: toolbarPosition.left,
            zIndex: 1000,
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '8px',
            display: 'flex',
            gap: '4px',
            flexWrap: 'wrap',
            maxWidth: '400px'
          }}
        >
          {/* Text Formatting */}
          <button
            onClick={() => insertMarkdown('**', '**')}
            title="Bold (Ctrl+B)"
            style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#333' }}
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => insertMarkdown('*', '*')}
            title="Italic (Ctrl+I)"
            style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#333' }}
          >
            <em>I</em>
          </button>
          <button
            onClick={() => insertMarkdown('`', '`')}
            title="Inline Code"
            style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#333' }}
          >
            <code>code</code>
          </button>
          
          {/* Section Heading */}
          <button
            onClick={() => insertMarkdownBlock('heading')}
            title="Section Heading"
            style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#333' }}
          >
            # Heading
          </button>
          
          {/* Block Elements */}
          <button
            onClick={() => insertMarkdownBlock('list')}
            title="Unordered List"
            style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#333' }}
          >
            • List
          </button>
          <button
            onClick={() => insertMarkdownBlock('numbered')}
            title="Ordered List"
            style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#333' }}
          >
            1. List
          </button>
          <button
            onClick={() => insertMarkdownBlock('quote')}
            title="Blockquote"
            style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#333' }}
          >
            Quote
          </button>
          <button
            onClick={() => insertMarkdownBlock('codeblock')}
            title="Code Block"
            style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#333' }}
          >
            Code
          </button>
          
          {/* Links and Media */}
          <button
            onClick={() => insertMarkdownBlock('link')}
            title="Link"
            style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#333' }}
          >
            🔗
          </button>
          
          {/* Close Button */}
          <button
            onClick={() => setShowMarkdownToolbar(false)}
            style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#f3f4f6', cursor: 'pointer', marginLeft: 'auto', color: '#dc2626', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}
      
      <div 
        ref={editorRef} 
        className={`cnl-editor ${className}`}
        style={{ 
          height: '100%', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      />
    </div>
  );
}
