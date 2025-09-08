import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import svg from 'cytoscape-svg';
import type { Node, Edge, Attribute } from './types';
import { cytoscapeStylesheet, cytoscapeLayouts } from './cytoscape-styles';
import './Visualization.css';

cytoscape.use(dagre);
cytoscape.use(svg);

interface VisualizationProps {
  nodes: Node[];
  relations: Edge[];
  attributes: Attribute[];
  onNodeSelect: (nodeId: string | null) => void;
  graphMode?: 'richgraph' | 'mindmap';
}

export function Visualization({ nodes, relations, attributes, onNodeSelect, graphMode = 'richgraph' }: VisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const MEDIA_BACKEND_URL = (import.meta as any).env?.VITE_MEDIA_BACKEND_URL || '';

  const [exportOpen, setExportOpen] = useState(false);
  const [exportFilename, setExportFilename] = useState('');
  const [exportBlob, setExportBlob] = useState<Blob | null>(null);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'svg'>('png');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const cyNodes = nodes.map(node => ({
      data: { 
        id: node.id, 
        label: node.name, 
        type: node.role === 'Transition' ? 'transition' : 'polynode' 
      }
    }));

    const attributeValueNodes = attributes.map(attr => ({
        data: {
            id: attr.id,
            label: `${attr.value}`, // Simplified label
            type: 'attribute_value'
        }
    }));

    const cyEdges = relations.map(edge => ({
      data: { 
        id: edge.id, 
        source: edge.source_id, 
        target: edge.target_id, 
        label: graphMode === 'mindmap' ? '' : edge.name // Hide edge labels in MindMap mode
      }
    }));

    const attributeEdges = attributes.map(attr => ({
        data: {
            id: `${attr.id}_edge`,
            source: attr.source_id,
            target: attr.id,
            label: attr.name
        }
    }));

    const elements = { 
        nodes: [...cyNodes, ...attributeValueNodes], 
        edges: [...cyEdges, ...attributeEdges] 
    };

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: cytoscapeStylesheet as any,
      layout: cytoscapeLayouts.dagre
    });

    cyRef.current.on('tap', 'node', (event) => {
        const nodeId = event.target.id();
        onNodeSelect(nodeId);
    });
    
    cyRef.current.on('tap', (event) => {
        if (event.target === cyRef.current) {
            onNodeSelect(null);
        }
    });

    return () => {
        cyRef.current?.destroy();
    }

  }, [nodes, relations, attributes, onNodeSelect]);

  const startExport = async (format: 'png' | 'jpg' | 'svg') => {
    if (!cyRef.current) return;

    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const defaultName = `graph-${stamp}.${format}`;

    let blob: Blob;
    if (format === 'svg') {
      const svgStr = (cyRef.current as any).svg({ full: true });
      blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    } else if (format === 'png') {
      const dataUrl = cyRef.current.png();
      blob = await (await fetch(dataUrl)).blob();
    } else {
      const dataUrl = cyRef.current.jpg();
      blob = await (await fetch(dataUrl)).blob();
    }

    setExportBlob(blob);
    setExportFilename(defaultName);
    setExportFormat(format);
    setExportOpen(true);
  };

  const performDownload = (blob: Blob, filename: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uploadToMedia = async () => {
    if (!exportBlob) return;
    setUploading(true);
    try {
      const form = new FormData();
      const file = new File([exportBlob], exportFilename, { type: exportBlob.type || (exportFormat === 'svg' ? 'image/svg+xml' : exportFormat === 'png' ? 'image/png' : 'image/jpeg') });
      form.append('file', file);
      // Optional: include a simple description
      form.append('description', `Exported ${exportFormat.toUpperCase()} from NodeBook Visualization`);

      const res = await fetch(`${MEDIA_BACKEND_URL}/api/media/upload`, {
        method: 'POST',
        body: form
      });
      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }
      alert('✅ Export uploaded to Media Library');
      setExportOpen(false);
    } catch (e) {
      console.error('Upload error', e);
      alert('❌ Failed to upload to Media Library');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="visualization-wrapper">
      <div className="export-buttons">
        <button onClick={() => startExport('png')}>Export as PNG</button>
        <button onClick={() => startExport('jpg')}>Export as JPG</button>
        <button onClick={() => startExport('svg')}>Export as SVG</button>
      </div>
      <div id="cy" ref={containerRef} />

      {exportOpen && (
        <div className="export-modal-backdrop" onClick={() => !uploading && setExportOpen(false)}>
          <div className="export-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Export graph</h4>
            <label style={{ display: 'block', marginTop: '0.5rem' }}>Filename</label>
            <input
              type="text"
              value={exportFilename}
              onChange={(e) => setExportFilename(e.target.value)}
            />
            <div className="export-modal-actions">
              <button onClick={() => exportBlob && performDownload(exportBlob, exportFilename)} disabled={uploading}>Download</button>
              <button onClick={uploadToMedia} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload to Media'}</button>
              <button onClick={() => !uploading && setExportOpen(false)} disabled={uploading}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}