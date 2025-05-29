import React, { useState } from "react";

const NDFPreview = ({ graph, userId, graphId, onGraphUpdate }) => {
  const [saveStatus, setSaveStatus] = useState("");

  const handleSave = async () => {
    try {
      setSaveStatus("Saving...");
      const res = await fetch(`/api/ndf/users/user0/graphs/graph1`, {
        method: "PUT",
        headers: { "Content-Type": "application/x-ndf+yaml" },
        body: graph._raw_yaml,
      });

      if (!res.ok) throw new Error("Save failed");

      setSaveStatus("✅ Saved successfully.");
      onGraphUpdate && onGraphUpdate(graph);
    } catch (err) {
      console.error("Save failed", err);
      setSaveStatus("❌ Save failed.");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between bg-gray-100 px-2 py-1 border-b">
        <span className="text-xs text-gray-600">YAML Preview</span>
        <button
          onClick={handleSave}
          className="text-xs px-2 py-1 bg-green-600 text-white rounded"
        >
          Save
        </button>
      </div>
      <div className="flex-1 overflow-y-scroll bg-white text-xs font-mono p-2 whitespace-pre-wrap">
        {graph?._raw_yaml || "No YAML available"}
      </div>
      <div className="text-xs text-right text-gray-600 pr-2">{saveStatus}</div>
    </div>
  );
};

export default NDFPreview;
