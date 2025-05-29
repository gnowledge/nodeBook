// utils/normalizeGraphStructure.js

export function normalizeGraphStructure(graph) {
  const NODE_KEYS = ["id", "name", "role", "qualifier", "description", "attributes", "relations"];
  const ATTRIBUTE_KEYS = ["name", "quantifier", "value", "unit", "modality"];
  const RELATION_KEYS = ["name", "subject_quantifier", "subject", "object_quantifier", "object", "modality"];

  function reorder(obj, keys) {
    const reordered = {};
    keys.forEach((k) => {
      if (obj.hasOwnProperty(k)) reordered[k] = obj[k];
    });
    Object.keys(obj).forEach((k) => {
      if (!reordered.hasOwnProperty(k)) reordered[k] = obj[k];
    });
    return reordered;
  }

  const normalized = { ...graph };

  normalized.nodes = (graph.nodes || []).map((node) => {
    const reorderedNode = reorder(node, NODE_KEYS);
    reorderedNode.attributes = (node.attributes || []).map((a) => reorder(a, ATTRIBUTE_KEYS));
    reorderedNode.relations = (node.relations || []).map((r) => reorder(r, RELATION_KEYS));
    return reorderedNode;
  });

  return normalized;
}
