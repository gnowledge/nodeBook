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
            const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/composed`);
            if (!res.ok) throw new Error();
            const graph = await res.json();
            const stats = computeStats(graph);
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
                  <td className="border px-2 font-bold">{stats?.total ?? "-"}</td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-50">
                <td className="border px-2">Total</td>
                <td className="border px-2">{total.nodeCount ?? 0}</td>
                <td className="border px-2">{total.relationCount ?? 0}</td>
                <td className="border px-2">{total.attributeCount ?? 0}</td>
                <td className="border px-2">{total.total ?? 0}</td>
              </tr>
            </tbody>
          </table>
          <div className="text-xs text-gray-500 mt-2">
            <p>Each row shows the score for a single graph. The last row is the workspace total.</p>
          </div>
        </>
      )}
    </div>
  );
}
