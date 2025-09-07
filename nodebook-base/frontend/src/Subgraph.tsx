import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import svg from 'cytoscape-svg';
import type { Node, Edge, Attribute } from './types';
import { cytoscapeStylesheet } from './cytoscape-styles';

cytoscape.use(dagre);
cytoscape.use(svg);

interface SubgraphProps {
  nodes: Node[];
  relations: Edge[];
  attributes?: Attribute[];
  onReady?: (api: { exportSvg: () => string }) => void;
}

export function Subgraph({ nodes, relations, attributes = [], onReady }: SubgraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    const attributeValueNodes = (attributes || []).map(a => ({
      data: {
        id: a.id,
        label: `${a.value}${(a as any).unit ? ' ' + (a as any).unit : ''}`,
        type: 'attribute_value'
      }
    }));

    const relationEdges = relations.map(r => ({
      data: {
        source: r.source_id,
        target: r.target_id,
        label: r.name
      }
    }));

    const attributeEdges = (attributes || []).map(a => ({
      data: {
        source: a.source_id,
        target: a.id,
        label: a.name
      }
    }));

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: [
          ...nodes.map(n => ({
            data: {
              id: n.id,
              label: n.name,
              type: n.role === 'Transition' ? 'transition' : 'polynode'
            }
          })),
          ...attributeValueNodes
        ],
        edges: [
          ...relationEdges,
          ...attributeEdges
        ]
      },
      style: cytoscapeStylesheet as any,
      layout: { name: 'dagre', rankDir: 'TB' } as any,
      userZoomingEnabled: false,
      userPanningEnabled: false,
    });

    const cy = cyRef.current;
    const layout = cy.layout({ name: 'dagre', rankDir: 'TB' } as any);

    layout.on('layoutstop', () => {
      cy.resize();
      cy.fit(undefined, 10);
    });

    layout.run();

    if (onReady && cyRef.current) {
      const api = {
        exportSvg: () => (cyRef.current as any).svg({ full: true }) as string
      };
      onReady(api);
    }

    return () => {
      cy.destroy();
    };
  }, [nodes, relations, attributes]);

  return <div ref={containerRef} style={{ width: '100%', height: '200px' }} />;
}