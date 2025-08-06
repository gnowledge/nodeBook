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
  
  // Use a ref to store the latest schema props to avoid stale closures
  const schemaRef = useRef({ nodeTypes, relationTypes, attributeTypes });
  useEffect(() => {
    schemaRef.current = { nodeTypes, relationTypes, attributeTypes };
  }, [nodeTypes, relationTypes, attributeTypes]);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    monacoRef.current = monaco;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onSubmit();
    });

    // Ensure the provider is only registered once
    if (!providerRef.current) {
      if (!monaco.languages.getLanguages().some(lang => lang.id === 'cnl')) {
        monaco.languages.register({ id: 'cnl' });
      }

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

          if (/#\s*.*\[[^\]]*$/.test(textUntilPosition)) {
            nodeTypes.forEach(nt => {
              suggestions.push({
                label: nt.name,
                kind: monaco.languages.CompletionItemKind.Class,
                insertText: nt.name,
                detail: nt.description,
              });
            });
          }

          if (/<[^>]*$/.test(textUntilPosition)) {
            relationTypes.forEach(rt => {
              suggestions.push({
                label: rt.name,
                kind: monaco.languages.CompletionItemKind.Interface,
                insertText: rt.name,
                detail: rt.description,
              });
            });
          }
          
          if (/has\s+[^:]*$/.test(textUntilPosition)) {
            attributeTypes.forEach(at => {
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
      theme="vs-dark"
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