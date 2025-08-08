// src/ViewGraphData.tsx
import React from 'react';
import type { Node, Edge, Attribute, Transition } from './types';

interface ViewGraphDataProps {
  nodes: Node[];
  relations: Edge[];
  attributes: Attribute[];
  transitions: Transition[];
}

export function ViewGraphData({ nodes, relations, attributes, transitions }: ViewGraphDataProps) {
  const data = {
    nodes,
    relations,
    attributes,
    transitions,
  };

  return (
    <pre className="json-data-view">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

