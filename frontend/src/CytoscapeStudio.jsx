import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';

cytoscape.use(dagre);



export default function CytoscapeStudio() {
  const cyRef = useRef(null);
  const containerRef = useRef(null);
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [label, setLabel] = useState('');
  const [relationTypes, setRelationTypes] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const API_BASE = 'http://localhost:8000';

  useEffect(() => {
    if (!containerRef.current) return;
      console.log("🚀 useEffect triggered: initializing cytoscape");
    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'background-color': '#6FB1FC',
            'text-outline-color': '#555',
            'text-outline-width': 1,
            color: '#fff',
            shape: 'roundrectangle',
            padding: '10px'
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#ccc',
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle',
            label: 'data(label)',
            'text-rotation': 'autorotate',
            'font-size': 10,
            'text-background-color': '#fff',
            'text-background-opacity': 1,
            'text-background-shape': 'roundrectangle',
            'text-margin-y': -10
          },
        }
      ],
      layout: {
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 100,
        edgeSep: 50,
        rankSep: 100,
        animate: true,
      },
    });

    cyRef.current = cy;
      fetch(`${API_BASE}/api/graph`)

          .then(res => res.json())
	  .then(data => {
              if (data && data.elements) {
		  cy.add(data.elements);
		  cy.layout({ name: 'dagre' }).run();
              }
	  })
      .catch(err => console.error('Failed to load graph data', err));
     fetch(`${API_BASE}/api/relation-types`)
      .then(res => res.json())
      .then(data => setRelationTypes(data))
      .catch(err => console.error('Failed to load relation types', err));

    return () => {
      cy.destroy();
    };
  }, []);

  const findNodeIdByLabel = (labelText) => {
    const cy = cyRef.current;
    const match = cy.nodes().find(n => n.data('label').toLowerCase() === labelText.toLowerCase());
    return match ? match.id() : null;
  };

const handleCreateRelation = async () => {
  if (!source.trim() || !target.trim() || !label) return;

  const cy = cyRef.current;

  const sourceLabel = source.trim();
  const targetLabel = target.trim();

  const existingSourceId = findNodeIdByLabel(sourceLabel);
  const sourceId = existingSourceId || sourceLabel.toLowerCase();
  const newSource = !existingSourceId;

  const existingTargetId = findNodeIdByLabel(targetLabel);
  const targetId = existingTargetId || targetLabel.toLowerCase();
  const newTarget = !existingTargetId;

  // 1. Add to Cytoscape view if not already
  if (newSource) {
    cy.add({ data: { id: sourceId, label: sourceLabel } });
    await fetch('http://localhost:8000/api/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node: { id: sourceId, label: sourceLabel } })
    });
  }

  if (newTarget) {
    cy.add({ data: { id: targetId, label: targetLabel } });
    await fetch('http://localhost:8000/api/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node: { id: targetId, label: targetLabel } })
    });
  }

  const edgeId = `${sourceId}-${label}->${targetId}`;
  if (!cy.getElementById(edgeId).length) {
    cy.add({ data: { id: edgeId, source: sourceId, target: targetId, label } });
    await fetch('http://localhost:8000/api/relation/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: sourceId,
        predicate: label,
        object: targetId
      })
    });
  }

  cy.layout({ name: 'dagre' }).run();

  setSource('');
  setTarget('');
  setLabel('');
};




  const getNodeLabels = () => {
    const cy = cyRef.current;
    return cy ? cy.nodes().map(n => n.data('label')) : [];
  };


return (
  <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
    {/* Toggle Button */}
    <button
      onClick={() => setDrawerOpen(!drawerOpen)}
      style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 1000,
        padding: '0.5rem 1rem',
        background: '#333',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      {drawerOpen ? 'Close' : 'Open'} Panel
    </button>

    {/* Optional Background Overlay */}
    {drawerOpen && (
      <div
        onClick={() => setDrawerOpen(false)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.15)',
          zIndex: 998
        }}
      />
    )}

    {/* Drawer Panel */}
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '300px',
        maxWidth: '80%',
        backgroundColor: '#f9f9f9',
        borderRight: '1px solid #ccc',
        padding: '1rem',
        boxShadow: '2px 0 5px rgba(0,0,0,0.2)',
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease-in-out',
        zIndex: 999
      }}
    >
      <h3>Create Relation</h3>
      <div style={{ marginBottom: '1rem' }}>
        <label>Source Node:</label>
        <input
          list="existing-nodes"
          value={source}
          onChange={e => setSource(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Relation Label:</label>
        <select value={label} onChange={e => setLabel(e.target.value)} style={{ width: '100%' }}>
          <option value="">-- Select a relation --</option>
          {relationTypes.map(rt => (
            <option key={rt.name} value={rt.name}>{rt.name}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Target Node:</label>
        <input
          list="existing-nodes"
          value={target}
          onChange={e => setTarget(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>
      <button onClick={handleCreateRelation} disabled={!label}>Add Relation</button>
      <datalist id="existing-nodes">
        {getNodeLabels().map((label, idx) => (
          <option key={idx} value={label} />
        ))}
      </datalist>
    </div>

    {/* Cytoscape Canvas */}
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        zIndex: 0
      }}
    ></div>
  </div>
);
}
