import React from 'react';
import styles from './GraphThumbnail.module.css';

interface GraphThumbnailProps {
  graph: {
    id: string;
    name: string;
    description?: string;
    publication_state: string;
  };
  width?: number;
  height?: number;
}

export function GraphThumbnail({ 
  graph, 
  width = 200, 
  height = 150 
}: GraphThumbnailProps) {
  // Generate a more distinctive visual representation based on graph properties
  const generateThumbnail = () => {
    const name = graph.name;
    const description = graph.description || '';
    
    // Create a more distinctive pattern based on graph name and description
    const nameHash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const descriptionHash = description.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Generate pseudo-random but consistent node positions based on graph properties
    const seed = (nameHash + descriptionHash) % 1000;
    const random = (min: number, max: number) => {
      const x = Math.sin(seed) * 10000;
      return min + (x - Math.floor(x)) * (max - min);
    };
    
    const nodes = [];
    const maxNodes = 7; // Limit to 7 nodes for clarity
    
    // Add main node (graph name)
    nodes.push({
      id: 'main',
      x: width / 2,
      y: height / 2,
      size: Math.min(width, height) * 0.18,
      label: name.length > 10 ? name.substring(0, 10) + '...' : name,
      type: 'main'
    });
    
    // Generate distinctive node positions and labels based on graph properties
    const radius = Math.min(width, height) * 0.35;
    
    for (let i = 1; i < maxNodes; i++) {
      // Create more varied positioning based on graph properties
      const angle = (i * 2 * Math.PI / (maxNodes - 1)) + (seed / 1000);
      const radiusVariation = radius * (0.7 + (random(0, 0.6)));
      
      const x = width / 2 + radiusVariation * Math.cos(angle);
      const y = height / 2 + radiusVariation * Math.sin(angle);
      
      // Generate meaningful labels based on graph properties
      let label = '';
      if (i === 1) {
        label = name.length > 3 ? name.substring(0, 3).toUpperCase() : name.toUpperCase();
      } else if (i === 2) {
        label = description.length > 2 ? description.substring(0, 2) : 'N' + i;
      } else if (i === 3) {
        label = 'G' + (seed % 100);
      } else if (i === 4) {
        label = 'N' + (seed % 50);
      } else if (i === 5) {
        label = 'R' + (seed % 30);
      } else if (i === 6) {
        label = 'A' + (seed % 20);
      }
      
      nodes.push({
        id: `node-${i}`,
        x,
        y,
        size: Math.min(width, height) * (0.08 + (i % 2) * 0.02),
        label,
        type: 'secondary'
      });
    }
    
    return nodes;
  };

  const nodes = generateThumbnail();

  return (
    <div className={styles.thumbnailContainer} style={{ width, height }}>
      <svg width={width} height={height} className={styles.thumbnailSvg}>
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.2)"/>
          </filter>
        </defs>
        
        {/* Background */}
        <rect width={width} height={height} fill="#f8fafc" rx="8"/>
        
        {/* Draw connections with much darker, more visible lines */}
        {nodes.slice(1).map((node, index) => (
          <line
            key={`line-${index}`}
            x1={nodes[0].x}
            y1={nodes[0].y}
            x2={node.x}
            y2={node.y}
            stroke="#4b5563"
            strokeWidth="2"
            opacity="0.8"
          />
        ))}
        
        {/* Draw nodes */}
        {nodes.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={node.size}
              fill={node.type === 'main' ? '#3b82f6' : '#e5e7eb'}
              stroke={node.type === 'main' ? '#1d4ed8' : '#9ca3af'}
              strokeWidth="2"
              filter="url(#shadow)"
            />
            {/* Add labels to all nodes for better distinction */}
            <text
              x={node.x}
              y={node.y + (node.type === 'main' ? 4 : 3)}
              textAnchor="middle"
              fontSize={node.type === 'main' ? '10' : '8'}
              fill={node.type === 'main' ? 'white' : '#374151'}
              fontWeight={node.type === 'main' ? 'bold' : 'normal'}
            >
              {node.label}
            </text>
          </g>
        ))}
        
        {/* Publication state indicator */}
        <circle
          cx={width - 15}
          cy={15}
          r="6"
          fill={graph.publication_state === 'Public' ? '#10b981' : 
                graph.publication_state === 'P2P' ? '#3b82f6' : '#6b7280'}
          stroke="white"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
