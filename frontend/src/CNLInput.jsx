import React, { useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

export default function CNLInput({ userId, graphId, onGraphUpdate, onSave }) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [value, setValue] = useState('');
  const [relationNames, setRelationNames] = useState([]);
  const [attributeNames, setAttributeNames] = useState([]);

  useEffect(() => {
    async function loadCNL() {
      const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/cnl`);
      let text = await res.text();
      if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
        try {
          text = JSON.parse(text);
        } catch {
          text = text.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n');
        }
      }
      const decoded = text.replace(/\\n/g, "\n");
      setValue(decoded);
      if (onGraphUpdate) onGraphUpdate({ raw_markdown: decoded });
    }
    loadCNL();
  }, [userId, graphId]);

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const [relsRes, attrsRes] = await Promise.all([
          fetch(`/api/users/${userId}/graphs/${graphId}/relation-names`),
          fetch(`/api/users/${userId}/graphs/${graphId}/attribute-names`)
        ]);

        const relationNamesRaw = await relsRes.json();
        const attributeNamesRaw = await attrsRes.json();

        const cleanedRelations = relationNamesRaw.map(s => s.trim().replace(/\u00A0/g, ""));
        const cleanedAttributes = attributeNamesRaw.map(s => s.trim().replace(/\u00A0/g, ""));
        setRelationNames(cleanedRelations);
        setAttributeNames(cleanedAttributes);
      } catch (err) {
        console.error('Schema fetch error:', err);
      }
    }

    fetchSuggestions();
  }, [userId, graphId]);

  useEffect(() => {
    if (!editorRef.current || !window._monaco) return;
    if (!relationNames.length && !attributeNames.length) return;

    if (window._staticCompletionProvider) {
      window._staticCompletionProvider.dispose();
    }

    window._staticCompletionProvider = window._monaco.languages.registerCompletionItemProvider('plaintext', {
      triggerCharacters: [' ', '<'],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const relationSuggestions = relationNames.map(name => ({
          label: `<${name}>`,
          kind: window._monaco.languages.CompletionItemKind.Keyword,
          insertText: `<${name}>`,
          range
        }));

        const attributeSuggestions = attributeNames.map(name => ({
          label: `has ${name}:`,
          kind: window._monaco.languages.CompletionItemKind.Property,
          insertText: `has ${name}: `,
          range
        }));

        return {
          suggestions: [...relationSuggestions, ...attributeSuggestions]
        };
      }
    });
  }, [relationNames, attributeNames, editorRef.current, window._monaco]);

  function insertTextTemplate(editor, template) {
    if (!editor) return;
    const pos = editor.getPosition();
    editor.executeEdits('', [{
      range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, 1),
      text: template + '\n',
      forceMoveMarkers: true,
    }]);
    editor.focus();
  }

  async function saveCNL() {
    const raw = editorRef.current.getValue();
    const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/cnl`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: raw,
    });
    if (res.ok) {
      alert('CNL saved!');
      if (onSave) onSave();
    } else {
      alert('Save failed.');
    }
  }

  async function parseCNL() {
    const raw = editorRef.current.getValue();
    await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/cnl`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: raw,
    });
    await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/parse`, {
      method: 'POST'
    });
    alert('Parsed and saved!');
  }

  return (
    <div ref={containerRef} className="relative h-full flex flex-col">
      <div className="flex flex-wrap justify-center gap-2 px-4 py-3 border-b bg-gray-50">
        <button onClick={() => insertTextTemplate(editorRef.current, `# node_id\nDescription.\n\n:::cnl\n<relation or attribute>\n:::`)} className="px-2 py-1 bg-blue-600 text-white text-sm rounded shadow-sm">Node</button>
        <button onClick={() => insertTextTemplate(editorRef.current, `:::cnl\n<relation or attribute>\n:::`)} className="px-2 py-1 bg-white border border-gray-300 text-sm rounded shadow-sm">CNL</button>
        <button onClick={() => insertTextTemplate(editorRef.current, `<relation> class_name`)} className="px-2 py-1 bg-gray-200 rounded text-sm">C-Relation</button>
        <button onClick={() => insertTextTemplate(editorRef.current, `has attribute: value (unit)`)} className="px-2 py-1 bg-gray-200 rounded text-sm">C-Attribute</button>
        <button onClick={() => insertTextTemplate(editorRef.current, `subject <relation> object`)} className="px-2 py-1 bg-gray-200 rounded text-sm">Relation</button>
        <button onClick={() => insertTextTemplate(editorRef.current, `subject has attribute: value (unit)`)} className="px-2 py-1 bg-gray-200 rounded text-sm">Attribute</button>
      </div>

      <div className="flex-1 overflow-auto">
        <MonacoEditor
          height="100%"
          language="plaintext"
          value={value}
          onChange={(val) => {
            setValue(val);
            if (onGraphUpdate) onGraphUpdate({ raw_markdown: val });
          }}
          options={{ wordWrap: 'on' }}
          onMount={(editor, monacoInstance) => {
            editorRef.current = editor;
            window._monaco = monacoInstance;
          }}
        />
      </div>

      <div className="flex justify-end gap-3 px-4 py-2 border-t bg-white sticky bottom-0">
        <button onClick={saveCNL} className="px-4 py-1 bg-blue-700 text-white rounded shadow-sm bg-white text-blue-700 border border-blue-700">Save</button>
        <button onClick={parseCNL} className="px-4 py-1 bg-green-700 text-white rounded shadow-sm bg-white text-green-700 border border-green-700">Parse</button>
      </div>
    </div>
  );
}



