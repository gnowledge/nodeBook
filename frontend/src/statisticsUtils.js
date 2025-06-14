// statisticsUtils.js
// Utility for computing graph statistics (moved from Statistics.jsx)

export const RUBRIC = {
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
