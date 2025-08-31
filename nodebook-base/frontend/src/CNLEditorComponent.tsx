import React, { useEffect, useRef } from 'react';
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
          }}
        ]),
        
        // Update listener
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !readOnly) {
            onChange(update.state.doc.toString());
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
            activateOnTyping: false, // Don't show automatically
            defaultKeymap: false // Disable default Enter behavior
          })
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

  return (
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
  );
}
