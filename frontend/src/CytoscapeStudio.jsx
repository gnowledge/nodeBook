import NodeCard from "./NodeCard";
import React, { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";
import { marked } from "marked";
import { useUserInfo } from "./UserIdContext";
import TransitionCard from "./TransitionCard";

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
      
      // Determine the label based on morphs
      let label = stripMarkdown(node.name || node_id || "");
      const morphs = node.morphs;
      const nbh = node.nbh;
      
      // If polymorphic and has multiple morphs, use the active morph name
      if (morphs && morphs.length > 1 && nbh) {
        const activeMorph = morphs.find(m => m.morph_id === nbh);
        if (activeMorph) {
          // If it's the basic morph (first morph), use polynode name
          const isBasicMorph = morphs.indexOf(activeMorph) === 0;
          if (isBasicMorph) {
            // Keep the original polynode name
            label = stripMarkdown(node.name || node_id || "");
          } else if (activeMorph.name) {
            // For non-basic morphs, use the morph name
            label = stripMarkdown(activeMorph.name);
          }
        }
      }
      
      nodes.push({
        data: {
          id: node_id,
          label: label,
          description: node.description || "",
          originalName: node.name || node_id || "",
          type: "polynode",
          currentMorph: nbh || null,
          morphs: morphs || []
        }
      });
      
      // Process morphs and neighborhoods if present
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
                
                // Add attribute value node with rectangular styling
                nodes.push({
                  data: {
                    id: value_node_id,
                    label: value_label,
                    type: "attribute_value",
                    attributeName: attr.name,
                    attributeUnit: attr.unit,
                    attributeAdverb: attr.adverb
                  }
                });
                
                // Add edge from source node to attribute value
                edges.push({
                  data: {
                    id: attr.id,
                    source: attr.source_id,
                    target: value_node_id,
                    label: `has ${attr.name}`,
                    type: "attribute"
                  }
                });
                
                value_node_ids.add(value_node_id);
              }
            }
          }
        }
      }
    }
    
    // Process transitions if present
    if (ndfData.transitions && ndfData.transitions.length > 0) {
      console.log("🔄 Processing transitions:", ndfData.transitions);
      
      for (const transition of ndfData.transitions) {
        // Add transition node
        const transitionNodeId = `transition_${transition.id}`;
        
        // Create a more descriptive label for the transition
        let transitionLabel = transition.name || transition.id;
        if (transition.adjective) {
          transitionLabel = `${transition.adjective} ${transitionLabel}`;
        }
        
        nodes.push({
          data: {
            id: transitionNodeId,
            label: transitionLabel,
            description: transition.description || "",
            tense: transition.tense || "present",
            type: "transition"
          }
        });
        
        // Add input edges (from input nodes to transition)
        for (const input of transition.inputs || []) {
          const inputNodeId = input.id;
          const inputMorphId = input.nbh;
          
          // Find the input node to get morph information
          const inputNode = ndfData.nodes.find(n => (n.node_id || n.id) === inputNodeId);
          let inputLabel = "from";
          if (inputMorphId && inputNode?.morphs) {
            const inputMorph = inputNode.morphs.find(m => m.morph_id === inputMorphId);
            if (inputMorph) {
              const morphIndex = inputNode.morphs.indexOf(inputMorph);
              inputLabel = morphIndex === 0 ? "from basic" : `from ${inputMorph.name || `morph ${morphIndex}`}`;
            }
          }
          
          // Create edge from input node to transition
          edges.push({
            data: {
              id: `input_${transition.id}_${inputNodeId}`,
              source: inputNodeId,
              target: transitionNodeId,
              label: inputLabel,
              type: "transition_input"
            }
          });
        }
        
        // Add output edges (from transition to output nodes)
        for (const output of transition.outputs || []) {
          const outputNodeId = output.id;
          const outputMorphId = output.nbh;
          
          // Find the output node to get morph information
          const outputNode = ndfData.nodes.find(n => (n.node_id || n.id) === outputNodeId);
          let outputLabel = "to";
          if (outputMorphId && outputNode?.morphs) {
            const outputMorph = outputNode.morphs.find(m => m.morph_id === outputMorphId);
            if (outputMorph) {
              const morphIndex = outputNode.morphs.indexOf(outputMorph);
              outputLabel = morphIndex === 0 ? "to basic" : `to ${outputMorph.name || `morph ${morphIndex}`}`;
            }
          }
          
          // Create edge from transition to output node
          edges.push({
            data: {
              id: `output_${transition.id}_${outputNodeId}`,
              source: transitionNodeId,
              target: outputNodeId,
              label: outputLabel,
              type: "transition_output"
            }
          });
        }
        
        // Add invisible edges to help with layout positioning
        // Connect transition to its primary input node with a very short edge
        if (transition.inputs && transition.inputs.length > 0) {
          const primaryInput = transition.inputs[0];
          edges.push({
            data: {
              id: `layout_${transition.id}_${primaryInput.id}`,
              source: primaryInput.id,
              target: transitionNodeId,
              label: "",
              type: "layout_helper",
              invisible: true
            }
          });
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
  const { userId } = useUserInfo();
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [graphData, setGraphData] = useState(graph);
  const [isSimulationMode, setIsSimulationMode] = useState(false);

  // Update graphData when graph prop changes (but preserve in-memory changes during simulation)
  useEffect(() => {
    if (!isSimulationMode) {
      console.log("🔄 Updating graphData from graph prop");
      setGraphData(graph);
    } else {
      console.log("🔄 Skipping graphData update - in simulation mode");
    }
  }, [graph, isSimulationMode]);

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
          // Use graphData state if available, otherwise fall back to graph prop
          const currentGraphData = graphData || graph;
          const { nodes, edges } = ndfToCytoscapeGraph(currentGraphData);
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
                  selector: "node[type = 'transition']",
                  style: {
                    label: "data(label)",
                    "text-valign": "center",
                    "text-halign": "center",
                    "background-color": "#dbeafe", // light blue
                    "color": "#1e40af", // blue-800
                    "text-outline-width": 0,
                    "font-size": 11,
                    "width": "label",
                    "height": "label",
                    "padding": "10px",
                    "border-width": 2,
                    "border-color": "#1e40af", // blue-800
                    "border-style": "solid",
                    "shape": "roundrectangle", // Changed from diamond to roundrectangle for better dagre compatibility
                    "text-wrap": "wrap",
                    "text-max-width": "80px"
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
                },
                {
                  selector: "edge[type = 'transition_input']",
                  style: {
                    label: "data(label)",
                    "curve-style": "bezier",
                    "target-arrow-shape": "triangle",
                    "width": 3,
                    "line-color": "#1e40af", // blue-800
                    "target-arrow-color": "#1e40af", // blue-800
                    "font-size": 10,
                    "text-background-color": "#dbeafe",
                    "text-background-opacity": 1,
                    "text-background-padding": "3px",
                    "color": "#1e40af", // blue-800
                    "line-style": "solid"
                  }
                },
                {
                  selector: "edge[type = 'transition_output']",
                  style: {
                    label: "data(label)",
                    "curve-style": "bezier",
                    "target-arrow-shape": "triangle",
                    "width": 3,
                    "line-color": "#059669", // emerald-600
                    "target-arrow-color": "#059669", // emerald-600
                    "font-size": 10,
                    "text-background-color": "#d1fae5",
                    "text-background-opacity": 1,
                    "text-background-padding": "3px",
                    "color": "#059669", // emerald-600
                    "line-style": "solid"
                  }
                },
                {
                  selector: "edge[type = 'layout_helper']",
                  style: {
                    "curve-style": "bezier",
                    "width": 0.5,
                    "line-color": "transparent",
                    "target-arrow-shape": "none",
                    "opacity": 0.1
                  }
                }
              ],
              layout: {
                name: prefs?.graphLayout || "dagre",
                rankDir: "LR", // Left to right for better transition grouping
                nodeDimensionsIncludeLabels: true,
                animate: false,
                padding: 50,
                spacingFactor: 1.2, // Reduced spacing for tighter grouping
                rankSep: 80, // Reduced rank separation
                nodeSep: 40, // Reduced node separation
                edgeSep: 15, // Reduced edge separation
                ranker: "network-simplex",
                // Force proper layout
                fit: true,
                // Ensure nodes don't overlap
                nodeOverlap: 20,
                // Prevent horizontal layout fallback
                align: "UL", // Upper left alignment
                // Additional spacing
                marginX: 50,
                marginY: 50
              }
            });
            
            // Add debugging for layout
            console.log("🔧 Layout configuration:", {
              prefs: prefs,
              graphLayout: prefs?.graphLayout,
              finalLayout: prefs?.graphLayout || "dagre"
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
                  selector: "node[type = 'transition']",
                  style: {
                    label: "data(label)",
                    "text-valign": "center",
                    "text-halign": "center",
                    "background-color": "#dbeafe", // light blue
                    "color": "#1e40af", // blue-800
                    "text-outline-width": 0,
                    "font-size": 11,
                    "width": "label",
                    "height": "label",
                    "padding": "10px",
                    "border-width": 2,
                    "border-color": "#1e40af", // blue-800
                    "border-style": "solid",
                    "shape": "roundrectangle", // Changed from diamond to roundrectangle for better dagre compatibility
                    "text-wrap": "wrap",
                    "text-max-width": "80px"
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
                },
                {
                  selector: "edge[type = 'transition_input']",
                  style: {
                    label: "data(label)",
                    "curve-style": "bezier",
                    "target-arrow-shape": "triangle",
                    "width": 3,
                    "line-color": "#1e40af", // blue-800
                    "target-arrow-color": "#1e40af", // blue-800
                    "font-size": 10,
                    "text-background-color": "#dbeafe",
                    "text-background-opacity": 1,
                    "text-background-padding": "3px",
                    "color": "#1e40af", // blue-800
                    "line-style": "solid"
                  }
                },
                {
                  selector: "edge[type = 'transition_output']",
                  style: {
                    label: "data(label)",
                    "curve-style": "bezier",
                    "target-arrow-shape": "triangle",
                    "width": 3,
                    "line-color": "#059669", // emerald-600
                    "target-arrow-color": "#059669", // emerald-600
                    "font-size": 10,
                    "text-background-color": "#d1fae5",
                    "text-background-opacity": 1,
                    "text-background-padding": "3px",
                    "color": "#059669", // emerald-600
                    "line-style": "solid"
                  }
                },
                {
                  selector: "edge[type = 'layout_helper']",
                  style: {
                    "curve-style": "bezier",
                    "width": 0.5,
                    "line-color": "transparent",
                    "target-arrow-shape": "none",
                    "opacity": 0.1
                  }
                }
              ],
              layout: {
                name: prefs?.graphLayout || "dagre",
                rankDir: "LR", // Left to right for better transition grouping
                nodeDimensionsIncludeLabels: true,
                animate: false,
                padding: 50,
                spacingFactor: 1.2, // Reduced spacing for tighter grouping
                rankSep: 80, // Reduced rank separation
                nodeSep: 40, // Reduced node separation
                edgeSep: 15, // Reduced edge separation
                ranker: "network-simplex",
                // Force proper layout
                fit: true,
                // Ensure nodes don't overlap
                nodeOverlap: 20,
                // Prevent horizontal layout fallback
                align: "UL", // Upper left alignment
                // Additional spacing
                marginX: 50,
                marginY: 50
              }
            });
            
            // Add debugging for layout
            console.log("🔧 Layout configuration (full graph):", {
              prefs: prefs,
              graphLayout: prefs?.graphLayout,
              finalLayout: prefs?.graphLayout || "dagre"
            });
            
            console.log("✅ Cytoscape initialized successfully");
          }
          
          cyRef.current.on("mouseover", "node", (evt) => {
            const desc = evt.target.data("description") || "No description";
            console.log("Node description:", desc);
          });
          
          // Add specific handling for transition nodes
          cyRef.current.on("mouseover", "node[type = 'transition']", (evt) => {
            // Change cursor to indicate clickability
            evt.target.style('cursor', 'pointer');
          });
          
          cyRef.current.on("mouseout", "node[type = 'transition']", (evt) => {
            // Reset cursor
            evt.target.style('cursor', 'default');
          });
          
          cyRef.current.on("tap", "node", (evt) => {
            setSelectedEdge(null);
            const nodeId = evt.target.data("id");
            const nodeType = evt.target.data("type");
            
            // Handle transition nodes differently
            if (nodeType === "transition") {
              // Use current graphData state instead of original graph prop
              const currentGraphData = graphData || graph;
              const transition = (currentGraphData.transitions || []).find(t => 
                `transition_${t.id}` === nodeId || t.id === nodeId
              );
              if (transition) {
                // Execute the transition instead of showing a card
                executeTransition(transition);
                return;
              }
            }
            
            // Handle regular nodes
            const currentGraphData = graphData || graph;
            const nodeObj = (currentGraphData.nodes || []).find(n => n.node_id === nodeId || n.id === nodeId);
            if (nodeObj) setSelectedNode(nodeObj);
          });
          cyRef.current.on("tap", "edge", (evt) => {
            setSelectedNode(null);
            const edgeData = evt.target.data();
            // Use current graphData state instead of original graph prop
            const currentGraphData = graphData || graph;
            // Find source/target node objects
            const sourceNode = (currentGraphData.nodes || []).find(n => n.node_id === edgeData.source || n.id === edgeData.source);
            const targetNode = (currentGraphData.nodes || []).find(n => n.node_id === edgeData.target || n.id === edgeData.target);
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
      // Clean up any remaining tooltips
      const tooltips = document.querySelectorAll('.transition-tooltip');
      tooltips.forEach(tooltip => tooltip.remove());
    };
  }, [graph, graphData, prefs]);

  // Helper to render markdown inline
  function renderMarkdownInline(md) {
    return <span dangerouslySetInnerHTML={{ __html: marked.parseInline(md || '') }} />;
  }

  // Execute a soft transition by changing input node morphs to output morphs (in-memory only)
  const executeTransition = async (transition) => {
    console.log("🔄 Executing soft transition:", transition);
    
    // Clean up any existing tooltips
    const tooltips = document.querySelectorAll('.transition-tooltip');
    tooltips.forEach(tooltip => tooltip.remove());
    
    // Show loading message
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'transition-loading-message';
    loadingMessage.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #3b82f6;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      animation: slideIn 0.3s ease-out;
    `;
    loadingMessage.textContent = `Simulating transition "${transition.name}"...`;
    document.body.appendChild(loadingMessage);
    
    try {
      // Use the current graphData state instead of the original graph prop
      // This ensures we work with the latest in-memory changes
      const currentGraphData = graphData || graph;
      const inMemoryGraph = JSON.parse(JSON.stringify(currentGraphData));
      
      // For each input-output pair, determine the direction and update the node's morph in memory
      const updatedNodes = [];
      for (let i = 0; i < transition.outputs.length; i++) {
        const output = transition.outputs[i];
        const input = transition.inputs[i]; // Corresponding input
        const nodeId = output.id;
        const outputMorphId = output.nbh;
        const inputMorphId = input.nbh;
        
        // Find the node in the in-memory graph
        const node = (inMemoryGraph.nodes || []).find(n => (n.node_id || n.id) === nodeId);
        if (!node) {
          console.error(`Node ${nodeId} not found in graph`);
          continue;
        }

        // Determine the direction: if current morph matches input, go to output; otherwise go back to input
        const currentMorphId = node.nbh;
        let targetMorphId;
        let direction;
        
        if (currentMorphId === inputMorphId) {
          // Currently in input state, go to output
          targetMorphId = outputMorphId;
          direction = 'forward';
        } else if (currentMorphId === outputMorphId) {
          // Currently in output state, go back to input
          targetMorphId = inputMorphId;
          direction = 'backward';
        } else {
          // Current state doesn't match either input or output, default to output
          targetMorphId = outputMorphId;
          direction = 'forward (default)';
        }

        // Update the node's neighborhood (morph) in memory
        const updatedNode = { ...node, nbh: targetMorphId };
        
        // Update the node in the in-memory graph
        const nodeIndex = inMemoryGraph.nodes.findIndex(n => (n.node_id || n.id) === nodeId);
        if (nodeIndex !== -1) {
          inMemoryGraph.nodes[nodeIndex] = updatedNode;
          updatedNodes.push(updatedNode);
        }

        console.log(`✅ Updated node ${nodeId} from ${currentMorphId} to ${targetMorphId} (${direction})`);
      }
      
      // Remove loading message
      if (loadingMessage.parentNode) {
        loadingMessage.remove();
      }
      
      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'transition-success-message';
      successMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
        white-space: pre-line;
      `;
      
      const changedNodes = updatedNodes.map(node => {
        const morph = node.morphs?.find(m => m.morph_id === node.nbh);
        if (morph) {
          const morphIndex = node.morphs.indexOf(morph);
          const morphName = morphIndex === 0 ? 'basic' : morph.name;
          return `• ${node.name || node.node_id}: ${morphName}`;
        }
        return `• ${node.name || node.node_id}: basic`;
      }).join('\n');
      
      // Determine if this was a forward or backward transition
      const isReversible = transition.inputs.length > 0 && transition.outputs.length > 0;
      const transitionType = isReversible ? " (reversible)" : "";
      
      successMessage.textContent = `Transition "${transition.name}"${transitionType} simulated!\n\nChanged nodes:\n${changedNodes}\n\n(In-memory only)\n\nClick again to reverse!`;
      document.body.appendChild(successMessage);
      
      // Remove success message after 3 seconds
      setTimeout(() => {
        if (successMessage.parentNode) {
          successMessage.remove();
        }
      }, 3000);
      
      // Update the local graph state with the in-memory changes
      setGraphData(inMemoryGraph);
      setIsSimulationMode(true);
      
      // Force Cytoscape to re-render with the new data
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
      
      // Trigger a re-initialization with the new graph data
      const checkAndInit = () => {
        if (
          containerRef.current &&
          containerRef.current.offsetWidth > 0 &&
          containerRef.current.offsetHeight > 0 &&
          document.body.contains(containerRef.current) &&
          mountedRef.current
        ) {
          console.log("🔄 Re-initializing Cytoscape with updated graph data...");
          const { nodes, edges } = ndfToCytoscapeGraph(inMemoryGraph);
          
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
                  "background-color": "#f3f4f6",
                  "color": "#2563eb",
                  "text-outline-width": 0,
                  "font-size": 14,
                  "width": "label",
                  "height": "label",
                  "padding": "10px",
                  "border-width": 0.5,
                  "border-color": "#2563eb",
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
                  "background-color": "#fef3c7",
                  "color": "#92400e",
                  "text-outline-width": 0,
                  "font-size": 12,
                  "width": "label",
                  "height": "label",
                  "padding": "8px",
                  "border-width": 0.5,
                  "border-color": "#92400e",
                  "border-style": "solid",
                  "shape": "rectangle"
                }
              },
              {
                selector: "node[type = 'transition']",
                style: {
                  label: "data(label)",
                  "text-valign": "center",
                  "text-halign": "center",
                  "background-color": "#dbeafe",
                  "color": "#1e40af",
                  "text-outline-width": 0,
                  "font-size": 11,
                  "width": "label",
                  "height": "label",
                  "padding": "10px",
                  "border-width": 2,
                  "border-color": "#1e40af",
                  "border-style": "solid",
                  "shape": "roundrectangle", // Changed from diamond to roundrectangle for better dagre compatibility
                  "text-wrap": "wrap",
                  "text-max-width": "80px"
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
                  "line-color": "#92400e",
                  "target-arrow-color": "#92400e",
                  "font-size": 10,
                  "text-background-color": "#fef3c7",
                  "text-background-opacity": 1,
                  "text-background-padding": "2px",
                  "color": "#92400e"
                }
              },
              {
                selector: "edge[type = 'transition_input']",
                style: {
                  label: "data(label)",
                  "curve-style": "bezier",
                  "target-arrow-shape": "triangle",
                  "width": 3,
                  "line-color": "#1e40af",
                  "target-arrow-color": "#1e40af",
                  "font-size": 10,
                  "text-background-color": "#dbeafe",
                  "text-background-opacity": 1,
                  "text-background-padding": "3px",
                  "color": "#1e40af",
                  "line-style": "solid"
                }
              },
              {
                selector: "edge[type = 'transition_output']",
                style: {
                  label: "data(label)",
                  "curve-style": "bezier",
                  "target-arrow-shape": "triangle",
                  "width": 3,
                  "line-color": "#059669", // emerald-600
                  "target-arrow-color": "#059669", // emerald-600
                  "font-size": 10,
                  "text-background-color": "#d1fae5",
                  "text-background-opacity": 1,
                  "text-background-padding": "3px",
                  "color": "#059669", // emerald-600
                  "line-style": "solid"
                }
              },
              {
                selector: "edge[type = 'layout_helper']",
                style: {
                  "curve-style": "bezier",
                  "width": 0.5,
                  "line-color": "transparent",
                  "target-arrow-shape": "none",
                  "opacity": 0.1
                }
              }
            ],
            layout: {
              name: prefs?.graphLayout || "dagre",
              rankDir: "LR", // Left to right for better transition grouping
              nodeDimensionsIncludeLabels: true,
              animate: false,
              padding: 50,
              spacingFactor: 1.2, // Reduced spacing for tighter grouping
              rankSep: 80, // Reduced rank separation
              nodeSep: 40, // Reduced node separation
              edgeSep: 15, // Reduced edge separation
              ranker: "network-simplex",
              // Force proper layout
              fit: true,
              // Ensure nodes don't overlap
              nodeOverlap: 20,
              // Prevent horizontal layout fallback
              align: "UL", // Upper left alignment
              // Additional spacing
              marginX: 50,
              marginY: 50
            }
          });
          
          // Re-initialize event handlers
          cyRef.current.on("tap", "node", (evt) => {
            setSelectedEdge(null);
            const nodeId = evt.target.data("id");
            const nodeType = evt.target.data("type");
            
            if (nodeType === "transition") {
              const transition = (inMemoryGraph.transitions || []).find(t => 
                `transition_${t.id}` === nodeId || t.id === nodeId
              );
              if (transition) {
                executeTransition(transition);
                return;
              }
            }
            
            const nodeObj = (inMemoryGraph.nodes || []).find(n => n.node_id === nodeId || n.id === nodeId);
            if (nodeObj) setSelectedNode(nodeObj);
          });
          
          cyRef.current.on("tap", "edge", (evt) => {
            setSelectedNode(null);
            const edgeData = evt.target.data();
            const sourceNode = (inMemoryGraph.nodes || []).find(n => n.node_id === edgeData.source || n.id === edgeData.source);
            const targetNode = (inMemoryGraph.nodes || []).find(n => n.node_id === edgeData.target || n.id === edgeData.target);
            setSelectedEdge({
              edge: edgeData,
              sourceNode,
              targetNode
            });
          });
          
          console.log("✅ Cytoscape re-initialized with updated graph data");
        } else {
          setTimeout(checkAndInit, 100);
        }
      };
      checkAndInit();
      
    } catch (error) {
      console.error("❌ Failed to execute soft transition:", error);
      
      // Remove loading message
      if (loadingMessage.parentNode) {
        loadingMessage.remove();
      }
      
      // Show error message
      const errorMessage = document.createElement('div');
      errorMessage.className = 'transition-error-message';
      errorMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease-out;
      `;
      errorMessage.textContent = `Failed to simulate transition: ${error.message}`;
      document.body.appendChild(errorMessage);
      
      // Remove error message after 5 seconds
      setTimeout(() => {
        if (errorMessage.parentNode) {
          errorMessage.remove();
        }
      }, 5000);
    }
  };

  // Reset simulation to original graph state
  const resetSimulation = () => {
    console.log("🔄 Resetting simulation to original state");
    
    // Reset to original graph data
    setGraphData(graph);
    setIsSimulationMode(false);
    
    // Force Cytoscape to re-render with original data
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }
    
    // Show reset message
    const resetMessage = document.createElement('div');
    resetMessage.className = 'reset-message';
    resetMessage.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #6b7280;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      animation: slideIn 0.3s ease-out;
    `;
    resetMessage.textContent = "Simulation reset to original state";
    document.body.appendChild(resetMessage);
    
    // Remove reset message after 3 seconds
    setTimeout(() => {
      if (resetMessage.parentNode) {
        resetMessage.remove();
      }
    }, 3000);
  };

  return (
    <>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
      
      {/* Simulation Mode Indicator */}
      {isSimulationMode && (
        <div className="mb-2 p-2 bg-yellow-100 border border-yellow-400 rounded text-yellow-800 text-sm font-medium flex justify-between items-center">
          <span>🧪 Simulation Mode: Graph changes are in-memory only and will reset on page refresh</span>
          <button 
            onClick={resetSimulation}
            className="ml-2 px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 transition-colors"
          >
            Reset Simulation
          </button>
        </div>
      )}
      
      <div ref={containerRef} className="w-full h-full min-h-[400px] border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-4" />
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={() => setSelectedNode(null)}>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-xl" onClick={() => setSelectedNode(null)}>&times;</button>
            {selectedNode.isTransition ? (
              <TransitionCard 
                transition={selectedNode}
                userId={userId}
                graphId={graphId}
                onGraphUpdate={() => {
                  // Refresh the graph when transition is updated
                  if (onSummaryQueued) onSummaryQueued();
                }}
                availableNodes={graph.nodes || []}
              />
            ) : (
              <NodeCard 
                node={selectedNode} 
                userId={userId}
                graphId={graphId}
                onSummaryQueued={onSummaryQueued}
                graphRelations={graphRelations}
                graphAttributes={graphAttributes}
              />
            )}
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
