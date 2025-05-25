import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import RelationAndAttributePanel from './RelationAndAttributePanel';
import NodeForm from './NodeForm';
import NodeUpdateForm from './NodeUpdateForm';
import { API_BASE } from './config';

cytoscape.use(dagre);

export default function CytoscapeStudio({ userId = "user0", graphId = "graph1" }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const [modal, setModal] = useState({ open: false, content: '' });
  const [editNodeId, setEditNodeId] = useState(null);
  const [layoutName, setLayoutName] = useState('Force-Directed');

  const layoutOptions = {
    'Breadthfirst': { name: 'breadthfirst', orientation: 'vertical', padding: 30 },
    'Force-Directed': { name: 'cose' },
    'Grid': { name: 'grid', cols: 1, avoidOverlap: true }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const apiPrefix = `${base}/api/users/${userId}/graphs/${graphId}`;

    requestAnimationFrame(() => {
      const cy = cytoscape({
        container: containerRef.current,
        style: [
          {
            selector: 'node',
            style: {
              shape: 'round-rectangle',
              width: 'label',
              height: 'label',
              content: 'data(label)',
              padding: '10pt',
              'text-valign': 'center',
              'text-wrap': 'wrap',
              'background-color': '#e4ebec',
              color: '#000',
              'outline-width': '2pt',
              'outline-color': '#6073ec'
            }
          },
          {
            selector: 'edge',
            style: {
              label: 'data(name)',
              'font-size': 12,
              'text-rotation': 'autorotate',
              'text-rotation-strict': 'true',
              'text-background-color': '#f9f9f9',
              'text-background-opacity': 1,
              'text-background-shape': 'roundrectangle',
              color: '#2c3e50',
              width: 2,
              'line-color': '#95a5a6',
              'target-arrow-shape': 'triangle',
              'target-arrow-color': '#95a5a6',
              'curve-style': 'bezier',
              'text-margin-y': -10
            }
          }
        ],
        layout: {
          name: 'grid',
          directed: true,
          padding: 10,
          spacingFactor: 1.5,
          orientation: 'vertical'
        }
      });

      cyRef.current = cy;

      // Store nodes with inverted colors
      let invertedNodes = [];

      // Helper to reset node colors
      const resetNodeColors = () => {
        invertedNodes.forEach(node => {
          node.style({
            'background-color': '#e4ebec',
            color: '#000'
          });
        });
        invertedNodes = [];
      };

      // Edge mouseover: Show tooltip and invert node colors
      cy.on('mouseover', 'edge', (evt) => {
        const edge = evt.target;
        const midpoint = edge.midpoint();
        const rendered = cy.renderer().projectToRenderedCoordinates(midpoint);
        const name = edge.data('name') || edge.data('label') || '';
        const sourceLabel = edge.source().data('label') || edge.source().id();
        const targetLabel = edge.target().data('label') || edge.target().id();
        const proposition = `<b>${sourceLabel}</b> <span style="color:#6073ec">${name}</span> <b>${targetLabel}</b>`;

        // Ensure tooltip stays within viewport
        const canvasRect = containerRef.current.getBoundingClientRect();
        const tooltipWidth = 200; // Approximate tooltip width
        const tooltipHeight = 100; // Approximate tooltip height
        let x = rendered.x + 10;
        let y = rendered.y + 10;

        // Adjust if tooltip would go off-screen
        if (x + tooltipWidth > canvasRect.width) x = rendered.x - tooltipWidth - 10;
        if (y + tooltipHeight > canvasRect.height) y = rendered.y - tooltipHeight - 10;

        setTooltip({ visible: true, x, y, content: name ? proposition : '<i>No name</i>' });

        // Invert colors for source and target nodes
        resetNodeColors(); // Reset previous inversions
        const source = edge.source();
        const target = edge.target();
        [source, target].forEach(node => {
          const origBg = node.style('background-color') || '#e4ebec';
          const origColor = node.style('color') || '#000';
          node.style({
            'background-color': origColor,
            color: origBg
          });
          invertedNodes.push(node);
        });
      });

      // Edge mouseout: Hide tooltip and reset node colors
      cy.on('mouseout', 'edge', () => {
        setTooltip({ visible: false, x: 0, y: 0, content: '' });
        resetNodeColors();
      });

      // Edge tap: Select edge and keep tooltip
      cy.on('tap', 'edge', (evt) => {
        cy.elements('edge').unselect();
        evt.target.select();
        // Tooltip and color inversion are handled by mouseover
      });

      // Canvas tap: Clear selections, tooltip, and reset colors
      cy.on('tap', (evt) => {
        if (evt.target === cy) {
          cy.elements('edge').unselect();
          setTooltip({ visible: false, x: 0, y: 0, content: '' });
          resetNodeColors();
        }
      });

      // Node mouseover: Show node details
      cy.on('mouseover', 'node', async (evt) => {
        const node = evt.target;
        const pos = node.renderedPosition();
        const nodeId = node.data().id;

        try {
          const res = await fetch(`${apiPrefix}/nodes/${nodeId}`);
          const data = await res.json();

          let content = `<div><b>Node:</b> ${data.label || data.name || nodeId}</div>`;
          if (data.qualifier) content += `<div><b>Qualifier:</b> ${data.qualifier}</div>`;
          if (data.description) content += `<div><b>Description:</b> ${data.description}</div>`;
          if (data.role) content += `<div><b>Role:</b> ${data.role}</div>`;
          if (data.attributes?.length) {
            content += `<div><b>Attributes:</b><ul>` +
              data.attributes.map(attr =>
                `<li><b>${attr.name}</b>: ${attr.value ?? ''}${attr.unit ? ' [' + attr.unit + ']' : ''} ${attr.quantifier ? '(' + attr.quantifier + ')' : ''} ${attr.modality ? '[' + attr.modality + ']' : ''}</li>`
              ).join('') + `</ul></div>`;
          }
          if (data.relations?.length) {
            content += `<div><b>Relations:</b><ul>` +
              data.relations.map(rel => {
                const name = rel.name || rel.type || '';
                const target = rel.target ?? '';
                const subjQ = rel.subject_quantifier ? `(${rel.subject_quantifier})` : '';
                const objQ = rel.object_quantifier ? `(${rel.object_quantifier})` : '';
                const modality = rel.modality ? `[${rel.modality}]` : '';
                return `<li><b>${name}</b> → ${target} ${subjQ} ${objQ} ${modality}</li>`;
              }).join('') + `</ul></div>`;
          }

          // Adjust tooltip position for node
          const canvasRect = containerRef.current.getBoundingClientRect();
          const tooltipWidth = 200;
          const tooltipHeight = 100;
          let x = pos.x + 10;
          let y = pos.y + 10;
          if (x + tooltipWidth > canvasRect.width) x = pos.x - tooltipWidth - 10;
          if (y + tooltipHeight > canvasRect.height) y = pos.y - tooltipHeight - 10;

          setTooltip({ visible: true, x, y, content });
        } catch {
          setTooltip({ visible: true, x: pos.x, y: pos.y, content: '<i>Failed to load node info</i>' });
        }
      });

      // Node mouseout: Hide tooltip
      cy.on('mouseout', 'node', () => {
        setTooltip({ visible: false, x: 0, y: 0, content: '' });
      });

      // Node tap: Show modal with details
      cy.on('tap', 'node', async (evt) => {
        const node = evt.target;
        const nodeId = node.data().id;

        try {
          const res = await fetch(`${apiPrefix}/nodes/${nodeId}`);
          const data = await res.json();

          let content = `<div><b>Node:</b> ${data.label || data.name || nodeId}</div>`;
          if (data.qualifier) content += `<div><b>Qualifier:</b> ${data.qualifier}</div>`;
          if (data.description) content += `<div><b>Description:</b> ${data.description}</div>`;
          if (data.role) content += `<div><b>Role:</b> ${data.role}</div>`;
          if (data.attributes?.length) {
            content += `<div><b>Attributes:</b><ul>` +
              data.attributes.map(attr =>
                `<li><b>${attr.name}</b>: ${attr.value ?? ''}${attr.unit ? ' [' + attr.unit + ']' : ''} ${attr.quantifier ? '(' + attr.quantifier + ')' : ''} ${attr.modality ? '[' + attr.modality + ']' : ''}</li>`
              ).join('') + `</ul></div>`;
          }
          if (data.relations?.length) {
            content += `<div><b>Relations:</b><ul>` +
              data.relations.map(rel => {
                const name = rel.name || rel.type || '';
                const target = rel.target ?? '';
                const subjQ = rel.subject_quantifier ? `(${rel.subject_quantifier})` : '';
                const objQ = rel.object_quantifier ? `(${rel.object_quantifier})` : '';
                const modality = rel.modality ? `[${rel.modality}]` : '';
                return `<li><b>${name}</b> → ${target} ${subjQ} ${objQ} ${modality}</li>`;
              }).join('') + `</ul></div>`;
          }

          setModal({ open: true, content, nodeId });
          setEditNodeId(null);
        } catch {
          setModal({ open: true, content: '<div style="color:red">Failed to load node details.</div>', nodeId });
          setEditNodeId(null);
        }
      });

      cy.on('render', () => console.log("✅ Cytoscape render complete"));

      fetch(`${apiPrefix}/graphdb`)
        .then(res => res.json())
        .then(data => {
          if (data?.elements) {
            cy.add(data.elements);
            cy.layout(layoutOptions[layoutName]).run();
          }
        })
        .catch(err => console.warn("❌ Failed to fetch graph:", err));

      return () => {
        try {
          cyRef.current?.destroy();
        } catch (err) {
          console.warn("⚠️ Cytoscape destroy error:", err);
        }
      };
    });
  }, [userId, graphId, layoutName]);

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        background: '#fff',
        padding: '6px 10px',
        borderRadius: '6px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
      }}>
        <label style={{ marginRight: '6px', fontSize: '14px' }}>Layout:</label>
        <select
          value={layoutName}
          onChange={(e) => {
            setLayoutName(e.target.value);
            if (cyRef.current) {
              cyRef.current.layout(layoutOptions[e.target.value]).run();
            }
          }}
        >
          {Object.keys(layoutOptions).map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {!drawerOpen && (
        <button
          onClick={() => setDrawerOpen(true)}
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
          Open Panel
        </button>
      )}

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: drawerOpen ? (window.innerWidth > 640 ? '75vw' : '100%') : '0',
          maxWidth: drawerOpen ? (window.innerWidth < 640 ? '75vw' : '75%') : '0',
          backgroundColor: '#f9f9f9',
          overflowX: 'hidden',
          padding: drawerOpen ? '1rem' : '0',
          transition: 'all 0.3s ease-in-out',
          zIndex: 999
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <button
            className="text-sm px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
            onClick={() => setDrawerOpen(false)}
          >
            Close Panel
          </button>
        </div>

        {drawerOpen && <RelationAndAttributePanel />}
      </div>

      <div
        ref={containerRef}
        style={{
          height: '100%',
          width: '100%',
          position: 'absolute',
          left: 0,
          top: 0,
          zIndex: 0
        }}
      ></div>

      {tooltip.visible && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid #ccc',
            borderRadius: 4,
            padding: '8px 12px',
            fontSize: 13,
            pointerEvents: 'none',
            zIndex: 2000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            maxWidth: '200px',
            wordWrap: 'break-word'
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}

      {modal.open && (
        <div
          style={{
            position: 'fixed',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 8,
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            padding: '2rem',
            zIndex: 3000,
            minWidth: 300,
            maxWidth: '90vw'
          }}
        >
          {editNodeId ? (
            <NodeUpdateForm
              nodeId={editNodeId}
              onSuccess={() => {
                setEditNodeId(null);
                setModal({ open: false, content: '' });
              }}
              onCancel={() => setEditNodeId(null)}
            />
          ) : (
            <>
              <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}
                dangerouslySetInnerHTML={{ __html: modal.content }}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditNodeId(modal.nodeId)}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => setModal({ open: false, content: '' })}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}