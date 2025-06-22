import NodeCard from "./NodeCard";
import React, { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";
import { marked } from "marked";
import { useUserId } from "./UserIdContext";

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
  console.log("🔄 ndfToCytoscapeGraph called with:", ndfData);
  
  // Handle polymorphic data structure (nodes, relations, attributes)
  if (ndfData.nodes && ndfData.relations && ndfData.attributes) {
    console.log("🔄 Processing polymorphic data structure");
    
    const nodes = [];
    const edges = [];
    const value_node_ids = new Set();
    
    // Process nodes (PolyNodes)
    for (const node of ndfData.nodes) {
      const node_id = node.node_id || node.id;
      const label = stripMarkdown(node.name || node_id || "");
      
      nodes.push({
        data: {
          id: node_id,
          label: label,
          description: node.description || "",
          originalName: node.name || node_id || "",
          type: "polynode"
        }
      });
      
      // Process morphs and neighborhoods if present
      const morphs = node.morphs;
      const nbh = node.nbh;
      
      if (morphs && nbh) {
        // Find the active morph (neighborhood)
        const active_morph = morphs.find(m => m.morph_id === nbh);
        if (active_morph) {
          // Process RelationNode edges from active morph
          for (const rel_id of active_morph.relationNode_ids || []) {
            const rel = ndfData.relations.find(r => r.id === rel_id);
            if (rel) {
              edges.push({
                data: {
                  id: rel.id,
                  source: rel.source_id,
                  target: rel.target_id,
                  label: rel.name,
                  type: "relation"
                }
              });
            }
          }
          
          // Process AttributeNode edges from active morph
          for (const attr_id of active_morph.attributeNode_ids || []) {
            const attr = ndfData.attributes.find(a => a.id === attr_id);
            if (attr) {
              const value_node_id = `attrval_${attr.id}`;
              
              // Add value node if not already present
              if (!value_node_ids.has(value_node_id)) {
                // Create a more descriptive label for the value node
                let value_label = String(attr.value);
                if (attr.unit) {
                  value_label += ` ${attr.unit}`;
                }
                if (attr.adverb) {
                  value_label = `${attr.adverb} ${value_label}`;
                }
                
                nodes.push({
                  data: {
                    id: value_node_id,
                    label: value_label,
                    type: "attribute_value"
                  }
                });
                value_node_ids.add(value_node_id);
              }
              
              edges.push({
                data: {
                  id: attr.id,
                  source: attr.source_id,
                  target: value_node_id,
                  label: `has ${attr.name}`,
                  type: "attribute"
                }
              });
            }
          }
        }
      }
    }
    
    const result = { nodes, edges };
    console.log("🔄 Final transformed result (polymorphic):", result);
    return result;
  }
  
  // Handle legacy Cytoscape format (nodes, edges)
  if (ndfData.nodes && ndfData.edges) {
    console.log("🔄 Processing legacy Cytoscape format");
    return ndfData;
  }
  
  // Handle legacy NDF format with embedded relations
  console.log("🔄 Processing legacy NDF format with embedded relations");
  const nodes = (ndfData.nodes || []).map(node => {
    const transformedNode = {
      data: {
        id: node.node_id || node.id,
        label: stripMarkdown(node.name || node.node_id || node.id || ""),
        description: node.description || "",
        originalName: node.name || node.node_id || node.id || ""
      }
    };
    console.log("🔄 Transformed node:", transformedNode);
    return transformedNode;
  });

  // Handle relations from the top-level relations array
  const edges = (ndfData.relations || []).map((rel, i) => {
    let label = rel.type || rel.name || "";
    if (rel.adverb) {
      label = `${rel.adverb} ${label}`;
    }
    const transformedEdge = {
      data: {
        id: `${rel.source_id || rel.source}_${rel.type || rel.name}_${rel.target_id || rel.target}_${i}`,
        source: rel.source_id || rel.source,
        target: rel.target_id || rel.target,
        label,
        adverb: rel.adverb || undefined
      }
    };
    console.log("🔄 Transformed edge:", transformedEdge);
    return transformedEdge;
  });

  const result = { nodes, edges };
  console.log("🔄 Final transformed result (legacy):", result);
  return result;
}

const CytoscapeStudio = ({ graph, prefs, graphId, onSummaryQueued, graphRelations = [], graphAttributes = [] }) => {
  const userId = useUserId();
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [graphData, setGraphData] = useState(graph);

  // If graph is actually raw_markdown, try to extract parsed YAML if present
  const parsedGraph = graphData && graphData.nodes ? graphData : null;
  if (!parsedGraph) {
    console.warn("CytoscapeStudio: graph prop is not parsed YAML. Got:", graphData);
    return <div className="p-4 text-red-600">No parsed graph data available for visualization.</div>;
  }

    console.log("📊 graph data:", graph);
    
    console.log("CytoscapeStudio graph prop:", graph);
  const cyRef = useRef(null);
  const containerRef = useRef(null);
  // Track mount state to force re-init on remount
  const mountedRef = useRef(false);

  // Monitor container dimensions
  useEffect(() => {
    const checkContainer = () => {
      if (containerRef.current) {
        console.log("📏 Container dimensions:", {
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
          clientWidth: containerRef.current.clientWidth,
          clientHeight: containerRef.current.clientHeight,
          scrollWidth: containerRef.current.scrollWidth,
          scrollHeight: containerRef.current.scrollHeight
        });
      }
    };
    
    checkContainer();
    const interval = setInterval(checkContainer, 1000);
    return () => clearInterval(interval);
  }, []);

  // Always clean up on unmount
  useEffect(() => {
    mountedRef.current = true;
    console.log("🔄 useEffect triggered with graph:", graph);
    console.log("🔄 graph.nodes:", graph?.nodes);
    console.log("🔄 graphData:", graphData);
    
    // Always initialize Cytoscape on mount
    if (graph && graph.nodes) {
      console.log("✅ Graph has nodes, proceeding with initialization");
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
      const checkAndInit = () => {
        console.log("🔍 Checking container dimensions...");
        console.log("🔍 containerRef.current:", containerRef.current);
        console.log("🔍 container width:", containerRef.current?.offsetWidth);
        console.log("🔍 container height:", containerRef.current?.offsetHeight);
        console.log("🔍 document.body.contains:", document.body.contains(containerRef.current));
        console.log("🔍 mountedRef.current:", mountedRef.current);
        
        if (
          containerRef.current &&
          containerRef.current.offsetWidth > 0 &&
          containerRef.current.offsetHeight > 0 &&
          document.body.contains(containerRef.current) &&
          mountedRef.current
        ) {
          console.log("✅ Container ready, transforming graph data...");
          const { nodes, edges } = ndfToCytoscapeGraph(graph);
          console.log("✅ Transformed nodes:", nodes);
          console.log("✅ Transformed edges:", edges);
          
          // Validate that all edge sources and targets exist in nodes
          const nodeIds = new Set(nodes.map(n => n.data.id));
          const invalidEdges = edges.filter(edge => {
            const sourceExists = nodeIds.has(edge.data.source);
            const targetExists = nodeIds.has(edge.data.target);
            if (!sourceExists || !targetExists) {
              console.error(`❌ Invalid edge: ${edge.data.id}`);
              console.error(`   Source '${edge.data.source}' exists: ${sourceExists}`);
              console.error(`   Target '${edge.data.target}' exists: ${targetExists}`);
              console.error(`   Available node IDs:`, Array.from(nodeIds));
              return true;
            }
            return false;
          });
          
          if (invalidEdges.length > 0) {
            console.error(`❌ Found ${invalidEdges.length} invalid edges, filtering them out`);
            const validEdges = edges.filter(edge => {
              const sourceExists = nodeIds.has(edge.data.source);
              const targetExists = nodeIds.has(edge.data.target);
              return sourceExists && targetExists;
            });
            console.log("✅ Valid edges:", validEdges);
            
            cyRef.current = cytoscape({
              container: containerRef.current,
              elements: [...nodes, ...validEdges],
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
                  selector: "node[type = 'attribute_value']",
                  style: {
                    label: "data(label)",
                    "text-valign": "center",
                    "text-halign": "center",
                    "background-color": "#fef3c7", // light yellow
                    "color": "#92400e", // amber-800
                    "text-outline-width": 0,
                    "font-size": 12,
                    "width": "label",
                    "height": "label",
                    "padding": "8px",
                    "border-width": 0.5,
                    "border-color": "#92400e", // amber-800
                    "border-style": "solid",
                    "shape": "rectangle" // rectangular shape for attribute values
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
                },
                {
                  selector: "edge[type = 'attribute']",
                  style: {
                    label: "data(label)",
                    "curve-style": "bezier",
                    "target-arrow-shape": "triangle",
                    "width": 2,
                    "line-color": "#92400e", // amber-800
                    "target-arrow-color": "#92400e", // amber-800
                    "font-size": 10,
                    "text-background-color": "#fef3c7",
                    "text-background-opacity": 1,
                    "text-background-padding": "2px",
                    "color": "#92400e" // amber-800
                  }
                }
              ],
              layout: {
                name: prefs?.graphLayout || "dagre"
              }
            });
            console.log("✅ Cytoscape initialized successfully (with filtered edges)");
          } else {
            console.log("✅ All edges are valid, proceeding with full graph");
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
                  selector: "node[type = 'attribute_value']",
                  style: {
                    label: "data(label)",
                    "text-valign": "center",
                    "text-halign": "center",
                    "background-color": "#fef3c7", // light yellow
                    "color": "#92400e", // amber-800
                    "text-outline-width": 0,
                    "font-size": 12,
                    "width": "label",
                    "height": "label",
                    "padding": "8px",
                    "border-width": 0.5,
                    "border-color": "#92400e", // amber-800
                    "border-style": "solid",
                    "shape": "rectangle" // rectangular shape for attribute values
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
                },
                {
                  selector: "edge[type = 'attribute']",
                  style: {
                    label: "data(label)",
                    "curve-style": "bezier",
                    "target-arrow-shape": "triangle",
                    "width": 2,
                    "line-color": "#92400e", // amber-800
                    "target-arrow-color": "#92400e", // amber-800
                    "font-size": 10,
                    "text-background-color": "#fef3c7",
                    "text-background-opacity": 1,
                    "text-background-padding": "2px",
                    "color": "#92400e" // amber-800
                  }
                }
              ],
              layout: {
                name: prefs?.graphLayout || "dagre"
              }
            });
            console.log("✅ Cytoscape initialized successfully");
          }
          
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
          console.log("⏳ Container not ready, retrying in 100ms...");
          setTimeout(checkAndInit, 100);
        }
      };
      checkAndInit();
    } else {
      console.log("❌ Graph is missing or has no nodes");
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
    return <span dangerouslySetInnerHTML={{ __html: marked.parseInline(md || '') }} />;
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
              graphRelations={graphRelations}
              graphAttributes={graphAttributes}
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
