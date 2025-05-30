import React, { useState } from "react";
import NDFPreview from "./NDFPreview";
import Statistics from "./Statistics";

export default function DevPanel({ userId, graphId, graph, onGraphUpdate }) {
  const [tab, setTab] = useState("yaml");

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b bg-gray-100">
        <button
          className={`px-4 py-2 ${tab === "yaml" ? "bg-white border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => setTab("yaml")}
        >
          YAML
        </button>
        <button
          className={`px-4 py-2 ${tab === "stats" ? "bg-white border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => setTab("stats")}
        >
          Stats
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-white">
        {tab === "yaml" && (
          <NDFPreview
            userId={userId}
            graphId={graphId}
            graph={graph}
            onGraphUpdate={onGraphUpdate}
          />
        )}
        {tab === "stats" && (
          <Statistics
            userId={userId}
            graphId={graphId}
            graph={graph}
          />
        )}
      </div>
    </div>
  );
}
