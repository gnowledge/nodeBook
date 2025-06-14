import NodeCard from "./NodeCard";
import React, { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";
import { marked } from "marked";

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
      id: node.node_id || node.id,
      label: stripMarkdown(node.name || node.node_id || node.id),
      description: node.description || "",
      originalName: node.name || node.node_id || node.id
    }
  }));

  // Only show direct (non-inverse, non-inferred) relations in the main graph
  const edges = (ndfData.nodes || []).flatMap((node) =>
    (node.relations || [])
      .filter(rel => !rel.is_inverse && !rel.is_inferred)
      .map((rel, i) => {
        let label = rel.type || rel.name || "";
        if (rel.adverb) {
          label = `${rel.adverb} ${label}`;
        }
        return {
          data: {
            id: `${(node.node_id || node.id)}_${rel.type || rel.name}_${rel.target}_${i}`,
            source: node.node_id || node.id,
            target: rel.target,
            label,
            adverb: rel.adverb || undefined
          }
        };
      })
  );

  return { nodes, edges };
}

const CytoscapeStudio = ({ graph, prefs, userId, graphId, onSummaryQueued }) => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
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
                  "background-color": "#f3f4f6", // light grey
                  "color": "#2563eb", // blue-600
                  "text-outline-width": 0,
                  "font-size": 14,
                  "width": "label",
                  "height": "label",
                  "padding": "10px",
                  "border-width": 0.5,
                  "border-color": "#2563eb", // blue-600
                  "border-style": "solid",
                  "shape": "roundrectangle"
                }
              },
              {
                selector: "edge",
                style: {
                  label: "data(label)",
                  "curve-style": "bezier",
                  "target-arrow-shape": "triangle",
                  "width": 1,
                  "line-color": "#ccc",
                  "target-arrow-color": "#ccc",
                  "font-size": 9,
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
            setSelectedEdge(null);
            const nodeId = evt.target.data("id");
            const nodeObj = (graph.nodes || []).find(n => n.node_id === nodeId || n.id === nodeId);
            if (nodeObj) setSelectedNode(nodeObj);
          });
          cyRef.current.on("tap", "edge", (evt) => {
            setSelectedNode(null);
            const edgeData = evt.target.data();
            // Find source/target node objects
            const sourceNode = (graph.nodes || []).find(n => n.node_id === edgeData.source || n.id === edgeData.source);
            const targetNode = (graph.nodes || []).find(n => n.node_id === edgeData.target || n.id === edgeData.target);
            setSelectedEdge({
              edge: edgeData,
              sourceNode,
              targetNode
            });
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

  // Helper to render markdown inline
  function renderMarkdownInline(md) {
    return <span dangerouslySetInnerHTML={{ __html: marked.parseInline(md) }} />;
  }

  return (
    <>
      <div ref={containerRef} className="w-full h-[600px] min-h-[400px]" />
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={() => setSelectedNode(null)}>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-xl" onClick={() => setSelectedNode(null)}>&times;</button>
            <NodeCard 
              node={selectedNode} 
              userId={userId}
              graphId={graphId}
              onSummaryQueued={onSummaryQueued}
            />
          </div>
        </div>
      )}
      {selectedEdge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={() => setSelectedEdge(null)}>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-xl" onClick={() => setSelectedEdge(null)}>&times;</button>
            <div className="text-lg font-semibold text-blue-700 mb-2">
              {renderMarkdownInline(selectedEdge.sourceNode?.name || selectedEdge.sourceNode?.node_id || "")}
              {" "}
              {selectedEdge.edge.adverb && (
                <span className="font-bold text-purple-700 mr-1">{selectedEdge.edge.adverb}</span>
              )}
              {renderMarkdownInline(selectedEdge.edge.label.replace(selectedEdge.edge.adverb ? selectedEdge.edge.adverb + ' ' : '', '') || "")}
              {" "}
              {renderMarkdownInline(selectedEdge.targetNode?.name || selectedEdge.targetNode?.node_id || "")}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CytoscapeStudio;
