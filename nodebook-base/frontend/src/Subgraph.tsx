import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type { Node, Edge, AttributeType } from './types';
import { cytoscapeStylesheet, cytoscapeLayouts } from './cytoscape-styles';

cytoscape.use(dagre);

interface SubgraphProps {
  nodes: Node[];
  relations: Edge[];
  attributes?: AttributeType[];
}

export function Subgraph({ nodes, relations, attributes = [] }: SubgraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: nodes.map(n => ({ 
          data: { 
            id: n.id, 
            label: n.name, 
            type: n.role === 'Transition' ? 'transition' : 'polynode' 
          } 
        })),
        edges: [
          ...relations.map(r => ({ 
            data: { 
              source: r.source_id, 
              target: r.target_id, 
              label: r.name 
            } 
          })),
          // Render attributes as small labeled self-loop-like edges to the source node
          ...attributes
            .filter(a => nodes.find(n => n.id === a.source_id))
            .map(a => ({
              data: {
                source: a.source_id,
                target: a.source_id,
                label: `${a.name}: ${a.value}${a.unit ? ' ' + a.unit : ''}`
              }
            }))
        ]
      },
      style: cytoscapeStylesheet,
      layout: cytoscapeLayouts.dagre,
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