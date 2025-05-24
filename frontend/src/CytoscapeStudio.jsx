import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import RelationAndAttributePanel from './RelationAndAttributePanel';
import NodeForm from './NodeForm';
import NodeUpdateForm from './NodeUpdateForm';
import { API_BASE } from './config';

cytoscape.use(dagre);

export default function CytoscapeStudio() {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const [modal, setModal] = useState({ open: false, content: '' });
  const [editNodeId, setEditNodeId] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    requestAnimationFrame(() => {
      const cy = cytoscape({
        container: containerRef.current,
        style: [
          {
            selector: 'node',
            style: {
              "shape": "round-rectangle",
              "width": "label",
              "height": "label",
              "content": 'data(label)',
              "padding": "10pt",
              'text-valign': 'center',
              "text-wrap": "wrap",
              'background-color': '#e4ebec',
              color: '#000',
              "outline-width": "2pt",
              "outline-color": "#6073ec"
            }
          },
          {
            selector: "edge",
            style: {
              "label": "data(name)",  // Always show label
              "font-size": 12,
              "text-rotation": "autorotate",
              "text-rotation-strict": "true", // Ensure label follows edge direction
              "text-background-color": "#f9f9f9",
              "text-background-opacity": 1,
              "text-background-shape": "roundrectangle",
              "color": "#2c3e50",
              "width": 2,
              "line-color": "#95a5a6",
              "target-arrow-shape": "triangle",
              "target-arrow-color": "#95a5a6",
              "curve-style": "bezier",
              // Optional: adjust label position along the edge
              "text-margin-y": -10
            }
          }
        ],
        layout: { name: 'dagre' }
      });

      cyRef.current = cy;

      // Add this block for click-to-select edge label
      cy.on('tap', 'edge', (evt) => {
        cy.elements('edge').unselect(); // Unselect all edges
        evt.target.select(); // Select the clicked edge
      });
      cy.on('tap', (evt) => {
        if (evt.target === cy) {
          cy.elements('edge').unselect(); // Unselect all edges when background is clicked
        }
      });

      // Tooltip on node hover (use getInfo API)
      cy.on('mouseover', 'node', async (evt) => {
        const node = evt.target;
        const pos = node.renderedPosition();
        const nodeId = node.data().id;

        try {
          const res = await fetch(`${API_BASE}/api/getInfo/${nodeId}`);
          const data = await res.json();

          let content = `<div><b>Node:</b> ${data.label || data.name || nodeId}</div>`;
          if (data.qualifier) {
            content += `<div><b>Qualifier:</b> ${data.qualifier}</div>`;
          }
          if (data.description) {
            content += `<div><b>Description:</b> ${data.description}</div>`;
          }
          if (data.role) {
            content += `<div><b>Role:</b> ${data.role}</div>`;
          }
          if (data.attributes && data.attributes.length) {
            content += `<div style="margin-top:8px;"><b>Attributes:</b><ul style="margin:0;padding-left:18px;">` +
              data.attributes.map(attr =>
                `<li><b>${attr.name}</b>: ${attr.value ?? ''}${attr.unit ? ' <span style="color:#888">[' + attr.unit + ']</span>' : ''} ${attr.quantifier ? '(' + attr.quantifier + ')' : ''} ${attr.modality ? '[' + attr.modality + ']' : ''}</li>`
              ).join('') +
              `</ul></div>`;
          }
          if (data.relations && data.relations.length) {
            content += `<div style="margin-top:8px;"><b>Relations:</b><ul style="margin:0;padding-left:18px;">` +
              data.relations.map(rel => {
                // Try to show rel.type or rel.name for edge label
                const name = rel.name || rel.type || '';
                const target = rel.target ?? '';
                const subjQ = rel.subject_quantifier ? `(${rel.subject_quantifier})` : '';
                const objQ = rel.object_quantifier ? `(${rel.object_quantifier})` : '';
                const modality = rel.modality ? `[${rel.modality}]` : '';
                return `<li><b>${name}</b> → ${target} ${subjQ} ${objQ} ${modality}</li>`;
              }).join('') +
              `</ul></div>`;
          }

          setTooltip({
            visible: true,
            x: pos.x,
            y: pos.y,
            content
          });
        } catch {
          setTooltip({
            visible: true,
            x: pos.x,
            y: pos.y,
            content: '<i>Failed to load node info</i>'
          });
        }
      });
      cy.on('mouseout', 'node', () => setTooltip({ visible: false, x: 0, y: 0, content: '' }));

      // Tooltip on edge hover
      cy.on('mouseover', 'edge', (evt) => {
        const edge = evt.target;
        const pos = edge.midpoint();
        const name = edge.data('name') || edge.data('label') || '';
        // Get source and target node labels
        const sourceNode = edge.source();
        const targetNode = edge.target();
        const sourceLabel = sourceNode.data('label') || sourceNode.data('name') || sourceNode.id();
        const targetLabel = targetNode.data('label') || targetNode.data('name') || targetNode.id();
        const proposition = `<b>${sourceLabel}</b> <span style="color:#6073ec">${name}</span> <b>${targetLabel}</b>`;
        setTooltip({
          visible: true,
          x: pos.x,
          y: pos.y,
          content: name ? proposition : '<i>No name</i>'
        });
      });
      cy.on('mouseout', 'edge', () => setTooltip({ visible: false, x: 0, y: 0, content: '' }));

      // Popup modal on node click (show info using getInfo API)
      cy.on('tap', 'node', async (evt) => {
        const node = evt.target;
        const nodeId = node.data().id;

        try {
          const res = await fetch(`${API_BASE}/api/getInfo/${nodeId}`);
          const data = await res.json();

          let content = `<div><b>Node:</b> ${data.label || data.name || nodeId}</div>`;
          if (data.qualifier) {
            content += `<div><b>Qualifier:</b> ${data.qualifier}</div>`;
          }
          if (data.description) {
            content += `<div><b>Description:</b> ${data.description}</div>`;
          }
          if (data.role) {
            content += `<div><b>Role:</b> ${data.role}</div>`;
          }
          if (data.attributes && data.attributes.length) {
            content += `<div style="margin-top:8px;"><b>Attributes:</b><ul style="margin:0;padding-left:18px;">` +
              data.attributes.map(attr =>
                `<li><b>${attr.name}</b>: ${attr.value ?? ''}${attr.unit ? ' <span style="color:#888">[' + attr.unit + ']</span>' : ''} ${attr.quantifier ? '(' + attr.quantifier + ')' : ''} ${attr.modality ? '[' + attr.modality + ']' : ''}</li>`
              ).join('') +
              `</ul></div>`;
          }
          if (data.relations && data.relations.length) {
            content += `<div style="margin-top:8px;"><b>Relations:</b><ul style="margin:0;padding-left:18px;">` +
              data.relations.map(rel => {
                // Try to show rel.type or rel.name for edge label
                const name = rel.name || rel.type || '';
                const target = rel.target ?? '';
                const subjQ = rel.subject_quantifier ? `(${rel.subject_quantifier})` : '';
                const objQ = rel.object_quantifier ? `(${rel.object_quantifier})` : '';
                const modality = rel.modality ? `[${rel.modality}]` : '';
                return `<li><b>${name}</b> → ${target} ${subjQ} ${objQ} ${modality}</li>`;
              }).join('') +
              `</ul></div>`;
          }

          setModal({
            open: true,
            content,
            nodeId
          });
          setEditNodeId(null);
        } catch {
          setModal({
            open: true,
            content: "<div style='color:red'>Failed to load node details.</div>",
            nodeId
          });
          setEditNodeId(null);
        }
      });

      cy.on('render', () => {
        console.log("✅ Cytoscape render complete");
      });

      fetch(`${API_BASE}/api/graph`)
        .then(res => res.json())
        .then(data => {
          console.log("🌐 Graph data:", data);
          if (data?.elements) {
            cy.add(data.elements);
            cy.layout({ name: 'dagre' }).run();
          }
        })
        .catch(err => console.warn("❌ Failed to fetch graph:", err));
    });

    return () => {
      try {
        cyRef.current?.destroy();
      } catch (err) {
        console.warn("⚠️ Cytoscape destroy error:", err);
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
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
          width: drawerOpen
            ? (window.innerWidth > 640 ? '75vw' : '100%')
            : '0',
          maxWidth: drawerOpen
            ? (window.innerWidth < 640 ? '75vw' : '75%')
            : '0',
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
            left: tooltip.x + 10,
            top: tooltip.y + 10,
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid #ccc',
            borderRadius: 4,
            padding: '8px 12px',
            fontSize: 13,
            pointerEvents: 'none',
            zIndex: 2000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
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
                // Optionally refresh graph/nodes here
              }}
              onCancel={() => setEditNodeId(null)}
            />
          ) : (
            <>
              <div
                style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}
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



