import React, { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import yaml from "js-yaml";

const CNLInput = ({ userId, graphId, graph, onGraphUpdate, onAfterParse }) => {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
    
useEffect(() => {
  if (graph?.raw_markdown) {
    let s = graph.raw_markdown;

    // Decode visible "\\n" into real newlines
    if (s.includes("\\n")) {
      s = s.replace(/\\n/g, "\n");
    }

    // Remove any stray carriage returns
    s = s.replace(/\r/g, "");
    setCode(s);
  }
}, [graph]);

  const handleParse = async () => {
    try {
      setStatus("Parsing...");
      const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/parse`, {
        method: "POST",
      });
      if (onAfterParse) onAfterParse();
      if (!res.ok) throw new Error("Parse failed");
      const parsed = await res.json();
      setStatus("✅ Parsed successfully.");
      onGraphUpdate({
        
        ...parsed,
        raw_markdown: code,
        _parsed_at: new Date().toISOString()
      });
    } catch (err) {
      console.error("Parse failed", err);
      setStatus("❌ Parse failed.");
    }
  };

  const normalizeLineEndings = (text) => text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const handleSave = async () => {
    try {
      setStatus("Saving...");
      const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/cnl`, {
        method: "PUT",
        headers: { "Content-Type": "text/plain" },
        body: normalizeLineEndings(code),
      });
      if (!res.ok) throw new Error("Save failed");
      setStatus("✅ Saved successfully.");
    } catch (err) {
      console.error("Save failed", err);
      setStatus("❌ Save failed.");
    }
  };

  return (
    <div  className="flex flex-col flex-1 h-full"
>
      <div className="flex justify-between bg-gray-100 p-1 border-b">
        <span className="text-xs text-gray-600">Controlled Natural Language Editor</span>
        <div className="space-x-2">
          <button onClick={handleSave} className="text-xs px-2 py-1 bg-green-600 text-white rounded">Save</button>
          <button onClick={handleParse} className="text-xs px-2 py-1 bg-blue-500 text-white rounded">Parse</button>
        </div>
      </div>

      <Editor
        key={graphId}
          height="100%"
	  classname="flex-1"
        language="markdown"
        theme="vs-dark"
        value={code}
        onChange={(val) => {
          setCode(val || "");
          if (val) {
            const lastChar = val[val.length - 1];
          }
        }}
        onMount={(editor, monaco) => {
          editor.getModel().setEOL(monaco.editor.EndOfLineSequence.LF);
        }}
        options={{
          fontSize: 14,
          lineNumbers: "on",
          wordWrap: "on",
          scrollBeyondLastLine: false
        }}
      />
      <div className="text-xs text-right text-gray-500 pr-2 py-1">{status}</div>
    </div>
  );
};

export default CNLInput;
