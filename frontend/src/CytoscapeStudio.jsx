import React, { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";

cytoscape.use(dagre);

const CytoscapeStudio = ({ graph }) => {
  const cyRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!graph || !graph.nodes) {
      console.warn("No graph or graph.nodes found");
      return;
    }

    console.log("GRAPH DATA LOADED:", graph);

    const nodes = graph.nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.name || node.id,
        description: node.description || ""
      }
    }));

    const edges = graph.nodes.flatMap((node, i) =>
      (node.relations || []).map((rel, j) => ({
        data: {
          id: `${node.id}_${rel.name}_${rel.target}_${j}`,
          source: node.id,
          target: rel.target,  // ✅ rel.target, not rel.object
          label: rel.name
        }
      }))
    );

    console.log("NODES:", nodes);
    console.log("EDGES:", edges);

    if (cyRef.current) {
      cyRef.current.destroy();
    }

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
        name: "dagre"
      }
    });

    cyRef.current.on("mouseover", "node", (evt) => {
      const desc = evt.target.data("description") || "No description";
      console.log("Node description:", desc);
    });

  }, [graph]);

  return <div ref={containerRef} style={{ height: "600px", width: "100%" }} />;
};

export default CytoscapeStudio;
