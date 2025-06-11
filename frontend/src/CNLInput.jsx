import React, { useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import RelationTypeModal from './RelationTypeModal';
import AttributeTypeModal from './AttributeTypeModal';
import BlocklyCNLComposer from "./BlocklyCNLComposer";
import CNLHelperModal from './CNLHelperModal';

export default function CNLInput({ userId, graphId, onGraphUpdate, onSave, onParsed, onGraphDeleted, prefs }) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [value, setValue] = useState('');
  const [relationNames, setRelationNames] = useState([]);
  const [attributeNames, setAttributeNames] = useState([]);
  const [showBlockly, setShowBlockly] = useState(false);
  const [showNodeNameHelper, setShowNodeNameHelper] = useState(false);

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
    if (onParsed) onParsed(); // Notify parent to re-fetch parsed YAML
  }

  // Delete Graph handler
  async function handleDeleteGraph() {
    if (!userId || !graphId) return;
    const confirmed = window.confirm(`Are you sure you want to delete the graph "${graphId}"? This action cannot be undone.`);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert("Failed to delete graph: " + (err.detail || res.statusText));
        return;
      }
      alert(`Graph '${graphId}' deleted.`);
      if (onGraphDeleted) onGraphDeleted(graphId);
    } catch (err) {
      alert("Failed to delete graph: " + err.message);
    }
  }

  // Insert CNL from Blockly
  const handleInsertCNL = (cnl) => {
    if (editorRef.current && cnl) {
      // Insert at cursor or append
      const editor = editorRef.current;
      const pos = editor.getPosition();
      editor.executeEdits('', [{
        range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, 1),
        text: cnl + '\n',
        forceMoveMarkers: true,
      }]);
      editor.focus();
    }
    setShowBlockly(false);
  };

  // Insert Node Name
  const handleInsertNodeName = (nodeName) => {
    if (editorRef.current && nodeName) {
      const editor = editorRef.current;
      const pos = editor.getPosition();
      editor.executeEdits('', [{
        range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, 1),
        text: nodeName + '\n',
        forceMoveMarkers: true,
      }]);
      editor.focus();
    }
    setShowNodeNameHelper(false);
  };

  return (
    <div className="relative h-full">
      <div ref={containerRef} className="relative h-full flex flex-col bg-white rounded shadow border overflow-hidden">
        <div className="flex flex-wrap gap-2 px-4 py-3 border-b bg-gray-50 items-center">
          <button onClick={() => insertTextTemplate(editorRef.current, `# node_id\nDescription.\n\n:::cnl\n<relation or attribute>\n:::`)} className="px-2 py-1 bg-blue-300 text-white text-sm rounded shadow-sm"># ○ Node:::</button>
          <button onClick={() => insertTextTemplate(editorRef.current, `:::cnl\n<relation or attribute>\n:::`)} className="px-2 py-1 bg-darkgrey border border-gray-300 text-sm rounded shadow-sm">:::CNL:::</button>
          <button onClick={() => insertTextTemplate(editorRef.current, `<relation> class_name`)} className="px-2 py-1 bg-gray-200 rounded text-sm">Relation ➛ </button>
          <button onClick={() => insertTextTemplate(editorRef.current, `has attribute: value (unit)`)} className="px-2 py-1 bg-gray-200 rounded text-sm">🏷 Attribute:</button>
          <button onClick={() => setShowBlockly(true)} className="px-2 py-1 bg-green-600 text-white text-sm rounded shadow-sm ml-2">Visual Composer</button>
          <button onClick={() => setShowNodeNameHelper(true)} className="px-2 py-1 bg-purple-600 text-white text-sm rounded shadow-sm ml-2">CNL Helper</button>
          {/* Schema modals as chip-style links, right next to insertion buttons */}
          <RelationTypeModal userId={userId} graphId={graphId}>
            <span
              className="inline-block px-3 py-1 rounded-full bg-gray-200 text-blue-700 text-xs cursor-pointer hover:bg-blue-100 transition"
              title="Add a new relation type to the schema"
            >
              + Relation Type
            </span>
          </RelationTypeModal>
          <AttributeTypeModal userId={userId} graphId={graphId}>
            <span
              className="inline-block px-3 py-1 rounded-full bg-gray-200 text-blue-700 text-xs cursor-pointer hover:bg-blue-100 transition"
              title="Add a new attribute type to the schema"
            >
              + Attribute Type
            </span>
          </AttributeTypeModal>
        </div>

        <div className="flex-1 min-h-0 relative">
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
          <div className="fixed bottom-6 right-8 z-50 flex gap-4">
            <button onClick={saveCNL} className="px-6 py-2 text-lg font-semibold rounded bg-blue-700 text-white shadow hover:bg-blue-800 transition">Save</button>
            <button onClick={parseCNL} className="px-6 py-2 text-lg font-semibold rounded bg-green-700 text-white shadow hover:bg-green-800 transition">Parse</button>
          </div>
        </div>
        {showBlockly && (
          <BlocklyCNLComposer
            onCNLGenerated={handleInsertCNL}
            onClose={() => setShowBlockly(false)}
          />
        )}
        {showNodeNameHelper && (
          <CNLHelperModal
            onCNLGenerated={handleInsertNodeName}
            onClose={() => setShowNodeNameHelper(false)}
            difficulty={prefs?.difficulty || "easy"}
          />
        )}
      </div>
      <div className="fixed left-8 bottom-6 z-50">
        {userId && graphId && (
          <button
            onClick={handleDeleteGraph}
            className="px-6 py-2 text-lg font-semibold rounded bg-red-700 text-white shadow hover:bg-red-800 transition border-2 border-red-900"
            style={{ minWidth: 160 }}
          >
            Delete Graph
          </button>
        )}
      </div>
    </div>
  );
}



