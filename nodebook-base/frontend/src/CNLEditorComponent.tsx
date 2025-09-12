import React, { useEffect, useRef, useState } from 'react';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState, EditorSelection } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import { cnl, cnlHighlightStyle } from './cnl-language';
import { markdown } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';

import { autocompletion } from '@codemirror/autocomplete';

interface CNLEditorProps {
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
  onInsertText?: (insertFunction: (text: string) => void) => void;
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

// Markdown Auto-completion
const markdownCompletions = [
  // Headers
  { label: 'H1', type: 'header', apply: '# ', info: 'Header 1' },
  { label: 'H2', type: 'header', apply: '## ', info: 'Header 2' },
  { label: 'H3', type: 'header', apply: '### ', info: 'Header 3' },
  { label: 'H4', type: 'header', apply: '#### ', info: 'Header 4' },
  
  // Text formatting
  { label: 'Bold', type: 'format', apply: '**bold text**', info: 'Bold text' },
  { label: 'Italic', type: 'format', apply: '*italic text*', info: 'Italic text' },
  { label: 'Code', type: 'format', apply: '`code`', info: 'Inline code' },
  { label: 'Strikethrough', type: 'format', apply: '~~strikethrough~~', info: 'Strikethrough text' },
  
  // Lists
  { label: 'Unordered List', type: 'list', apply: '- List item\n- Another item\n- Third item', info: 'Unordered list' },
  { label: 'Ordered List', type: 'list', apply: '1. First item\n2. Second item\n3. Third item', info: 'Ordered list' },
  { label: 'Task List', type: 'list', apply: '- [ ] Task 1\n- [x] Task 2\n- [ ] Task 3', info: 'Task list' },
  
  // Links and media
  { label: 'Link', type: 'link', apply: '[Link text](url)', info: 'Create a link' },
  { label: 'Image', type: 'media', apply: '![Alt text](image-url)', info: 'Insert an image' },
  
  // Code blocks
  { label: 'Code Block', type: 'block', apply: '```\ncode here\n```', info: 'Code block' },
  { label: 'Fenced Code', type: 'block', apply: '```javascript\n// JavaScript code\n```', info: 'Language-specific code block' },
  
  // Other
  { label: 'Blockquote', type: 'block', apply: '> Quote text here', info: 'Blockquote' },
  { label: 'Horizontal Rule', type: 'block', apply: '---', info: 'Horizontal rule' },
  { label: 'Table', type: 'table', apply: '| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |', info: 'Create a table' }
];

// Smart context-aware auto-completion function
function createCompletion(language: string, nodeTypes: any[] | null = [], relationTypes: any[] | null = [], attributeTypes: any[] | null = []) {
  return function completion(context: any) {
    // Ensure we have arrays, not null
    const safeNodeTypes = nodeTypes || [];
    const safeRelationTypes = relationTypes || [];
    const safeAttributeTypes = attributeTypes || [];
    
    const line = context.state.doc.lineAt(context.pos);
    const lineText = line.text;
    const cursorPos = context.pos - line.from;
    
    // Check if we're at the first column (or very beginning of line)
    const isFirstColumn = cursorPos <= 1;
    
    // Get the word being typed - only trigger on meaningful input
    let word = context.matchBefore(/\w*/);
    if (!word) return null;
    
    // Language-specific logic
    if (language === 'cnl') {
      // CNL-specific logic
      const hasSemicolon = lineText.includes(';');
      if (hasSemicolon) return null; // Stop auto-completion for completed statements
      
      // Detect context for context-sensitive completions
      const docText = context.state.doc.toString();
      const beforeCursor = docText.substring(0, context.pos);
      const isInDescription = beforeCursor.match(/```description\s*$/) && !docText.substring(context.pos).match(/^[\s\S]*?```/);
      const isInGraphDescription = beforeCursor.match(/```graph-description\s*$/) && !docText.substring(context.pos).match(/^[\s\S]*?```/);
      const hasGraphDesc = docText.includes('```graph-description');
      
      // CNL context-aware suggestions
      if (isFirstColumn) {
        const firstColumnSuggestions = [];
        
        // Only show graph description if none exists
        if (!hasGraphDesc) {
          firstColumnSuggestions.push({ label: '```graph-description', type: 'block', apply: '```graph-description\n\n```', info: 'Add graph description block' });
        }
        
        // Always show other options
        firstColumnSuggestions.push(
          { label: '#', type: 'node', apply: '# ', info: 'Start a node heading' },
          { label: '```description', type: 'block', apply: '```description\n\n```', info: 'Add description block' }
        );
        
        // Only show relation and attribute if not in description blocks
        if (!isInDescription && !isInGraphDescription) {
          firstColumnSuggestions.push(
            { label: '<', type: 'relation', apply: '<', info: 'Start a relation' },
            { label: 'has', type: 'attribute', apply: 'has ', info: 'Start an attribute' }
          );
        }
        
        const filtered = firstColumnSuggestions.filter(suggestion => 
          suggestion.label.toLowerCase().startsWith(word.text.toLowerCase())
        );
        
        return {
          from: word.from,
          options: filtered.map(suggestion => ({
            label: suggestion.label,
            type: suggestion.type,
            apply: suggestion.apply,
            info: suggestion.info
          }))
        };
      }
      
      // CNL completions for other contexts - context-sensitive filtering
      let filtered = cnlCompletions.filter(completion => 
        completion.label.toLowerCase().includes(word.text.toLowerCase())
      );
      
      // Filter out relation and attribute suggestions if in description blocks
      if (isInDescription || isInGraphDescription) {
        filtered = filtered.filter(completion => 
          !['is a', 'located in', 'works for', 'has'].includes(completion.label)
        );
      }
      
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
    } else if (language === 'markdown') {
      // Markdown-specific minimal completions: headings and description/graph-description
      const firstColumnSuggestions = [
        { label: '#', type: 'header', apply: '# ', info: 'Header 1' },
        { label: '##', type: 'header', apply: '## ', info: 'Header 2' },
        { label: '###', type: 'header', apply: '### ', info: 'Header 3' },
        { label: '```description', type: 'block', apply: '```description\n\n```', info: 'Description block' },
        { label: '```graph-description', type: 'block', apply: '```graph-description\n\n```', info: 'Graph description block' }
      ];
      const filtered = firstColumnSuggestions.filter(suggestion => 
        suggestion.label.toLowerCase().startsWith(word.text.toLowerCase())
      );
      return {
        from: word.from,
        options: filtered.map(suggestion => ({
          label: suggestion.label,
          type: suggestion.type,
          apply: suggestion.apply,
          info: suggestion.info
        }))
      };
    }
    
    return null;
  };
}
  


export function CNLEditor({ 
  value, 
  onChange, 
  onAutoSave,
  language = 'cnl', 
  placeholder = 'Start typing your CNL...',
  readOnly = false,
  className = '',
  nodeTypes = [],
  relationTypes = [],
  attributeTypes = [],
  onInsertText
}: CNLEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [showMarkdownToolbar, setShowMarkdownToolbar] = useState(true);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [showSectionControls, setShowSectionControls] = useState(false);
  const [currentSectionLevel, setCurrentSectionLevel] = useState(0);
  const [editorContext, setEditorContext] = useState<'graph' | 'description' | 'graph-description'>('graph');
  const [hasGraphDescription, setHasGraphDescription] = useState(false);
  const [hasNodeDescription, setHasNodeDescription] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Graph ID tracking removed - App is single-graph only

  useEffect(() => {
    if (!editorRef.current) return;
    
    // Debug logging
    console.log('[CNLEditor] Initializing with value:', { value, valueLength: value?.length, language });
    
            // Graph ID tracking removed - App is single-graph only
    
    // Cleanup auto-save timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [value, language]);

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
      const insertText = (text: string) => {
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
  }, [onInsertText, viewRef.current]);

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
    console.log('[CNLEditor] Creating EditorState with doc:', { 
      doc: value || '', 
      docLength: (value || '').length,
      onAutoSave: !!onAutoSave,
      timestamp: new Date().toISOString()
    });
    const state = EditorState.create({
      doc: value || '',
      extensions: [
        // Basic editor features
        lineNumbers(),
        
        // Language support
        languageSupport,
        
        // Soft-wrap lines to editor width
        EditorView.lineWrapping,
        
        // Keymaps
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
            // Simple approach: just show the completion dropdown
            // This will work with the existing autocompletion setup
            return false; // Let the default handler deal with it
          }},
          
          // Markdown shortcuts
          { key: 'Ctrl-b', run: (view) => { insertMarkdown('**', '**'); return true; }},
          { key: 'Ctrl-i', run: (view) => { insertMarkdown('*', '*'); return true; }},
          { key: 'Ctrl-k', run: (view) => { insertMarkdownBlock('link'); return true; }},
          { key: 'Ctrl-l', run: (view) => { insertMarkdownBlock('list'); return true; }},
          // Remapped to avoid browser quit/close conflicts
          { key: 'Ctrl-Shift-q', run: (view) => { insertMarkdownBlock('quote'); return true; }},
          { key: 'Alt-q', run: (view) => { insertMarkdownBlock('quote'); return true; }},
          { key: 'Ctrl-`', run: (view) => { insertMarkdown('`', '`'); return true; }}
        ]),
        
        // Update listener
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !readOnly) {
            const newValue = update.state.doc.toString();
            console.log('[CNLEditor] Document changed, calling onChange:', { 
              newValue: newValue.substring(0, 100) + '...', 
              newValueLength: newValue.length,
              oldValue: value?.substring(0, 100) + '...',
              oldValueLength: value?.length
            });
            onChange(newValue);
            
            // Auto-save after 2 seconds of inactivity
            if (onAutoSave) {
              if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
              }
              autoSaveTimeoutRef.current = setTimeout(() => {
                console.log('[CNLEditor] Auto-save timeout triggered, calling onAutoSave');
                onAutoSave(newValue);
              }, 2000);
            }
          }
          
          // Update section level and context when cursor moves
          if (update.selectionSet) {
            const level = getCurrentSectionLevel();
            setCurrentSectionLevel(level);
            
            const context = detectEditorContext();
            setEditorContext(context);
            
            const hasGraphDesc = checkForGraphDescription();
            setHasGraphDescription(hasGraphDesc);
            
            const hasNodeDesc = checkForNodeDescription();
            setHasNodeDescription(hasNodeDesc);
            
            // Section controls are now always visible when currentSectionLevel > 0
          }
        }),
        
        // Docked toolbar: no click listener needed
        
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
        
        // Auto-completion for CNL and Markdown
        autocompletion({ 
          override: [createCompletion(language, nodeTypes, relationTypes, attributeTypes)],
          activateOnTyping: true, // Show automatically as you type
          defaultKeymap: true, // Enable default keyboard navigation
          maxRenderedOptions: 10, // Limit dropdown size
          closeOnBlur: true, // Close completion when editor loses focus
          activateOnTypingDelay: 300, // Delay before showing completions when typing
            renderCompletionItem: (completion, state, view) => {
              const dom = document.createElement('li');
              dom.setAttribute('role', 'option');
              
              // Create label element
              const label = dom.appendChild(document.createElement('span'));
              label.className = 'completion-label';
              label.textContent = completion.label;
              
              // Create info element if available
              if (completion.info) {
                const info = dom.appendChild(document.createElement('span'));
                info.className = 'completion-info';
                info.textContent = completion.info;
              }
              
              // Create type badge if available
              if (completion.type) {
                const type = dom.appendChild(document.createElement('span'));
                type.className = 'completion-type';
                type.textContent = completion.type;
              }
              
              return dom;
            }
          }),
        
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
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            maxHeight: '300px',
            overflow: 'hidden'
          },
          '.cm-tooltip.cm-tooltip-autocomplete > ul': {
            backgroundColor: '#ffffff',
            maxHeight: '300px',
            overflow: 'auto',
            padding: '8px 0',
            margin: '0'
          },
          '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
            color: '#333',
            backgroundColor: '#ffffff',
            padding: '8px 16px',
            cursor: 'pointer',
            borderBottom: '1px solid #f3f4f6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          },
          '.cm-tooltip.cm-tooltip-autocomplete > ul > li:last-child': {
            borderBottom: 'none'
          },
          '.cm-tooltip.cm-tooltip-autocomplete > ul > li:hover': {
            backgroundColor: '#f3f4f6'
          },
          '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
            backgroundColor: '#3b82f6',
            color: '#ffffff'
          },
          '.cm-tooltip.cm-tooltip-autocomplete .completion-label': {
            fontWeight: '500',
            fontSize: '14px'
          },
          '.cm-tooltip.cm-tooltip-autocomplete .completion-info': {
            fontSize: '12px',
            color: '#6b7280',
            fontStyle: 'italic'
          },
          '.cm-tooltip.cm-tooltip-autocomplete .completion-type': {
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: '#e5e7eb',
            color: '#374151',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
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
    console.log('[CNLEditor] Editor view created and attached to DOM');

    return () => {
      console.log('[CNLEditor] Cleaning up editor view');
      view.destroy();
      viewRef.current = null;
    };
  }, [language, readOnly]); // Remove onAutoSave dependency to prevent re-initialization

  // Graph ID tracking removed - App is single-graph only

  // Update content when value changes externally
  useEffect(() => {
    if (viewRef.current && value !== undefined) {
      const currentDoc = viewRef.current.state.doc.toString();
      console.log('[CNLEditor] Value change detected:', { 
        newValue: value, 
        newValueLength: value?.length, 
        currentDoc: currentDoc, 
        currentDocLength: currentDoc.length,
        valuesMatch: value === currentDoc
      });
      
      // Always update editor content when value changes (especially when switching graphs)
      if (value !== currentDoc) {
        console.log('[CNLEditor] Updating editor content from external value change');
        const transaction = viewRef.current.state.update({
          changes: {
            from: 0,
            to: currentDoc.length,
            insert: value || ''
          }
        });
        viewRef.current.dispatch(transaction);
        console.log('[CNLEditor] Editor content updated to match external value');
      } else {
        console.log('[CNLEditor] Editor content already matches external value, no update needed');
      }
    }
  }, [value]);

  // Context detection functions
  const detectEditorContext = () => {
    const view = viewRef.current;
    if (!view) return 'graph';
    
    const state = view.state;
    const fromPos = Math.max(0, Math.min(state.selection.main.from, state.doc.length));
    const line = state.doc.lineAt(fromPos);
    const lineText = line.text;
    const cursorPos = fromPos - line.from;
    
    // Check if cursor is inside a description block
    const docText = state.doc.toString();
    const beforeCursor = docText.substring(0, fromPos);
    
    // Look for description blocks
    const descriptionMatch = beforeCursor.match(/```description\s*$/);
    const graphDescriptionMatch = beforeCursor.match(/```graph-description\s*$/);
    
    if (descriptionMatch || graphDescriptionMatch) {
      // Check if we're still inside the block (not past the closing ```)
      const afterCursor = docText.substring(fromPos);
      const closingMatch = afterCursor.match(/^[\s\S]*?```/);
      
      if (closingMatch) {
        if (graphDescriptionMatch) {
          return 'graph-description';
        } else {
          return 'description';
        }
      }
    }
    
    return 'graph';
  };

  const checkForGraphDescription = () => {
    const view = viewRef.current;
    if (!view) return false;
    
    const docText = view.state.doc.toString();
    return docText.includes('```graph-description');
  };

  const checkForNodeDescription = () => {
    const view = viewRef.current;
    if (!view) return false;
    
    const docText = view.state.doc.toString();
    return docText.includes('```description');
  };

  const isBlankLine = () => {
    const view = viewRef.current;
    if (!view) return false;
    
    const state = view.state;
    const fromPos = Math.max(0, Math.min(state.selection.main.from, state.doc.length));
    const line = state.doc.lineAt(fromPos);
    const lineText = line.text;
    
    return lineText.trim() === '';
  };

  const isSectionLine = () => {
    const view = viewRef.current;
    if (!view) return false;
    
    const state = view.state;
    const fromPos = Math.max(0, Math.min(state.selection.main.from, state.doc.length));
    const line = state.doc.lineAt(fromPos);
    const lineText = line.text;
    
    return /^#+\s/.test(lineText);
  };

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
      
      // Simple approach: go to beginning of line and modify the # characters
      if (sectionMatch) {
        // Replace existing section markup
        const newSectionMarkup = newLevel > 0 ? '#'.repeat(newLevel) + ' ' : '';
        view.dispatch({
          changes: { 
            from: lineStart, 
            to: lineStart + sectionMatch[1].length, 
            insert: newSectionMarkup 
          }
        });
      } else {
        // Insert new section markup at beginning of line
        const newSectionMarkup = newLevel > 0 ? '#'.repeat(newLevel) + ' ' : '';
        view.dispatch({
          changes: { 
            from: lineStart, 
            to: lineStart, 
            insert: newSectionMarkup 
          }
        });
      }
      
      // Update the current section level state immediately
      setCurrentSectionLevel(newLevel);
      
      // Section controls are now always visible when currentSectionLevel > 0
    } catch (err) {
      console.error('Failed to insert section level', err);
    }
  };

  const handleSectionButtonClick = () => {
    // Only allow section buttons on blank lines or existing section lines
    if (!isBlankLine() && !isSectionLine()) {
      return;
    }
    
    const currentLevel = getCurrentSectionLevel();
    
    if (currentLevel === 0) {
      // No section markup - insert single #
      insertSectionLevel(1);
    }
    // No need to toggle controls anymore - buttons are always visible when currentSectionLevel > 0
  };

  // Markdown formatting functions
  const insertMarkdown = (before: string, after: string = '') => {
    const view = viewRef.current;
    if (!view || readOnly) return;
    try {
      view.focus();
      const state = view.state;
      const from = Math.max(0, Math.min(state.selection.main.from, state.doc.length));
      const to = Math.max(0, Math.min(state.selection.main.to, state.doc.length));
      const selectedText = state.sliceDoc(from, to) || '';
      const newText = `${before}${selectedText}${after}`;
      const anchor = Math.max(0, Math.min(from + before.length, view.state.doc.length));
      const head = Math.max(0, Math.min(from + before.length + selectedText.length, view.state.doc.length));
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: EditorSelection.single(anchor, head)
      });
    } catch (err) {
      console.error('Failed to apply markdown insertion', err);
    }
  };

  const insertRelation = () => {
    const view = viewRef.current;
    if (!view || readOnly) return;
    try {
      view.focus();
      const state = view.state;
      const fromPos = Math.max(0, Math.min(state.selection.main.from, state.doc.length));
      const line = state.doc.lineAt(fromPos);
      const lineStart = Math.max(0, Math.min(line.from, state.doc.length));
      
      const insertText = '<rel name> target;\n';
      const cursorPos = lineStart + 1; // Position after "<"
      const selectionFrom = lineStart + 1; // Start of "rel name"
      const selectionTo = lineStart + 9; // End of "rel name" (8 characters: "rel name")
      
      view.dispatch({
        changes: { from: lineStart, to: lineStart, insert: insertText },
        selection: EditorSelection.single(selectionFrom, selectionTo)
      });
    } catch (err) {
      console.error('Failed to insert relation', err);
    }
  };

  const insertAttribute = () => {
    const view = viewRef.current;
    if (!view || readOnly) return;
    try {
      view.focus();
      const state = view.state;
      const fromPos = Math.max(0, Math.min(state.selection.main.from, state.doc.length));
      const line = state.doc.lineAt(fromPos);
      const lineStart = Math.max(0, Math.min(line.from, state.doc.length));
      
      const insertText = 'has attribute: value;\n';
      const cursorPos = lineStart + 13; // Position before ":"
      
      view.dispatch({
        changes: { from: lineStart, to: lineStart, insert: insertText },
        selection: EditorSelection.single(cursorPos, cursorPos)
      });
    } catch (err) {
      console.error('Failed to insert attribute', err);
    }
  };

  const insertMarkdownBlock = (blockType: string) => {
    const view = viewRef.current;
    if (!view || readOnly) return;
    try {
      view.focus();
      const state = view.state;
      const fromPos = Math.max(0, Math.min(state.selection.main.from, state.doc.length));
      const line = state.doc.lineAt(fromPos);
      const lineStart = Math.max(0, Math.min(line.from, state.doc.length));
      let insertText = '';
      let cursorPos = 0;
      let selectionRange = null;
      
      switch (blockType) {
        case 'description':
          insertText = '```description\n\n```';
          cursorPos = lineStart + 15; // Position at beginning of blank line (after "```description\n")
          break;
        case 'graph-description':
          insertText = '```graph-description\n\n```';
          cursorPos = lineStart + 20; // Position at beginning of blank line (after "```graph-description\n")
          break;
        case 'heading':
          insertText = '## Section Heading';
          cursorPos = lineStart + insertText.length;
          break;
        case 'bold':
          insertText = '**bold text**';
          cursorPos = lineStart + 2; // Position after "**"
          selectionRange = { from: cursorPos, to: cursorPos + 9 }; // Select "bold text"
          break;
        case 'italic':
          insertText = '*italic text*';
          cursorPos = lineStart + 1; // Position after "*"
          selectionRange = { from: cursorPos, to: cursorPos + 10 }; // Select "italic text"
          break;
        case 'code':
          insertText = '`code`';
          cursorPos = lineStart + 1; // Position after "`"
          selectionRange = { from: cursorPos, to: cursorPos + 4 }; // Select "code"
          break;
        case 'link':
          insertText = '[link text](url)';
          cursorPos = lineStart + 1; // Position after "["
          selectionRange = { from: cursorPos, to: cursorPos + 9 }; // Select "link text"
          break;
        case 'list':
          insertText = '- list item';
          cursorPos = lineStart + insertText.length;
          break;
        case 'numbered':
          insertText = '1. numbered item';
          cursorPos = lineStart + insertText.length;
          break;
        case 'quote':
          insertText = '> quoted text';
          cursorPos = lineStart + insertText.length;
          break;
        case 'codeblock':
          insertText = '```\ncode block\n```';
          cursorPos = lineStart + 4; // Position after "```\n"
          selectionRange = { from: cursorPos, to: cursorPos + 10 }; // Select "code block"
          break;
      }
      
      const insertWithNewline = insertText + '\n';
      const safeCursorPos = Math.max(0, Math.min(cursorPos, view.state.doc.length));
      
      if (selectionRange) {
        // Insert with text selection
        const safeSelectionFrom = Math.max(0, Math.min(selectionRange.from, view.state.doc.length));
        const safeSelectionTo = Math.max(0, Math.min(selectionRange.to, view.state.doc.length));
        view.dispatch({
          changes: { from: lineStart, to: lineStart, insert: insertWithNewline },
          selection: EditorSelection.single(safeSelectionFrom, safeSelectionTo)
        });
      } else {
        // Insert with cursor positioning
        view.dispatch({
          changes: { from: lineStart, to: lineStart, insert: insertWithNewline },
          selection: EditorSelection.single(safeCursorPos, safeCursorPos)
        });
      }
    } catch (err) {
      console.error('Failed to apply markdown block insertion', err);
    }
  };

  return (
    <div className="cnl-editor-wrapper" style={{ position: 'relative', height: '100%' }}>
      {/* Context-Sensitive Toolbar */}
      {showMarkdownToolbar && (
        <div 
          className="context-toolbar"
          style={{
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
          }}
        >
          {/* CNL Toolbar - shown when building graph */}
          {editorContext === 'graph' && (
            <>
              {/* Graph Description Button */}
              {!hasGraphDescription && (
                <button
                  onClick={() => insertMarkdownBlock('graph-description')}
                  title="Add Graph Description"
                  style={{ 
                    padding: '6px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '4px', 
                    background: '#fff', 
                    cursor: 'pointer', 
                    color: '#333',
                    fontSize: '16px',
                    minWidth: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '4px'
                  }}
                >
                  📊
                </button>
              )}
              
              {/* Section Heading - Context Aware */}
              <button
                onClick={handleSectionButtonClick}
                title={`Section Heading${currentSectionLevel > 0 ? ` (Level ${currentSectionLevel})` : ''}`}
                disabled={!isBlankLine() && !isSectionLine()}
                style={{ 
                  padding: '6px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '4px', 
                  background: (!isBlankLine() && !isSectionLine()) ? '#f3f4f6' : '#fff', 
                  cursor: (!isBlankLine() && !isSectionLine()) ? 'not-allowed' : 'pointer', 
                  color: (!isBlankLine() && !isSectionLine()) ? '#9ca3af' : '#333',
                  opacity: (!isBlankLine() && !isSectionLine()) ? 0.5 : 1,
                  fontSize: '16px',
                  minWidth: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '4px'
                }}
              >
                #
              </button>
              
              {/* Simple Section Level Controls */}
              {currentSectionLevel > 0 && (
                <>
                  <button
                    onClick={() => insertSectionLevel(currentSectionLevel - 1)}
                    title="Decrease section level"
                    style={{
                      padding: '6px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      background: '#fff',
                      cursor: 'pointer',
                      color: '#333',
                      fontSize: '16px',
                      minWidth: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '4px'
                    }}
                  >
                    ←
                  </button>
                  <button
                    onClick={() => insertSectionLevel(currentSectionLevel + 1)}
                    title="Increase section level"
                    style={{
                      padding: '6px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      background: '#fff',
                      cursor: 'pointer',
                      color: '#333',
                      fontSize: '16px',
                      minWidth: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '4px'
                    }}
                  >
                    →
                  </button>
                </>
              )}
              
              {/* Node Description Button */}
              <button
                onClick={() => insertMarkdownBlock('description')}
                title="Add Node Description"
                disabled={hasNodeDescription}
                style={{ 
                  padding: '6px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '4px', 
                  background: hasNodeDescription ? '#f3f4f6' : '#fff', 
                  cursor: hasNodeDescription ? 'not-allowed' : 'pointer', 
                  color: hasNodeDescription ? '#9ca3af' : '#333',
                  opacity: hasNodeDescription ? 0.6 : 1,
                  fontSize: '16px',
                  minWidth: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '4px'
                }}
              >
                📝
              </button>
              
              {/* Relation Button */}
              <button
                onClick={() => insertRelation()}
                title="Add Relation"
                style={{ 
                  padding: '6px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '4px', 
                  background: '#fff', 
                  cursor: 'pointer', 
                  color: '#333',
                  fontSize: '16px',
                  minWidth: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '4px'
                }}
              >
                ↔️
              </button>
              
              {/* Attribute Button */}
              <button
                onClick={() => insertAttribute()}
                title="Add Attribute"
                style={{ 
                  padding: '6px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '4px', 
                  background: '#fff', 
                  cursor: 'pointer', 
                  color: '#333',
                  fontSize: '16px',
                  minWidth: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '4px'
                }}
              >
                🏷️
              </button>
            </>
          )}
          
          {/* Markdown Toolbar - shown when inside description blocks */}
          {editorContext === 'description' && (
            <>
              {/* Text Formatting */}
              <button
                onClick={() => insertMarkdown('**', '**')}
                title="Bold (Ctrl+B)"
                style={{ 
                  padding: '6px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '4px', 
                  background: '#fff', 
                  cursor: 'pointer', 
                  color: '#333',
                  fontSize: '16px',
                  minWidth: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  marginRight: '4px'
                }}
              >
                B
              </button>
              <button
                onClick={() => insertMarkdown('*', '*')}
                title="Italic (Ctrl+I)"
                style={{ 
                  padding: '6px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '4px', 
                  background: '#fff', 
                  cursor: 'pointer', 
                  color: '#333',
                  fontSize: '16px',
                  minWidth: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontStyle: 'italic',
                  marginRight: '4px'
                }}
              >
                I
              </button>
              <button
                onClick={() => insertMarkdown('`', '`')}
                title="Inline Code"
                style={{ 
                  padding: '6px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '4px', 
                  background: '#fff', 
                  cursor: 'pointer', 
                  color: '#333',
                  fontSize: '16px',
                  minWidth: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'monospace',
                  marginRight: '4px'
                }}
              >
                &lt;/&gt;
              </button>
              
              {/* Lists */}
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
              
              {/* Links */}
              <button
                onClick={() => insertMarkdownBlock('link')}
                title="Link"
                style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#333' }}
              >
                🔗
              </button>
            </>
          )}
          
          {/* Graph Description Toolbar - shown when inside graph description block */}
          {editorContext === 'graph-description' && (
            <>
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
              
              {/* Lists */}
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
              
              {/* Links */}
              <button
                onClick={() => insertMarkdownBlock('link')}
                title="Link"
                style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#333' }}
              >
                🔗
              </button>
            </>
          )}
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
