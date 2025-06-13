import React, { useState, useEffect } from "react";
import CNLInput from "./CNLInput";
import DevPanel from "./DevPanel";
import CytoscapeStudio from "./CytoscapeStudio";
import DisplayHTML from "./DisplayHTML";
import RelationTypeModal from "./RelationTypeModal";
import AttributeTypeModal from "./AttributeTypeModal";

const NDFStudioPanel = ({ userId, graphId, graph, onGraphUpdate, onSave, setComposedGraph, onGraphDeleted, prefs }) => {
  const [activeTab, setActiveTab] = useState("CNL");

  useEffect(() => {
    setActiveTab("CNL");
  }, [graphId]);

  const handleParsed = async () => {
    try {
      const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/composed`);
      const parsed = await res.json();
      if (setComposedGraph) setComposedGraph(graphId, parsed);
      if (onSave) onSave();
    } catch (err) {
      console.error("Failed to fetch composed.json after parse:", err);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white border-r border-gray-300">
      <div className="flex justify-left space-x-2 p-2 mt-2 border-t border-b text-sm">
        <button className={`px-2 py-1 rounded ${activeTab === "CNL" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setActiveTab("CNL")}>Edit</button>
        <button className={`px-2 py-1 rounded ${activeTab === "Graph" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setActiveTab("Graph")}>Graph View</button>
        <button className={`px-2 py-1 rounded ${activeTab === "Document" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setActiveTab("Document")}>Document View</button>
        <button className={`px-2 py-1 rounded ${activeTab === "Dev" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setActiveTab("Dev")}>KB Manager</button>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === "CNL" && (
          <>
            <div className="flex gap-2 overflow-x-auto py-2 px-2 bg-gray-50 border-b items-right"></div>
            <CNLInput userId={userId} graphId={graphId} onSave={onSave} onParsed={handleParsed} onGraphDeleted={onGraphDeleted} prefs={prefs} />
          </>
        )}
        {activeTab === "Graph" && (
          <div className="h-full w-full">
            <CytoscapeStudio graph={graph} prefs={prefs} />
          </div>
        )}
        {activeTab === "Document" && (
          <div className="h-full w-full">
            <DisplayHTML userId={userId} graphId={graphId} />
          </div>
        )}
        {activeTab === "Dev" && (
          <DevPanel userId={userId} graphId={graphId} graph={graph} onGraphUpdate={onGraphUpdate} prefs={prefs} />
        )}
      </div>
    </div>
  );
};

export default NDFStudioPanel;
