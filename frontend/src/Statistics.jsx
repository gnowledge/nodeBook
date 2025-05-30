import React from "react";

export default function Statistics({ userId, graphId, graph }) {
  // This is a stub. Replace with real stats logic as needed.
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-2">Graph Statistics</h2>
      <div className="text-gray-600">
        <p>User: <b>{userId}</b></p>
        <p>Graph: <b>{graphId}</b></p>
        <p>Nodes: <b>{graph?.nodes ? graph.nodes.length : "?"}</b></p>
        <p>Relations: <b>{graph?.relations ? graph.relations.length : "?"}</b></p>
        <p className="italic text-sm mt-2">Statistics panel coming soon...</p>
      </div>
    </div>
  );
}
