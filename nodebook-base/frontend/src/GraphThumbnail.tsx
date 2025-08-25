import React, { useState, useEffect } from 'react';
import styles from './GraphThumbnail.module.css';
import { API_BASE_URL } from './api-config';

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

interface GraphData {
  nodes: Array<{
    id: string;
    name: string;
    type?: string;
  }>;
  relations: Array<{
    id: string;
    source_id: string;
    target_id: string;
    name: string;
  }>;
}

export function GraphThumbnail({ 
  graph, 
  width = 200, 
  height = 120 
}: GraphThumbnailProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {};
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/graphs/${graph.id}/data`, {
          headers
        });

        if (response.ok) {
          const data = await response.json();
          setGraphData(data);
        } else {
          setError('Failed to load graph data');
        }
      } catch (err) {
        console.error('Error fetching graph data:', err);
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, [graph.id]);

  // Generate thumbnail based on actual graph data
  const generateThumbnail = () => {
    if (!graphData || graphData.nodes.length === 0) {
      return [];
    }

    const nodes = [];
    const maxNodes = 7; // Limit to 7 nodes for clarity
    
    // Add main node (graph name)
    nodes.push({
      id: 'main',
      x: width / 2,
      y: height / 2,
      size: Math.min(width, height) * 0.2,
      label: graph.name.length > 8 ? graph.name.substring(0, 8) + '...' : graph.name,
      type: 'main'
    });
    
    // Get actual node names from the graph (up to 6 additional nodes)
    const availableNodes = graphData.nodes
      .filter(node => node.name && node.name.trim() !== '')
      .slice(0, maxNodes - 1);
    
    if (availableNodes.length === 0) {
      return nodes;
    }
    
    // Position nodes around the center
    const radius = Math.min(width, height) * 0.4;
    const angleStep = (2 * Math.PI) / availableNodes.length;
    
    availableNodes.forEach((node, index) => {
      const angle = index * angleStep;
      const x = width / 2 + radius * Math.cos(angle);
      const y = height / 2 + radius * Math.sin(angle);
      
      // Use actual node name (truncated if too long)
      const label = node.name.length > 4 ? node.name.substring(0, 4) : node.name;
      
      nodes.push({
        id: node.id,
        x,
        y,
        size: Math.min(width, height) * 0.1,
        label,
        type: 'secondary'
      });
    });
    
    return nodes;
  };

  const nodes = generateThumbnail();

  if (loading) {
    return (
      <div className={styles.thumbnailContainer} style={{ width, height }}>
        <div className={styles.thumbnailLoading}>
          <div className={styles.loadingSpinner}></div>
          <small>Loading...</small>
        </div>
      </div>
    );
  }

  if (error || !graphData) {
    return (
      <div className={styles.thumbnailContainer} style={{ width, height }}>
        <div className={styles.thumbnailError}>
          <span>📊</span>
          <small>Graph Preview</small>
        </div>
      </div>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className={styles.thumbnailContainer} style={{ width, height }}>
        <div className={styles.thumbnailEmpty}>
          <span>📋</span>
          <small>No Nodes</small>
        </div>
      </div>
    );
  }

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
              fontSize={node.type === 'main' ? '9' : '7'}
              fill={node.type === 'main' ? 'white' : '#374151'}
              fontWeight={node.type === 'main' ? 'bold' : 'normal'}
            >
              {node.label}
            </text>
          </g>
        ))}
        
        {/* Publication state indicator */}
        <circle
          cx={width - 12}
          cy={12}
          r="5"
          fill={graph.publication_state === 'Public' ? '#10b981' : 
                graph.publication_state === 'P2P' ? '#3b82f6' : '#6b7280'}
          stroke="white"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
