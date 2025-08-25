// Shared Cytoscape styles for consistent graph visualization across the app

export const cytoscapeStylesheet = [
  // Polynode styling (regular nodes) - MUST come before default node selector
  {
    selector: "node[type = 'polynode']",
    style: {
      label: "data(label)",
      "text-valign": "center",
      "text-halign": "center",
      "background-color": "#f3f4f6",
      "color": "#2563eb",
      "text-outline-width": 0,
      "font-size": 14,
      "border-width": 0.5,
      "border-color": "#2563eb",
      "border-style": "solid",
      "shape": "roundrectangle",
      'width': (ele: any) => Math.max(ele.data('label').length * 8 + 20, 60),
      'height': 35
    }
  },
  // Transition node styling - MUST come before default node selector
  {
    selector: "node[type = 'transition']",
    style: {
      label: "data(label)",
      "text-valign": "center",
      "text-halign": "center",
      "background-color": "#a855f7",
      "color": "white",
      "shape": "diamond",
      'width': 40,
      'height': 40,
      "font-size": 12,
      "text-outline-width": 0
    }
  },
  // Attribute value node styling - MUST come before default node selector
  {
    selector: "node[type = 'attribute_value']",
    style: {
      label: "data(label)",
      "text-valign": "center",
      "text-halign": "center",
      "background-color": "#fef3c7",
      "color": "#92400e",
      "border-color": "#92400e",
      "shape": "roundrectangle",
      "font-size": 12,
      'width': (ele: any) => Math.max(ele.data('label').length * 7 + 16, 50),
      'height': 30,
      "text-outline-width": 0
    }
  },
  // Edge styling
  {
    selector: "edge",
    style: {
      label: "data(label)",
      "curve-style": "bezier",
      "target-arrow-shape": "triangle",
      "width": 1,
      "line-color": "#ccc",
      "target-arrow-color": "#ccc",
      "font-size": 9,
      "text-background-color": "#fff",
      "text-background-opacity": 1,
      "text-background-padding": "2px",
      "color": "#666"
    }
  },
  // Selected node styling
  {
    selector: "node:selected",
    style: {
      "background-color": "#fbbf24",
      "border-color": "#f59e0b",
      "border-width": "2px",
      "border-style": "solid"
    }
  },
  // Selected edge styling
  {
    selector: "edge:selected",
    style: {
      "line-color": "#f59e0b",
      "width": 2,
      "target-arrow-color": "#f59e0b"
    }
  },
  // Hover effects
  {
    selector: "node:hover",
    style: {
      "background-color": "#e5e7eb",
      "border-color": "#1d4ed8",
      "border-width": "1px"
    }
  },
  {
    selector: "edge:hover",
    style: {
      "line-color": "#9ca3af",
      "width": 1.5
    }
  },
  // Default node styling (fallback) - MUST come LAST to avoid overriding specific types
  {
    selector: "node",
    style: {
      label: "data(label)",
      "text-valign": "center",
      "text-halign": "center",
      "background-color": "#f3f4f6",
      "color": "#2563eb",
      "text-outline-width": 0,
      "font-size": 14,
      "border-width": 0.5,
      "border-color": "#2563eb",
      "border-style": "solid",
      "shape": "roundrectangle",
      'width': 60,
      'height': 35
    }
  }
];

// Layout configurations
export const cytoscapeLayouts = {
  dagre: {
    name: 'dagre',
    rankDir: 'LR',
    fit: true,
    padding: 30,
    nodeSep: 50,
    edgeSep: 20,
    rankSep: 80
  },
  cose: {
    name: 'cose',
    fit: true,
    padding: 30,
    nodeDimensionsIncludeLabels: true,
    animate: false
  },
  grid: {
    name: 'grid',
    fit: true,
    padding: 30,
    nodeDimensionsIncludeLabels: true
  }
};

// Helper function to determine node type based on role
export const getNodeType = (role: string): string => {
  if (role === 'Transition') return 'transition';
  if (role === 'Attribute') return 'attribute_value';
  return 'polynode';
};
