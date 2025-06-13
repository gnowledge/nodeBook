import React, { useState } from "react";
import NDFPreview from "./NDFPreview";
import NDFJsonPreview from "./NDFJsonPreview";
import Statistics from "./Statistics";
import RelationTypeList from "./RelationTypeList";
import AttributeTypeList from "./AttributeTypeList";

export default function DevPanel({ userId, graphId, graph, onGraphUpdate, prefs }) {
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
          className={`px-4 py-2 ${tab === "json" ? "bg-white border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => setTab("json")}
        >
          JSON
        </button>
        <button
          className={`px-4 py-2 ${tab === "stats" ? "bg-white border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => setTab("stats")}
        >
          Stats
        </button>
        <button
          className={`px-4 py-2 ${tab === "relation-types" ? "bg-white border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => setTab("relation-types")}
        >
          RelationTypes
        </button>
        <button
          className={`px-4 py-2 ${tab === "attribute-types" ? "bg-white border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => setTab("attribute-types")}
        >
          AttributeTypes
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
        {tab === "json" && (
          <NDFJsonPreview userId={userId} graphId={graphId} />
        )}
        {tab === "stats" && (
          <Statistics
            userId={userId}
            graphId={graphId}
            graph={graph}
          />
        )}
        {tab === "relation-types" && (
          <RelationTypeList userId={userId} graphId={graphId} />
        )}
        {tab === "attribute-types" && (
          <AttributeTypeList />
        )}
      </div>
    </div>
  );
}
