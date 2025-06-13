import React, { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";

export default function NDFJsonPreview({ userId, graphId }) {
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchJson() {
      try {
        const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/composed`);
        if (!res.ok) throw new Error("Failed to fetch composed.json");
        const data = await res.json();
        setJsonText(JSON.stringify(data, null, 2));
        setError(null);
      } catch (err) {
        setError("Could not load composed.json");
        setJsonText("");
      }
    }
    fetchJson();
  }, [userId, graphId]);

  return (
    <div className="h-full w-full p-2">
      {error ? (
        <div className="text-red-600 p-2">{error}</div>
      ) : (
        <Editor
          height="60vh"
          defaultLanguage="json"
          value={jsonText}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            theme: "vs"
          }}
        />
      )}
    </div>
  );
}
