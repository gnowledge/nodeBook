import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import type { RelationType, AttributeType, NodeType } from './types';
import { NLPSidePanel } from './NLPSidePanel';
import { WordNetDefinitionsPanel } from './WordNetDefinitionsPanel';
import { ensureDescriptionBlocks, extractDescriptionsForAnalysis, debugDescriptions } from './utils/cnlProcessor';
import { analyzeMultipleTexts, type NLPAnalysisResult, type NLPAnalysisError } from './services/nlpAnalysisService';
import { WordNetService } from './services/wordnetService';
import './CnlEditor.css';

// Import Monaco Editor configuration
import './monaco-config';

interface CnlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  nodeTypes: NodeType[];
  relationTypes: RelationType[];
  attributeTypes: AttributeType[];
}

export function CnlEditor({ value, onChange, onSubmit, disabled, nodeTypes, relationTypes, attributeTypes }: CnlEditorProps) {
  const monacoRef = useRef<Monaco | null>(null);
  const providerRef = useRef<any>(null);
  
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
  

  
  const schemaRef = useRef({ nodeTypes, relationTypes, attributeTypes });
  useEffect(() => {
    schemaRef.current = { nodeTypes, relationTypes, attributeTypes };
  }, [nodeTypes, relationTypes, attributeTypes]);

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
      const updatedCnl = WordNetService.insertDescription(value, term, definition);
      onChange(updatedCnl);
    } catch (error) {
      console.error('Error inserting definition:', error);
      setWordNetError('Failed to insert definition. Please try again.');
    }
  };

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    monacoRef.current = monaco;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onSubmit();
    });

    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === 'cnl')) {
      monaco.languages.register({ id: 'cnl' });

      monaco.languages.setMonarchTokensProvider('cnl', {
        tokenizer: {
          root: [
            [/^#\s*.+$/, 'entity.name.type'],
            [/<.+?>/, 'entity.name.tag'],
            [/has\s+.+:/, 'keyword'],
            [/```description/, 'comment', '@description'],
            [/[A-Z][\w\s]*/, 'entity.name.type'],
          ],
          description: [
            [/```/, 'comment', '@pop'],
            [/.*/, 'comment'],
          ],
        },
      });

      monaco.editor.defineTheme('cnlTheme', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'entity.name.type', foreground: '0000ff' }, // Blue for Nodes and Targets
          { token: 'entity.name.tag', foreground: '008000' },   // Green for Relations
          { token: 'keyword', foreground: 'D95F02' },         // Dark Orange for Attributes
          { token: 'comment', foreground: '808080' },
        ],
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': '#212529',
          'editorLineNumber.foreground': '#6c757d',
          'editorCursor.foreground': '#007bff',
          'editor.selectionBackground': '#e9ecef',
          'editor.inactiveSelectionBackground': '#f0f2f5',
        },
      });
    }

    if (!providerRef.current) {
      providerRef.current = monaco.languages.registerCompletionItemProvider('cnl', {
        provideCompletionItems: (model: any, position: any) => {
          const { nodeTypes, relationTypes, attributeTypes } = schemaRef.current;
          const textUntilPosition = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });

          const suggestions: any[] = [];
          
          const lines = textUntilPosition.split('\n');
          let currentNodeType: string | null = null;
          for (let i = lines.length - 1; i >= 0; i--) {
            const match = lines[i].match(/^\s*#+\s*.+?\[(.+?)\]/);
            if (match) {
              currentNodeType = match[1].split(';')[0].trim();
              break;
            }
          }

          if (/#\s*.*?\\\[[^]]*$/.test(textUntilPosition)) {
            nodeTypes.forEach(nt => {
              suggestions.push({
                label: nt.name,
                kind: monaco.languages.CompletionItemKind.Class,
                insertText: nt.name,
                detail: nt.description,
              });
            });
          } else if (/<[^>]*$/.test(textUntilPosition)) {
            const validRelations = currentNodeType
              ? relationTypes.filter(rt => rt.domain.length === 0 || rt.domain.includes(currentNodeType))
              : relationTypes;
            
            validRelations.forEach(rt => {
              suggestions.push({
                label: rt.name,
                kind: monaco.languages.CompletionItemKind.Interface,
                insertText: rt.name,
                detail: rt.description,
              });
            });
          } else if (/has\s+[^:]*$/.test(textUntilPosition)) {
            const validAttributes = currentNodeType
              ? attributeTypes.filter(at => at.scope.length === 0 || at.scope.includes(currentNodeType))
              : attributeTypes;

            validAttributes.forEach(at => {
              suggestions.push({
                label: at.name,
                kind: monaco.languages.CompletionItemKind.Property,
                insertText: at.name,
                detail: at.description,
              });
            });
          }

          return { suggestions };
        },
      });
    }
  };

  return (
    <div className="cnl-editor-container">
      {/* Editor Toolbar */}
      <div className="cnl-editor-toolbar">
                    <div className="toolbar-left">
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
          
          <button 
            className="toolbar-btn submit-btn"
            onClick={onSubmit}
            disabled={disabled}
            title="Submit CNL to build graph (Ctrl+Enter)"
          >
            🚀 Submit to Build Graph
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="cnl-editor-main">
        <Editor
          height="100%"
          language="cnl"
          theme="cnlTheme"
          value={value}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            lineNumbers: 'off',
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            readOnly: disabled,
          }}
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
