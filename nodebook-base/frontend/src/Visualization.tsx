import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type { Node, Edge } from './types';

cytoscape.use(dagre);

interface VisualizationProps {
  nodes: Node[];
  relations: Edge[];
  attributes: AttributeType[];
  onNodeSelect: (nodeId: string | null) => void;
}

export function Visualization({ nodes, relations, attributes, onNodeSelect }: VisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const cyNodes = nodes.map(node => ({
      data: { id: node.id, label: node.name, type: 'polynode' }
    }));

    const attributeValueNodes = attributes.map(attr => ({
        data: {
            id: attr.id, // Use the attribute's own ID for the value node
            label: `${attr.value}${attr.unit ? ` ${attr.unit}`: ''}`,
            type: 'attribute_value'
        }
    }));

    const cyEdges = relations.map(edge => ({
      data: { id: edge.id, source: edge.source_id, target: edge.target_id, label: edge.name }
    }));

    const attributeEdges = attributes.map(attr => ({
        data: {
            id: `${attr.id}_edge`, // Create a unique ID for the edge
            source: attr.source_id,
            target: attr.id, // Target the value node using its correct ID
            label: attr.name
        }
    }));

    const elements = { 
        nodes: [...cyNodes, ...attributeValueNodes], 
        edges: [...cyEdges, ...attributeEdges] 
    };

    console.log('Cytoscape Elements:', JSON.stringify(elements, null, 2));

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        {
            selector: "node[type = 'polynode']",
            style: {
                label: "data(label)", "text-valign": "center", "text-halign": "center",
                "background-color": "#f3f4f6", "color": "#2563eb", "text-outline-width": 0,
                "font-size": 14,
                "border-width": 0.5, "border-color": "#2563eb", "border-style": "solid", "shape": "roundrectangle",
                'width': (ele) => ele.data('label').length * 8 + 20,
                'height': 35
            }
        },
        {
            selector: "node[type = 'attribute_value']",
            style: { 
                label: "data(label)", "text-valign": "center", "text-halign": "center",
                "background-color": "#fef3c7", "color": "#92400e", "border-color": "#92400e", "shape": "roundrectangle",
                "font-size": 12,
                'width': (ele) => ele.data('label').length * 7 + 16,
                'height': 30
            }
        },
        {
            selector: "edge",
            style: {
                label: "data(label)", "curve-style": "bezier", "target-arrow-shape": "triangle",
                "width": 1, "line-color": "#ccc", "target-arrow-color": "#ccc", "font-size": 9,
                "text-background-color": "#fff", "text-background-opacity": 1, "text-background-padding": "2px"
            }
        }
      ],
      layout: { name: "dagre", rankDir: "LR", fit: true, padding: 30 }
    });

    // Add event listener for node clicks
    cyRef.current.on('tap', 'node', (event) => {
        const nodeId = event.target.id();
        onNodeSelect(nodeId);
    });
    
    // Add event listener for background clicks
    cyRef.current.on('tap', (event) => {
        if (event.target === cyRef.current) {
            onNodeSelect(null);
        }
    });

    return () => {
        cyRef.current?.destroy();
    }

  }, [nodes, relations, attributes, onNodeSelect]);

  return <div id="cy" ref={containerRef} />;
}
