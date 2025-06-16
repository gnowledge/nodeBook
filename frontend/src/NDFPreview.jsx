import React, { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { useUserId } from "./UserIdContext";

const NDFPreview = ({ graphId }) => {
  const userId = useUserId();
  const [yamlText, setYamlText] = useState("# Loading...");

  useEffect(() => {
    const fetchParsed = async () => {
      try {
        const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/preview`);
        const text = await res.text();
        setYamlText(text);
      } catch (err) {
        setYamlText("# Failed to load composed.yaml");
        console.error(err);
      }
    };

    fetchParsed();
  }, [userId, graphId]);

  return (
    <Editor
      height="100%"
      language="yaml"
      theme="vs-light"
      value={yamlText}
      options={{
        readOnly: true,
        fontSize: 13,
        lineNumbers: "on",
        wordWrap: "on",
        minimap: { enabled: false },
        scrollBeyondLastLine: false
      }}
    />
  );
};

export default NDFPreview;
