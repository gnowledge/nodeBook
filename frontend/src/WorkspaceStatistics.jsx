import React, { useEffect, useState } from "react";
import { listGraphs } from "./services/api";
import Statistics from "./Statistics";
import { computeStats } from "./statisticsUtils.js";
import { useUserInfo } from "./UserIdContext";

export default function WorkspaceStatistics() {
  const { userId } = useUserInfo();
  const [graphList, setGraphList] = useState([]);
  const [graphStats, setGraphStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAllStats() {
      setLoading(true);
      setError(null);
      try {
        const ids = await listGraphs(userId);
        setGraphList(ids);
        const statsArr = [];
        for (const graphId of ids) {
          try {
            const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/polymorphic_composed`);
            if (!res.ok) throw new Error();
            const graph = await res.json();

            
            // Fetch cross-graph reuse data
            let crossGraphReuseCount = 0;
            try {
              const reuseRes = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/cross_graph_reuse`, {
                headers: {
                  "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
              });
              if (reuseRes.ok) {
                const reuseData = await reuseRes.json();
                crossGraphReuseCount = reuseData.cross_graph_reuse_count || 0;
              }
            } catch (error) {
              console.error(`Failed to fetch cross-graph reuse for ${graphId}:`, error);
            }
            
            const stats = computeStats(graph, crossGraphReuseCount);
            statsArr.push({ graphId, stats });
          } catch {
            statsArr.push({ graphId, stats: null });
          }
        }
        setGraphStats(statsArr);
      } catch (e) {
        setError("Failed to load graphs.");
      } finally {
        setLoading(false);
      }
    }
    fetchAllStats();
  }, [userId]);

  // Aggregate totals
  const total = graphStats.reduce((acc, g) => {
    if (!g.stats) return acc;
    for (const k of Object.keys(g.stats)) {
      if (k !== "total") acc[k] = (acc[k] || 0) + (g.stats[k] || 0);
    }
    acc.total = (acc.total || 0) + (g.stats.total || 0);
    return acc;
  }, {});
  


  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Workspace Scorecard (All Graphs)</h2>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <>
          <table className="min-w-[320px] border text-sm mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1 border">Graph</th>
                <th className="px-2 py-1 border">Nodes</th>
                <th className="px-2 py-1 border">Relations</th>
                <th className="px-2 py-1 border">Attributes</th>
                <th className="px-2 py-1 border">Advanced</th>
                <th className="px-2 py-1 border">Reuse</th>
                <th className="px-2 py-1 border">Score</th>
              </tr>
            </thead>
            <tbody>
              {graphStats.map(({ graphId, stats }) => (
                <tr key={graphId}>
                  <td className="border px-2">{graphId}</td>
                  <td className="border px-2">{stats?.nodeCount ?? "-"}</td>
                  <td className="border px-2">{stats?.relationCount ?? "-"}</td>
                  <td className="border px-2">{stats?.attributeCount ?? "-"}</td>
                  <td className="border px-2">{(() => {
                    const advanced = (stats?.transitionNodeCount ?? 0) + 
                                   (stats?.functionNodeCount ?? 0) + 
                                   (stats?.polyNodeMorphCount ?? 0);
                    return advanced > 0 ? advanced : "-";
                  })()}</td>
                  <td className="border px-2">{stats?.crossGraphReuseCount ?? "-"}</td>
                  <td className="border px-2 font-bold">{stats?.total ?? "-"}</td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-50">
                <td className="border px-2">Total</td>
                <td className="border px-2">{total.nodeCount ?? 0}</td>
                <td className="border px-2">{total.relationCount ?? 0}</td>
                <td className="border px-2">{total.attributeCount ?? 0}</td>
                <td className="border px-2">{(() => {
                  const advanced = (total.transitionNodeCount ?? 0) + 
                                 (total.functionNodeCount ?? 0) + 
                                 (total.polyNodeMorphCount ?? 0);
                  return advanced;
                })()}</td>
                <td className="border px-2">{total.crossGraphReuseCount ?? 0}</td>
                <td className="border px-2">{total.total ?? 0}</td>
              </tr>
            </tbody>
          </table>

          {/* Detailed rubric breakdown for workspace total */}
          <h3 className="text-md font-semibold mb-2 mt-6">Workspace Rubric Breakdown</h3>
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
              <tr><td className="border px-2">Nodes</td><td className="border px-2">{total.nodeCount ?? 0}</td><td className="border px-2">{(total.nodeCount ?? 0) * 1}</td></tr>
              <tr><td className="border px-2">Relations</td><td className="border px-2">{total.relationCount ?? 0}</td><td className="border px-2">{(total.relationCount ?? 0) * 2}</td></tr>
              <tr><td className="border px-2">Attributes</td><td className="border px-2">{total.attributeCount ?? 0}</td><td className="border px-2">{(total.attributeCount ?? 0) * 3}</td></tr>
              {/* Enhanced Attributes */}
              <tr className="bg-green-50"><td className="border px-2 font-semibold">Enhanced Attributes</td><td className="border px-2"></td><td className="border px-2"></td></tr>
              <tr><td className="border px-2">Attributes with Units</td><td className="border px-2">{total.attributeWithUnitCount ?? 0}</td><td className="border px-2">{(total.attributeWithUnitCount ?? 0) * 4}</td></tr>
              {/* Qualifiers and Modifiers */}
              <tr className="bg-yellow-50"><td className="border px-2 font-semibold">Qualifiers & Modifiers</td><td className="border px-2"></td><td className="border px-2"></td></tr>
              <tr><td className="border px-2">Relations with Qualifier</td><td className="border px-2">{total.relationWithQualifierCount ?? 0}</td><td className="border px-2">{(total.relationWithQualifierCount ?? 0) * 2}</td></tr>
              <tr><td className="border px-2">Attributes with Qualifier</td><td className="border px-2">{total.attributeWithQualifierCount ?? 0}</td><td className="border px-2">{(total.attributeWithQualifierCount ?? 0) * 2}</td></tr>
              {/* Quantifiers and Modality */}
              <tr className="bg-purple-50"><td className="border px-2 font-semibold">Quantifiers & Modality</td><td className="border px-2"></td><td className="border px-2"></td></tr>
              <tr><td className="border px-2">Quantified Elements</td><td className="border px-2">{total.quantifiedCount ?? 0}</td><td className="border px-2">{(total.quantifiedCount ?? 0) * 5}</td></tr>
              <tr><td className="border px-2">Modality</td><td className="border px-2">{total.modalityCount ?? 0}</td><td className="border px-2">{(total.modalityCount ?? 0) * 5}</td></tr>
              {/* Inferred Elements */}
              <tr className="bg-orange-50"><td className="border px-2 font-semibold">Inferred Elements</td><td className="border px-2"></td><td className="border px-2"></td></tr>
              <tr><td className="border px-2">Inferred Relations</td><td className="border px-2">{total.inferredRelationCount ?? 0}</td><td className="border px-2">{(total.inferredRelationCount ?? 0) * 2}</td></tr>
              <tr><td className="border px-2">Inferred Attributes</td><td className="border px-2">{total.inferredAttributeCount ?? 0}</td><td className="border px-2">{(total.inferredAttributeCount ?? 0) * 2}</td></tr>
              {/* Advanced Node Types */}
              <tr className="bg-indigo-50"><td className="border px-2 font-semibold">Advanced Node Types</td><td className="border px-2"></td><td className="border px-2"></td></tr>
              <tr><td className="border px-2">Transition Nodes</td><td className="border px-2">{total.transitionNodeCount ?? 0}</td><td className="border px-2">{(total.transitionNodeCount ?? 0) * 10}</td></tr>
              <tr><td className="border px-2">PolyNode Morphs</td><td className="border px-2">{total.polyNodeMorphCount ?? 0}</td><td className="border px-2">{(total.polyNodeMorphCount ?? 0) * 5}</td></tr>
              <tr><td className="border px-2">Function Nodes</td><td className="border px-2">{total.functionNodeCount ?? 0}</td><td className="border px-2">{(total.functionNodeCount ?? 0) * 10}</td></tr>
              {/* Cross-Graph Reuse */}
              <tr className="bg-green-100"><td className="border px-2 font-semibold">Cross-Graph Reuse</td><td className="border px-2"></td><td className="border px-2"></td></tr>
              <tr className="bg-green-50"><td className="border px-2">Cross-Graph Reuse</td><td className="border px-2">{total.crossGraphReuseCount ?? 0}</td><td className="border px-2">{(total.crossGraphReuseCount ?? 0) * 10}</td></tr>
              {/* Logical Composition */}
              <tr className="bg-red-50"><td className="border px-2 font-semibold">Logical Composition</td><td className="border px-2"></td><td className="border px-2"></td></tr>
              <tr><td className="border px-2">Logical Connectives</td><td className="border px-2">{total.logicalConnectiveCount ?? 0}</td><td className="border px-2">{(total.logicalConnectiveCount ?? 0) * 10}</td></tr>
              {/* Pathway Composition */}
              <tr className="bg-teal-50"><td className="border px-2 font-semibold">Pathway Composition</td><td className="border px-2"></td><td className="border px-2"></td></tr>
              <tr><td className="border px-2">Pathway Nodes</td><td className="border px-2">{total.pathwayNodeCount ?? 0}</td><td className="border px-2">{(total.pathwayNodeCount ?? 0) * 10}</td></tr>
              {/* Derived Attributes */}
              <tr className="bg-pink-50"><td className="border px-2 font-semibold">Derived Attributes</td><td className="border px-2"></td><td className="border px-2"></td></tr>
              <tr><td className="border px-2">Derived Attributes</td><td className="border px-2">{total.derivedAttributeCount ?? 0}</td><td className="border px-2">{(total.derivedAttributeCount ?? 0) * 10}</td></tr>
              {/* Total */}
              <tr className="font-bold bg-gray-50"><td className="border px-2">Total</td><td className="border px-2"></td><td className="border px-2">{total.total ?? 0}</td></tr>
            </tbody>
          </table>
          <div className="text-xs text-gray-500 mt-2">
            <p>Each row shows the score for a single graph. The last row is the workspace total.</p>
            <p>The rubric breakdown below shows the sum across all graphs.</p>
          </div>
        </>
      )}
    </div>
  );
}
