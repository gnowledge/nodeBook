// Utility to strip markdown (basic, for bold/italic/inline code/links)
function stripMarkdown(md) {
  if (!md) return "";
  return md
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1') // italic
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // links
    .replace(/_/g, '') // underscores
    .replace(/#+ /g, '') // headings
    .replace(/<.*?>/g, '') // html tags
    .replace(/!\[(.*?)\]\((.*?)\)/g, '$1') // images
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
} 

// ✅ Transform function to extract only relevant node and edge data
function ndfToCytoscapeGraph(ndfData) {
  const nodes = (ndfData.nodes || []).map(node => ({
    data: {
      id: node.node_id || node.id,
      label: stripMarkdown(node.name || node.node_id || node.id || ""),
      description: node.description || "",
      originalName: node.name || node.node_id || node.id || ""
    }
  }));

  // Handle relations from the top-level relations array
  const edges = (ndfData.relations || []).map((rel, i) => {
    let label = rel.type || rel.name || "";
    if (rel.adverb) {
      label = `${rel.adverb} ${label}`;
    }
    return {
      data: {
        id: `${rel.source}_${rel.type || rel.name}_${rel.target}_${i}`,
        source: rel.source,
        target: rel.target,
        label,
        adverb: rel.adverb || undefined
      }
    };
  });

  return { nodes, edges };
}

const CytoscapeStudio = ({ graph, prefs, graphId, onSummaryQueued }) => { 