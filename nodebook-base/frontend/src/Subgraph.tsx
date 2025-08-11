import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type { Node, Edge } from './types';

cytoscape.use(dagre);

interface SubgraphProps {
  nodes: Node[];
  relations: Edge[];
}

export function Subgraph({ nodes, relations }: SubgraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: nodes.map(n => ({ data: { id: n.id, label: n.name, type: n.role === 'Transition' ? 'transition' : 'polynode' } })),
        edges: relations.map(r => ({ data: { source: r.source_id, target: r.target_id, label: r.name } }))
      },
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
            selector: "node[type = 'transition']",
            style: {
                label: "data(label)", "text-valign": "center", "text-halign": "center",
                "background-color": "#a855f7", "color": "white", "shape": "diamond",
                'width': 40,
                'height': 40
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
      layout: { 
        name: 'dagre',
        fit: false, // We will fit manually after layout
        padding: 10
      },
      userZoomingEnabled: false,
      userPanningEnabled: false,
    });

    const cy = cyRef.current;
    const layout = cy.layout({ name: 'dagre' });

    layout.on('layoutstop', () => {
      cy.resize();
      cy.fit(10); // Fit with a padding of 10
    });

    layout.run();

    return () => {
      cy.destroy();
    };
  }, [nodes, relations]);

  return <div ref={containerRef} style={{ width: '100%', height: '200px' }} />;
}