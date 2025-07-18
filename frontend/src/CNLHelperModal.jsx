import React, { useState, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { useUserInfo } from './UserIdContext';
import { useDifficulty } from './DifficultyContext';
import { getApiBase } from './config';

export default function CNLHelperModal({ 
  isOpen, 
  onClose, 
  nodeId, 
  graphId, 
  initialCNL = "", 
  onSave,
  onGraphUpdate 
}) {
  const { userId } = useUserInfo();
  const { restrictions } = useDifficulty();
  const [cnlText, setCnlText] = useState(initialCNL);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'
  const [isLoading, setIsLoading] = useState(false);

  // Check if user can edit CNL
  const canEditCNL = restrictions.canEditCNL;

  useEffect(() => {
    if (isOpen) {
      setCnlText(initialCNL);
      setSaveStatus('idle');
    }
  }, [isOpen, initialCNL]);

  const handleSave = async () => {
    if (!canEditCNL) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

    setSaveStatus('saving');
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem("token");
      
      // Parse CNL and update node neighborhood
      const response = await fetch(`${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${nodeId}/cnl`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': `Bearer ${token}`
        },
        body: cnlText
      });
      
      if (response.ok) {
        setSaveStatus('saved');
        if (onSave) onSave(cnlText);
        if (onGraphUpdate) onGraphUpdate();
        
        // Close modal after successful save
        setTimeout(() => {
          onClose();
          setSaveStatus('idle');
        }, 1500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save CNL');
      }
    } catch (error) {
      console.error('Failed to save CNL:', error);
      setSaveStatus('error');
      
      // Clear error status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setCnlText(initialCNL);
    onClose();
  };

  // Monaco Editor configuration for CNL
  const monacoOptions = {
    readOnly: !canEditCNL,
    wordWrap: 'on',
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    folding: true,
    suggestOnTriggerCharacters: true,
    quickSuggestions: {
      other: true,
      comments: false,
      strings: true
    },
    // CNL-specific autocomplete
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showClasses: true,
      showFunctions: true,
      showVariables: true,
      showConstants: true,
      showEnums: true,
      showEnumsMembers: true,
      showColors: true,
      showFiles: true,
      showReferences: true,
      showFolders: true,
      showTypeParameters: true,
      showWords: true,
      showUsers: true,
      showIssues: true,
      showOperators: true,
      showUnits: true,
      showColors: true,
      showEnums: true,
      showEnumsMembers: true,
      showFiles: true,
      showFolders: true,
      showTypeParameters: true,
      showWords: true,
      showUsers: true,
      showIssues: true,
      showOperators: true,
      showUnits: true
    }
  };

  // CNL language configuration
  const handleEditorDidMount = (editor, monaco) => {
    // Define CNL language
    monaco.languages.register({ id: 'cnl' });
    
    // Define CNL syntax highlighting
    monaco.languages.setMonarchTokensProvider('cnl', {
      tokenizer: {
        root: [
          // Relations: <relation_name>
          [/<[^>]+>/, 'keyword'],
          // Adverbs: ++adverb++
          [/\+\+[^+]+\+\+/, 'string'],
          // Quantifiers: *quantifier*
          [/\*[^*]+\*/, 'comment'],
          // Qualifiers: **qualifier**
          [/\*\*[^*]+\*\*/, 'type'],
          // Modality: [modality]
          [/\[[^\]]+\]/, 'variable'],
          // Units: *unit*
          [/\*[^*]+\*/, 'comment'],
          // Attributes: has attribute_name:
          [/has\s+\w+:/, 'function'],
          // Numbers
          [/\d+/, 'number'],
          // Strings
          [/"[^"]*"/, 'string'],
          // Comments
          [/\/\/.*$/, 'comment'],
          [/\/\*[\s\S]*?\*\//, 'comment']
        ]
      }
    });

    // Add CNL-specific autocomplete
    monaco.languages.registerCompletionItemProvider('cnl', {
      provideCompletionItems: (model, position) => {
        const suggestions = [
          {
            label: 'relation',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<relation_name>',
            documentation: 'Define a relation between nodes'
          },
          {
            label: 'attribute',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'has attribute_name: value',
            documentation: 'Define an attribute for a node'
          },
          {
            label: 'adverb',
            kind: monaco.languages.CompletionItemKind.String,
            insertText: '++adverb++',
            documentation: 'Add an adverb to modify a relation'
          },
          {
            label: 'quantifier',
            kind: monaco.languages.CompletionItemKind.Comment,
            insertText: '*quantifier*',
            documentation: 'Add a quantifier (all, some, many, etc.)'
          },
          {
            label: 'qualifier',
            kind: monaco.languages.CompletionItemKind.Type,
            insertText: '**qualifier**',
            documentation: 'Add a qualifier to describe a node'
          },
          {
            label: 'modality',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: '[modality]',
            documentation: 'Add modality (likely, possible, necessary, etc.)'
          },
          {
            label: 'unit',
            kind: monaco.languages.CompletionItemKind.Comment,
            insertText: '*unit*',
            documentation: 'Add a unit of measurement'
          }
        ];
        
        return { suggestions };
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-4xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <div className="text-lg font-semibold">
            CNL Editor - {nodeId}
            {!canEditCNL && (
              <span className="text-sm text-gray-500 ml-2">(Read-only)</span>
            )}
          </div>
          <div className="flex gap-2">
            {canEditCNL && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saveStatus === 'saving' || isLoading}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {saveStatus === 'saving' ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saveStatus === 'saving' || isLoading}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400 disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {saveStatus === 'saved' && (
          <div className="px-4 py-2 bg-green-100 text-green-700 text-sm border-b">
            ✓ CNL saved successfully!
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="px-4 py-2 bg-red-100 text-red-700 text-sm border-b">
            ✗ Failed to save CNL. Please try again.
          </div>
        )}

        {/* CNL Syntax Help */}
        <div className="px-4 py-2 bg-blue-50 text-blue-700 text-xs border-b">
          <strong>CNL Syntax:</strong> Relations: &lt;relation&gt; target | Attributes: has name: value | 
          Adverbs: ++adverb++ | Quantifiers: *quantifier* | Qualifiers: **qualifier** | Modality: [modality]
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-0 p-4">
          <MonacoEditor
            height="100%"
            language="cnl"
            value={cnlText}
            onChange={setCnlText}
            options={monacoOptions}
            onMount={handleEditorDidMount}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-xs text-gray-600">
          <div className="flex justify-between items-center">
            <div>
              <strong>Examples:</strong>
              <span className="ml-2">
                heart &lt;pumps&gt; blood | heart has color: red | ++efficiently++ &lt;pumps&gt; blood
              </span>
            </div>
            <div>
              {canEditCNL ? (
                <span className="text-green-600">✓ CNL editing enabled</span>
              ) : (
                <span className="text-orange-600">⚠ CNL editing requires Advanced/Expert level</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
