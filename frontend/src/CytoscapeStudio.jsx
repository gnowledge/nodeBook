import NodeCard from "./NodeCard";
import React, { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";

cytoscape.use(dagre);

// Utility to strip markdown (basic, for bold/italic/inline code/links)
function stripMarkdown(md) {
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
      id: node.node_id,
      label: stripMarkdown(node.name || node.node_id), // label is plain text
      description: node.description || "",
      originalName: node.name || node.node_id // keep original for tooltips
    }
  }));
    console.log("🧠 Nodes in graph:", ndfData.nodes);

  const edges = (ndfData.nodes || []).flatMap((node) =>
    (node.relations || []).map((rel, i) => ({
      data: {
        id: `${node.node_id}_${rel.name}_${rel.target}_${i}`,
        source: node.node_id,
        target: rel.target,
        label: rel.name
      }
    }))
  );

  return { nodes, edges };
}

const CytoscapeStudio = ({ graph, prefs }) => {
  const [selectedNode, setSelectedNode] = useState(null);
  // If graph is actually raw_markdown, try to extract parsed YAML if present
  const parsedGraph = graph && graph.nodes ? graph : null;
  if (!parsedGraph) {
    console.warn("CytoscapeStudio: graph prop is not parsed YAML. Got:", graph);
    return <div className="p-4 text-red-600">No parsed graph data available for visualization.</div>;
  }

    console.log("📊 graph data:", graph);
    
    console.log("CytoscapeStudio graph prop:", graph);
  const cyRef = useRef(null);
  const containerRef = useRef(null);
  // Track mount state to force re-init on remount
  const mountedRef = useRef(false);

  // Always clean up on unmount
  useEffect(() => {
    mountedRef.current = true;
    // Always initialize Cytoscape on mount
    if (graph && graph.nodes) {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
      const checkAndInit = () => {
        if (
          containerRef.current &&
          containerRef.current.offsetWidth > 0 &&
          containerRef.current.offsetHeight > 0 &&
          document.body.contains(containerRef.current) &&
          mountedRef.current
        ) {
          const { nodes, edges } = ndfToCytoscapeGraph(graph);
          cyRef.current = cytoscape({
            container: containerRef.current,
            elements: [...nodes, ...edges],
            style: [
              {
                selector: "node",
                style: {
                  label: "data(label)",
                  "text-valign": "center",
                  "text-halign": "center",
                  "background-color": "#4A90E2",
                  "color": "#fff",
                  "text-outline-width": 2,
                  "text-outline-color": "#4A90E2",
                  "font-size": 14,
                  "width": "label",
                  "height": "label",
                  "padding": "10px"
                }
              },
              {
                selector: "edge",
                style: {
                  label: "data(label)",
                  "curve-style": "bezier",
                  "target-arrow-shape": "triangle",
                  "width": 2,
                  "line-color": "#ccc",
                  "target-arrow-color": "#ccc",
                  "font-size": 12,
                  "text-background-color": "#fff",
                  "text-background-opacity": 1,
                  "text-background-padding": "2px"
                }
              }
            ],
            layout: {
              name: prefs?.graphLayout || "dagre"
            }
          });
          cyRef.current.on("mouseover", "node", (evt) => {
            const desc = evt.target.data("description") || "No description";
            console.log("Node description:", desc);
          });
          cyRef.current.on("tap", "node", (evt) => {
            const nodeId = evt.target.data("id");
            // Find the full node object from graph.nodes
            const nodeObj = (graph.nodes || []).find(n => n.node_id === nodeId || n.id === nodeId);
            if (nodeObj) setSelectedNode(nodeObj);
          });
        } else {
          setTimeout(checkAndInit, 100);
        }
      };
      checkAndInit();
    }
    return () => {
      mountedRef.current = false;
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [graph, prefs]);

  return (
    <>
      <div ref={containerRef} className="w-full h-[600px] min-h-[400px]" />
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={() => setSelectedNode(null)}>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-xl" onClick={() => setSelectedNode(null)}>&times;</button>
            <NodeCard node={selectedNode} />
          </div>
        </div>
      )}
    </>
  );
};

export default CytoscapeStudio;
