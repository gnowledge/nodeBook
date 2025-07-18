import React, { useState, useEffect } from "react";
import { computeStats, RUBRIC } from "./statisticsUtils.js";
import { getApiBase } from "./config";

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
        const response = await fetch(`${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/cross_graph_reuse`, {
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
            {/* Basic Elements */}
            <tr className="bg-blue-50"><td className="border px-2 font-semibold">Basic Elements</td><td className="border px-2"></td><td className="border px-2"></td></tr>
            <tr><td className="border px-2">Nodes</td><td className="border px-2">{stats.nodeCount}</td><td className="border px-2">{stats.nodeCount * RUBRIC.node}</td></tr>
            <tr><td className="border px-2">Relations</td><td className="border px-2">{stats.relationCount}</td><td className="border px-2">{stats.relationCount * RUBRIC.relation}</td></tr>
            <tr><td className="border px-2">Attributes</td><td className="border px-2">{stats.attributeCount}</td><td className="border px-2">{stats.attributeCount * RUBRIC.attribute}</td></tr>
            
            {/* Enhanced Attributes */}
            <tr className="bg-green-50"><td className="border px-2 font-semibold">Enhanced Attributes</td><td className="border px-2"></td><td className="border px-2"></td></tr>
            <tr><td className="border px-2">Attributes with Units</td><td className="border px-2">{stats.attributeWithUnitCount}</td><td className="border px-2">{stats.attributeWithUnitCount * RUBRIC.attributeWithUnit}</td></tr>
            
            {/* Qualifiers and Modifiers */}
            <tr className="bg-yellow-50"><td className="border px-2 font-semibold">Qualifiers & Modifiers</td><td className="border px-2"></td><td className="border px-2"></td></tr>
            <tr><td className="border px-2">Relations with Qualifier</td><td className="border px-2">{stats.relationWithQualifierCount}</td><td className="border px-2">{stats.relationWithQualifierCount * RUBRIC.relationWithQualifier}</td></tr>
            <tr><td className="border px-2">Attributes with Qualifier</td><td className="border px-2">{stats.attributeWithQualifierCount}</td><td className="border px-2">{stats.attributeWithQualifierCount * RUBRIC.attributeWithQualifier}</td></tr>
            
            {/* Quantifiers and Modality */}
            <tr className="bg-purple-50"><td className="border px-2 font-semibold">Quantifiers & Modality</td><td className="border px-2"></td><td className="border px-2"></td></tr>
            <tr><td className="border px-2">Quantified Elements</td><td className="border px-2">{stats.quantifiedCount}</td><td className="border px-2">{stats.quantifiedCount * RUBRIC.quantified}</td></tr>
            <tr><td className="border px-2">Modality</td><td className="border px-2">{stats.modalityCount}</td><td className="border px-2">{stats.modalityCount * RUBRIC.modality}</td></tr>
            
            {/* Inferred Elements */}
            <tr className="bg-orange-50"><td className="border px-2 font-semibold">Inferred Elements</td><td className="border px-2"></td><td className="border px-2"></td></tr>
            <tr><td className="border px-2">Inferred Relations</td><td className="border px-2">{stats.inferredRelationCount}</td><td className="border px-2">{stats.inferredRelationCount * RUBRIC.inferredRelation}</td></tr>
            <tr><td className="border px-2">Inferred Attributes</td><td className="border px-2">{stats.inferredAttributeCount}</td><td className="border px-2">{stats.inferredAttributeCount * RUBRIC.inferredAttribute}</td></tr>
            
            {/* Advanced Node Types */}
            <tr className="bg-indigo-50"><td className="border px-2 font-semibold">Advanced Node Types</td><td className="border px-2"></td><td className="border px-2"></td></tr>
            <tr><td className="border px-2">Transition Nodes</td><td className="border px-2">{stats.transitionNodeCount}</td><td className="border px-2">{stats.transitionNodeCount * RUBRIC.transitionNode}</td></tr>
            <tr><td className="border px-2">PolyNode Morphs</td><td className="border px-2">{stats.polyNodeMorphCount}</td><td className="border px-2">{stats.polyNodeMorphCount * RUBRIC.polyNodeMorph}</td></tr>
            <tr><td className="border px-2">Function Nodes</td><td className="border px-2">{stats.functionNodeCount}</td><td className="border px-2">{stats.functionNodeCount * RUBRIC.functionNode}</td></tr>
            
            {/* Cross-Graph Reuse */}
            <tr className="bg-green-100"><td className="border px-2 font-semibold">Cross-Graph Reuse</td><td className="border px-2"></td><td className="border px-2"></td></tr>
            <tr className="bg-green-50"><td className="border px-2">Cross-Graph Reuse</td><td className="border px-2">{stats.crossGraphReuseCount}</td><td className="border px-2">{stats.crossGraphReuseCount * RUBRIC.crossGraphReuse}</td></tr>
            
            {/* Logical Composition */}
            <tr className="bg-red-50"><td className="border px-2 font-semibold">Logical Composition</td><td className="border px-2"></td><td className="border px-2"></td></tr>
            <tr><td className="border px-2">Logical Connectives</td><td className="border px-2">{stats.logicalConnectiveCount}</td><td className="border px-2">{stats.logicalConnectiveCount * RUBRIC.logicalConnective}</td></tr>
            
            {/* Pathway Composition */}
            <tr className="bg-teal-50"><td className="border px-2 font-semibold">Pathway Composition</td><td className="border px-2"></td><td className="border px-2"></td></tr>
            <tr><td className="border px-2">Pathway Nodes</td><td className="border px-2">{stats.pathwayNodeCount}</td><td className="border px-2">{stats.pathwayNodeCount * RUBRIC.pathwayNode}</td></tr>
            
            {/* Derived Attributes */}
            <tr className="bg-pink-50"><td className="border px-2 font-semibold">Derived Attributes</td><td className="border px-2"></td><td className="border px-2"></td></tr>
            <tr><td className="border px-2">Derived Attributes</td><td className="border px-2">{stats.derivedAttributeCount}</td><td className="border px-2">{stats.derivedAttributeCount * RUBRIC.derivedAttribute}</td></tr>
            
            {/* Total */}
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
