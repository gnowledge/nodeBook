// src/ViewGraphData.tsx
import React from 'react';
import type { Node, Edge, AttributeType } from './types';

interface ViewGraphDataProps {
  nodes: Node[];
  relations: Edge[];
  attributes: AttributeType[];
}

export function ViewGraphData({ nodes, relations, attributes }: ViewGraphDataProps) {
  const graphData = {
    nodes,
    relations,
    attributes,
  };

  return (
    <pre style={{ 
      backgroundColor: '#2d2d2d', 
      color: '#f8f8f2', 
      padding: '1rem', 
      borderRadius: '8px', 
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all',
      height: '100%',
      overflowY: 'auto'
    }}>
      {JSON.stringify(graphData, null, 2)}
    </pre>
  );
}
