import React, { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { useUserInfo } from "./UserIdContext";
import yaml from 'js-yaml';
import { getApiBase } from "./config";

const NDFPreview = ({ graphId }) => {
  const { userId } = useUserInfo();
  const [yamlText, setYamlText] = useState("# Loading...");

  useEffect(() => {
    const fetchParsed = async () => {
      try {
        // Fetch polymorphic_composed.json and convert to YAML
        const res = await fetch(`${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/polymorphic_composed`);
        if (!res.ok) throw new Error("Failed to fetch polymorphic_composed.json");
        const data = await res.json();
        
        // Convert JSON to YAML string
        const yamlString = yaml.dump(data, { 
          indent: 2, 
          lineWidth: -1, 
          noRefs: true,
          sortKeys: false 
        });
        
        setYamlText(yamlString);
      } catch (err) {
        setYamlText("# Failed to load polymorphic_composed.json");
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
