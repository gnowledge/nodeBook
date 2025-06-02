import React, { useState, useEffect } from "react";
import CNLInput from "./CNLInput";
import DevPanel from "./DevPanel";

const NDFStudioPanel = ({ userId, graphId, graph, onGraphUpdate, onSave }) => {
  const [activeTab, setActiveTab] = useState("CNL");

  // Reset to CNL tab when graphId changes (i.e., when a new graph is selected)
  useEffect(() => {
    setActiveTab("CNL");
  }, [graphId]);

  return (
    <div className="flex flex-col h-full w-full bg-white border-r border-gray-300">
      <div className="flex justify-center space-x-4 p-4 mt-4 border-t border-b">
        <button
          className={`px-3 py-1 rounded ${activeTab === "CNL" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveTab("CNL")}
        >
          CNLEdit
        </button>
        <button
          className={`px-3 py-1 rounded ${activeTab === "Dev" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveTab("Dev")}
        >
          DevPanel
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === "CNL" ? (
          <CNLInput
            userId={userId}
            graphId={graphId}
            onSave={onSave}
            onParsed={onSave} // Call onSave after parse to trigger parent re-fetch
          />
        ) : (
          <DevPanel
            userId={userId}
            graphId={graphId}
            graph={graph}
            onGraphUpdate={onGraphUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default NDFStudioPanel;
