import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import svg from 'cytoscape-svg';
import type { Node, Edge, AttributeType } from './types';
import { cytoscapeStylesheet, cytoscapeLayouts } from './cytoscape-styles';

cytoscape.use(dagre);
cytoscape.use(svg);

interface SubgraphProps {
  nodes: Node[];
  relations: Edge[];
  attributes?: AttributeType[];
  onReady?: (api: { exportSvg: () => string }) => void;
}

export function Subgraph({ nodes, relations, attributes = [], onReady }: SubgraphProps) {
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
      layout: { name: 'dagre', rankDir: 'TB' },
      userZoomingEnabled: false,
      userPanningEnabled: false,
    });

    const cy = cyRef.current;
    const layout = cy.layout({ name: 'dagre', rankDir: 'TB' });

    layout.on('layoutstop', () => {
      cy.resize();
      cy.fit(10); // Fit with a padding of 10
    });

    layout.run();

    // Expose export API to parent
    if (onReady && cyRef.current) {
      const api = {
        exportSvg: () => (cyRef.current as any).svg({ full: true }) as string
      };
      onReady(api);
    }

    return () => {
      cy.destroy();
    };
  }, [nodes, relations]);

  return <div ref={containerRef} style={{ width: '100%', height: '200px' }} />;
}