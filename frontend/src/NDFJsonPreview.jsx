import React, { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { useUserInfo } from "./UserIdContext";
import { getApiBase } from "./config";

export default function NDFJsonPreview({ graphId }) {
  const { userId } = useUserInfo();
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchJson() {
      try {
        const res = await fetch(`${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/polymorphic_composed`);
        if (!res.ok) throw new Error("Failed to fetch polymorphic_composed.json");
        const data = await res.json();
        setJsonText(JSON.stringify(data, null, 2));
        setError(null);
      } catch (err) {
        setError("Could not load polymorphic_composed.json");
        setJsonText("");
      }
    }
    fetchJson();
  }, [userId, graphId]);

  return (
    <div className="h-full w-full flex flex-col p-2" style={{ minHeight: 0 }}>
      {error ? (
        <div className="text-red-600 p-2">{error}</div>
      ) : (
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
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
        </div>
      )}
    </div>
  );
}
