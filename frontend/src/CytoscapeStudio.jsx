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
    console.log('useEffect: Initializing Cytoscape', { userId, graphId, containerRef: !!containerRef.current });
    if (!containerRef.current) {
      console.error('useEffect: containerRef.current is null or undefined');
      return;
    }

    const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const apiPrefix = `${base}/api/users/${userId}/graphs/${graphId}`;
    console.log('useEffect: API prefix', apiPrefix);

    requestAnimationFrame(() => {
      console.log('useEffect: Creating Cytoscape instance');
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
      console.log('useEffect: Cytoscape instance created', { cy: !!cy });

      // Store nodes with inverted colors
      let invertedNodes = [];
      console.log('useEffect: Initialized invertedNodes array');

      // Helper to reset node colors
      const resetNodeColors = () => {
        console.log('resetNodeColors: Restoring colors for', invertedNodes.length, 'nodes');
        invertedNodes.forEach(node => {
          console.log('resetNodeColors: Restoring node', node.id());
          node.style({
            'background-color': '#e4ebec',
            color: '#000'
          });
        });
        invertedNodes = [];
      };

      // Edge mouseover: Show tooltip
      cy.on('mouseover', 'edge', (evt) => {
        const edge = evt.target;
        console.log('edge.mouseover: Triggered for edge', edge.id(), { data: edge.data() });
        const midpoint = edge.midpoint();
        const rendered = cy.renderer().projectToRenderedCoordinates(midpoint);
        console.log('edge.mouseover: Midpoint and rendered coordinates', { midpoint, rendered });

        const name = edge.data('name') || edge.data('label') || '';
        const sourceLabel = edge.source().data('label') || edge.source().id();
        const targetLabel = edge.target().data('label') || edge.target().id();
        const proposition = `<b>${sourceLabel}</b> <span style="color:#6073ec">${name}</span> <b>${targetLabel}</b>`;
        console.log('edge.mouseover: Tooltip content', { name, sourceLabel, targetLabel, proposition });

        // Ensure tooltip stays within viewport
        const canvasRect = containerRef.current.getBoundingClientRect();
        const tooltipWidth = 200;
        const tooltipHeight = 100;
        let x = rendered.x + 10;
        let y = rendered.y + 10;

        if (x + tooltipWidth > canvasRect.width) x = rendered.x - tooltipWidth - 10;
        if (y + tooltipHeight > canvasRect.height) y = rendered.y - tooltipHeight - 10;
        console.log('edge.mouseover: Tooltip position', { x, y, canvasRect });

        setTooltip({ visible: true, x, y, content: name ? proposition : '<i>No name</i>' });
        console.log('edge.mouseover: Set tooltip state', { visible: true, x, y, content: name ? proposition : '<i>No name</i>' });
      });

      // Edge mouseout: Hide tooltip
      cy.on('mouseout', 'edge', () => {
        console.log('edge.mouseout: Hiding tooltip');
        setTooltip({ visible: false, x: 0, y: 0, content: '' });
      });

      // Edge tap: Select edge and invert node colors
      cy.on('tap', 'edge', (evt) => {
        console.log('edge.tap: Triggered for edge', evt.target.id(), { data: evt.target.data() });
        cy.elements('edge').unselect();
        evt.target.select();
        console.log('edge.tap: Edge selected', evt.target.id());

        // Reset previous inverted nodes
        resetNodeColors();

        const edge = evt.target;
        const midpoint = edge.midpoint();
        const rendered = cy.renderer().projectToRenderedCoordinates(midpoint);
        const name = edge.data('name') || edge.data('label') || '';
        const sourceLabel = edge.source().data('label') || edge.source().id();
        const targetLabel = edge.target().data('label') || edge.target().id();
        const proposition = `<b>${sourceLabel}</b> <span style="color:#6073ec">${name}</span> <b>${targetLabel}</b>`;
        console.log('edge.tap: Tooltip content', { name, sourceLabel, targetLabel, proposition });

        // Ensure tooltip stays within viewport
        const canvasRect = containerRef.current.getBoundingClientRect();
        const tooltipWidth = 200;
        const tooltipHeight = 100;
        let x = rendered.x + 10;
        let y = rendered.y + 10;

        if (x + tooltipWidth > canvasRect.width) x = rendered.x - tooltipWidth - 10;
        if (y + tooltipHeight > canvasRect.height) y = rendered.y - tooltipHeight - 10;
        console.log('edge.tap: Tooltip position', { x, y, canvasRect });

        setTooltip({ visible: true, x, y, content: name ? proposition : '<i>No name</i>' });
        console.log('edge.tap: Set tooltip state', { visible: true, x, y, content: name ? proposition : '<i>No name</i>' });

        // Invert colors for source and target nodes
        const source = edge.source();
        const target = edge.target();
        console.log('edge.tap: Inverting colors for nodes', { source: source.id(), target: target.id() });
        [source, target].forEach(node => {
          const origBg = node.style('background-color') || '#e4ebec';
          const origColor = node.style('color') || '#000';
          console.log('edge.tap: Node styles before inversion', {
            nodeId: node.id(),
            origBg,
            origColor
          });
          node.style({
            'background-color': origColor,
            color: origBg
          });
          console.log('edge.tap: Node styles after inversion', {
            nodeId: node.id(),
            newBg: node.style('background-color'),
            newColor: node.style('color')
          });
          invertedNodes.push(node);
        });
        console.log('edge.tap: Updated invertedNodes', invertedNodes.map(n => n.id()));
      });

      // Canvas tap: Clear selections, tooltip, and reset colors
      cy.on('tap', (evt) => {
        if (evt.target === cy) {
          console.log('canvas.tap: Clearing selections and resetting state');
          cy.elements('edge').unselect();
          setTooltip({ visible: false, x: 0, y: 0, content: '' });
          resetNodeColors();
        }
      });

      // Node mouseover: Show node details
      cy.on('mouseover', 'node', async (evt) => {
        const node = evt.target;
        console.log('node.mouseover: Triggered for node', node.id());
        const pos = node.renderedPosition();
        const nodeId = node.data().id;

        try {
          console.log('node.mouseover: Fetching node data', `${apiPrefix}/nodes/${nodeId}`);
          const res = await fetch(`${apiPrefix}/nodes/${nodeId}`);
          const data = await res.json();
          console.log('node.mouseover: Node data received', data);

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

          // Adjust tooltip position
          const canvasRect = containerRef.current.getBoundingClientRect();
          const tooltipWidth = 200;
          const tooltipHeight = 100;
          let x = pos.x + 10;
          let y = pos.y + 10;
          if (x + tooltipWidth > canvasRect.width) x = pos.x - tooltipWidth - 10;
          if (y + tooltipHeight > canvasRect.height) y = pos.y - tooltipHeight - 10;
          console.log('node.mouseover: Tooltip position', { x, y, canvasRect });

          setTooltip({ visible: true, x, y, content });
          console.log('node.mouseover: Set tooltip state', { visible: true, x, y, content });
        } catch (err) {
          console.error('node.mouseover: Failed to fetch node info', err);
          setTooltip({ visible: true, x: pos.x, y: pos.y, content: '<i>Failed to load node info</i>' });
        }
      });

      // Node mouseout: Hide tooltip
      cy.on('mouseout', 'node', () => {
        console.log('node.mouseout: Hiding tooltip');
        setTooltip({ visible: false, x: 0, y: 0, content: '' });
      });

      // Node tap: Show modal
      cy.on('tap', 'node', async (evt) => {
        const node = evt.target;
        const nodeId = node.data().id;
        console.log('node.tap: Triggered for node', nodeId);

        try {
          console.log('node.tap: Fetching node data', `${apiPrefix}/nodes/${nodeId}`);
          const res = await fetch(`${apiPrefix}/nodes/${nodeId}`);
          const data = await res.json();
          console.log('node.tap: Node data received', data);

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
          console.log('node.tap: Set modal state', { open: true, nodeId });
        } catch (err) {
          console.error('node.tap: Failed to load node details', err);
          setModal({ open: true, content: '<div style="color:red">Failed to load node details.</div>', nodeId });
          setEditNodeId(null);
        }
      });

      cy.on('render', () => console.log('cy.render: Cytoscape render complete'));

      console.log('useEffect: Fetching graph data from', `${apiPrefix}/graphdb`);
      fetch(`${apiPrefix}/graphdb`)
        .then(res => {
          console.log('useEffect: Graph fetch response', { status: res.status });
          return res.json();
        })
        .then(data => {
          console.log('useEffect: Graph data received', data);
          if (data?.elements) {
            cy.add(data.elements);
            console.log('useEffect: Added elements to Cytoscape', data.elements);
            cy.layout(layoutOptions[layoutName]).run();
            console.log('useEffect: Layout applied', layoutName);
          } else {
            console.warn('useEffect: No elements in graph data');
          }
        })
        .catch(err => console.error('useEffect: Failed to fetch graph', err));

      return () => {
        console.log('useEffect: Cleaning up Cytoscape instance');
        try {
          cyRef.current?.destroy();
          console.log('useEffect: Cytoscape instance destroyed');
        } catch (err) {
          console.error('useEffect: Cytoscape destroy error', err);
        }
      };
    });
  }, [userId, graphId, layoutName]);

  console.log('render: Tooltip state', tooltip);
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
            console.log('layout.select: Changing layout to', e.target.value);
            setLayoutName(e.target.value);
            if (cyRef.current) {
              cyRef.current.layout(layoutOptions[e.target.value]).run();
              console.log('layout.select: Layout applied', e.target.value);
            } else {
              console.error('layout.select: cyRef.current is null');
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
          onClick={() => {
            console.log('button.click: Opening panel');
            setDrawerOpen(true);
          }}
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
            onClick={() => {
              console.log('button.click: Closing panel');
              setDrawerOpen(false);
            }}
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
                console.log('NodeUpdateForm: Success, closing modal');
                setEditNodeId(null);
                setModal({ open: false, content: '' });
              }}
              onCancel={() => {
                console.log('NodeUpdateForm: Cancelled');
                setEditNodeId(null);
              }}
            />
          ) : (
            <>
              <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}
                dangerouslySetInnerHTML={{ __html: modal.content }}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    console.log('modal.button: Opening edit form for node', modal.nodeId);
                    setEditNodeId(modal.nodeId);
                  }}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    console.log('modal.button: Closing modal');
                    setModal({ open: false, content: '' });
                  }}
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