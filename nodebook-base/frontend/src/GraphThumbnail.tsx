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
  // Generate a simple visual representation based on graph properties
  const generateThumbnail = () => {
    const name = graph.name;
    const description = graph.description || '';
    const publicationState = graph.publication_state;
    
    // Create a simple node-like representation
    const nodes = [];
    const maxNodes = 8; // Limit for thumbnail
    
    // Add main node (graph name)
    nodes.push({
      id: 'main',
      x: width / 2,
      y: height / 2,
      size: Math.min(width, height) * 0.15,
      label: name.length > 12 ? name.substring(0, 12) + '...' : name,
      type: 'main'
    });
    
    // Add some representative nodes around the main one
    const radius = Math.min(width, height) * 0.3;
    const angleStep = (2 * Math.PI) / (maxNodes - 1);
    
    for (let i = 1; i < maxNodes; i++) {
      const angle = i * angleStep;
      const x = width / 2 + radius * Math.cos(angle);
      const y = height / 2 + radius * Math.sin(angle);
      
      // Create a simple representation based on description or name
      const label = i === 1 ? '📊' : 
                   i === 2 ? '🔗' : 
                   i === 3 ? '📝' : 
                   i === 4 ? '⚡' : 
                   i === 5 ? '🎯' : 
                   i === 6 ? '💡' : 
                   '📌';
      
      nodes.push({
        id: `node-${i}`,
        x,
        y,
        size: Math.min(width, height) * 0.08,
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
            <feDropShadow dx="1" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.1)"/>
          </filter>
        </defs>
        
        {/* Background */}
        <rect width={width} height={height} fill="#f8fafc" rx="8"/>
        
        {/* Draw connections (simple lines) */}
        {nodes.slice(1).map((node, index) => (
          <line
            key={`line-${index}`}
            x1={nodes[0].x}
            y1={nodes[0].y}
            x2={node.x}
            y2={node.y}
            stroke="#cbd5e1"
            strokeWidth="1"
            opacity="0.6"
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
              strokeWidth="1"
              filter="url(#shadow)"
            />
            {node.type === 'main' && (
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                fontSize="10"
                fill="white"
                fontWeight="bold"
              >
                {node.label}
              </text>
            )}
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
