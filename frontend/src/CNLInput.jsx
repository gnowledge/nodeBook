import React, { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";

const CNLInput = ({ userId, graphId, graph, onGraphUpdate }) => {
  const [code, setCode] = useState("");

    useEffect(() => {
	console.log("Loaded graph data:", graphData);
    }, [graphData]);

  useEffect(() => {
    if (graph?.raw_markdown) {
      setCode(graph.raw_markdown);
    }
  }, [graph]);

  const handleParse = async () => {
    try {
      const res = await fetch("/api/ndf/parse-markdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_markdown: code }),
      });
      if (!res.ok) throw new Error("Parse failed");
      const yamlText = await res.text(); // get raw YAML response
      onGraphUpdate({ _raw_yaml: yamlText, raw_markdown: code });
    } catch (err) {
      console.error("Parse failed", err);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex justify-between bg-gray-100 p-1 border-b">
        <span className="text-xs text-gray-600">Controlled Natural Language Editor</span>
        <div className="space-x-2">
          <button onClick={handleParse} className="text-xs px-2 py-1 bg-blue-500 text-white rounded">Parse</button>
        </div>
      </div>

      <Editor
        height="200px"
        language="markdown"
        theme="vs-dark"
        value={code}
        onChange={(val) => setCode(val || "")}
        options={{ fontSize: 14 }}
      />
    </div>
  );
};

export default CNLInput;
