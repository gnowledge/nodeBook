import React, { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { Monaco } from 'monaco-editor';
import type { RelationType, AttributeType, NodeType } from './types';

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
  
  const schemaRef = useRef({ nodeTypes, relationTypes, attributeTypes });
  useEffect(() => {
    schemaRef.current = { nodeTypes, relationTypes, attributeTypes };
  }, [nodeTypes, relationTypes, attributeTypes]);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    monacoRef.current = monaco;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onSubmit();
    });

    if (!monaco.languages.getLanguages().some(lang => lang.id === 'cnl')) {
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
        colors: {},
      });
    }

    if (!providerRef.current) {
      providerRef.current = monaco.languages.registerCompletionItemProvider('cnl', {
        provideCompletionItems: (model, position) => {
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
  );
}
