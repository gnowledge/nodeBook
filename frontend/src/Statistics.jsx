import React, { useState, useEffect } from "react";
import { computeStats, RUBRIC } from "./statisticsUtils.js";

export default function Statistics({ userId, graphId, graph }) {
  const [crossGraphReuse, setCrossGraphReuse] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Debug: log props to console
  console.debug("[Statistics] Rendered with:", { userId, graphId, graph });
  
  // Fetch cross-graph reuse statistics
  useEffect(() => {
    const fetchCrossGraphReuse = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/cross_graph_reuse`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setCrossGraphReuse(data.cross_graph_reuse_count || 0);
        }
      } catch (error) {
        console.error("Failed to fetch cross-graph reuse stats:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId && graphId) {
      fetchCrossGraphReuse();
    }
  }, [userId, graphId]);
  
  const stats = computeStats(graph, crossGraphReuse);
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-2">Graph Scorecard</h2>
      <div className="text-gray-600 mb-4">
        <p>User: <b>{userId}</b></p>
        <p>Graph: <b>{graphId}</b></p>
      </div>
      {!graph && <div className="text-red-600">No graph prop received.</div>}
      {stats ? (
        <table className="min-w-[320px] border text-sm mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 border">Category</th>
              <th className="px-2 py-1 border">Count</th>
              <th className="px-2 py-1 border">Points</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border px-2">Nodes</td><td className="border px-2">{stats.nodeCount}</td><td className="border px-2">{stats.nodeCount * RUBRIC.node}</td></tr>
            <tr><td className="border px-2">Relations</td><td className="border px-2">{stats.relationCount}</td><td className="border px-2">{stats.relationCount * RUBRIC.relation}</td></tr>
            <tr><td className="border px-2">Attributes</td><td className="border px-2">{stats.attributeCount}</td><td className="border px-2">{stats.attributeCount * RUBRIC.attribute}</td></tr>
            <tr><td className="border px-2">Nodes with Qualifier</td><td className="border px-2">{stats.nodeWithQualifier}</td><td className="border px-2">{stats.nodeWithQualifier * RUBRIC.nodeWithQualifier}</td></tr>
            <tr><td className="border px-2">Relations with Qualifier</td><td className="border px-2">{stats.relationWithQualifier}</td><td className="border px-2">{stats.relationWithQualifier * RUBRIC.relationWithQualifier}</td></tr>
            <tr><td className="border px-2">Attributes with Qualifier</td><td className="border px-2">{stats.attributeWithQualifier}</td><td className="border px-2">{stats.attributeWithQualifier * RUBRIC.attributeWithQualifier}</td></tr>
            <tr><td className="border px-2">Quantified</td><td className="border px-2">{stats.quantified}</td><td className="border px-2">{stats.quantified * RUBRIC.quantified}</td></tr>
            <tr><td className="border px-2">Modality</td><td className="border px-2">{stats.modality}</td><td className="border px-2">{stats.modality * RUBRIC.modality}</td></tr>
            <tr><td className="border px-2">Logical Connective</td><td className="border px-2">{stats.logicalConnective}</td><td className="border px-2">{stats.logicalConnective * RUBRIC.logicalConnective}</td></tr>
            <tr className="bg-green-50"><td className="border px-2">Cross-Graph Reuse</td><td className="border px-2">{stats.crossGraphReuseCount}</td><td className="border px-2">{stats.crossGraphReuseCount * RUBRIC.crossGraphReuse}</td></tr>
            <tr className="font-bold bg-gray-50"><td className="border px-2">Total</td><td className="border px-2"></td><td className="border px-2">{stats.total}</td></tr>
          </tbody>
        </table>
      ) : (
        <div className="text-red-600">No graph data available.</div>
      )}
      <div className="text-xs text-gray-500 mt-2">
        <p>Scoring rubric is tentative and for feedback only.</p>
      </div>
    </div>
  );
}
