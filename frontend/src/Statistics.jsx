import React from "react";

// Scoring rubric (can be made editable in the future)
const RUBRIC = {
  node: 1,
  relation: 2,
  attribute: 3,
  nodeWithQualifier: 2,
  relationWithQualifier: 3,
  attributeWithQualifier: 3,
  quantified: 5,
  modality: 5,
  logicalConnective: 10,
};

export function computeStats(graph) {
  if (!graph || !graph.nodes) return null;
  let nodeCount = 0;
  let relationCount = 0;
  let attributeCount = 0;
  let nodeWithQualifier = 0;
  let relationWithQualifier = 0;
  let attributeWithQualifier = 0;
  let quantified = 0;
  let modality = 0;
  let logicalConnective = 0;

  for (const node of graph.nodes) {
    nodeCount++;
    if (node.qualifier) nodeWithQualifier++;
    if (node.attributes) {
      for (const attr of node.attributes) {
        attributeCount++;
        if (attr.quantifier) quantified++;
        if (attr.modality) modality++;
        if (attr.qualifier) attributeWithQualifier++;
      }
    }
    if (node.relations) {
      for (const rel of node.relations) {
        relationCount++;
        if (rel.quantifier) quantified++;
        if (rel.modality) modality++;
        if (rel.qualifier) relationWithQualifier++;
        if (rel.logical_connective) logicalConnective++;
      }
    }
  }

  // Total score calculation
  const total =
    nodeCount * RUBRIC.node +
    relationCount * RUBRIC.relation +
    attributeCount * RUBRIC.attribute +
    nodeWithQualifier * RUBRIC.nodeWithQualifier +
    relationWithQualifier * RUBRIC.relationWithQualifier +
    attributeWithQualifier * RUBRIC.attributeWithQualifier +
    quantified * RUBRIC.quantified +
    modality * RUBRIC.modality +
    logicalConnective * RUBRIC.logicalConnective;

  return {
    nodeCount,
    relationCount,
    attributeCount,
    nodeWithQualifier,
    relationWithQualifier,
    attributeWithQualifier,
    quantified,
    modality,
    logicalConnective,
    total,
  };
}

export default function Statistics({ userId, graphId, graph }) {
  const stats = computeStats(graph);
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-2">Graph Scorecard</h2>
      <div className="text-gray-600 mb-4">
        <p>User: <b>{userId}</b></p>
        <p>Graph: <b>{graphId}</b></p>
      </div>
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
