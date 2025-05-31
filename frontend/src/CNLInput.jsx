import React, { useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

export default function CNLInput({ userId, graphId }) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [value, setValue] = useState('');
  const [relationNames, setRelationNames] = useState([]);
  const [attributeNames, setAttributeNames] = useState([]);
  // Removed dropdown state — using Monaco completions now

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
      setValue(text.replace(/\\n/g, "\n"));
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

      console.log("📥 Raw relation names:", relationNamesRaw);
      const cleanedRelations = relationNamesRaw.map(s => s.trim().replace(/\u00A0/g, ""));
      console.log("✅ Cleaned relation names:", cleanedRelations);
      setRelationNames(cleanedRelations);

      console.log("📥 Raw attribute names:", attributeNamesRaw);
      const cleanedAttributes = attributeNamesRaw.map(s => s.trim().replace(/\u00A0/g, ""));
      console.log("✅ Cleaned attribute names:", cleanedAttributes);
      setAttributeNames(cleanedAttributes);
    } catch (err) {
      console.error('Schema fetch error:', err);
    }
  }

  fetchSuggestions();
}, [userId, graphId]);

  // Register Monaco completion provider when relationNames/attributeNames change and editor is ready
  useEffect(() => {
    if (!editorRef.current || !window._monaco) return;
    if (!relationNames.length && !attributeNames.length) return;

    // Remove previous providers to avoid duplicates
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
    alert(res.ok ? 'CNL saved!' : 'Save failed.');
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
    <div ref={containerRef} className="p-4 relative">
      <div className="flex justify-end gap-2 mb-2">
        <button onClick={saveCNL} className="px-3 py-1 bg-blue-700 text-white rounded">Save</button>
        <button onClick={parseCNL} className="px-3 py-1 bg-green-700 text-white rounded">Parse</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => insertTextTemplate(editorRef.current, `# node_id\nDescription.\n\n:::cnl\n<relation or attribute>\n:::`)} className="px-2 py-1 bg-blue-600 text-white rounded">Node</button>
        <button onClick={() => insertTextTemplate(editorRef.current, `:::cnl\n<relation or attribute>\n:::`)} className="px-2 py-1 bg-gray-300 rounded">CNL</button>
        <button onClick={() => insertTextTemplate(editorRef.current, `<relation> class_name`)} className="px-2 py-1 bg-gray-300 rounded">C-Relation</button>
        <button onClick={() => insertTextTemplate(editorRef.current, `has attribute: value (unit)`)} className="px-2 py-1 bg-gray-300 rounded">C-Attribute</button>
        <button onClick={() => insertTextTemplate(editorRef.current, `subject <relation> object`)} className="px-2 py-1 bg-gray-300 rounded">Relation</button>
        <button onClick={() => insertTextTemplate(editorRef.current, `subject has attribute: value (unit)`)} className="px-2 py-1 bg-gray-300 rounded">Attribute</button>
      </div>

      <MonacoEditor
        height="400px"
        language="plaintext"
        value={value}
        onChange={setValue}
        options={{ wordWrap: 'on' }}
        onMount={(editor, monacoInstance) => {
          editorRef.current = editor;
          window._monaco = monacoInstance;
        }}
      />
    </div>
  )
}
