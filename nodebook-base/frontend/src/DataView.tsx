import React, { useState } from 'react';
import type { Node, Edge, AttributeType } from './types';

interface DataViewProps {
  activeGraphId: string;
  nodes: Node[];
  relations: Edge[];
  attributes: AttributeType[];
  onDataChange: () => void;
}

type DataViewMode = 'nodes' | 'relations' | 'attributes';

export function DataView({ activeGraphId, nodes, relations, attributes, onDataChange }: DataViewProps) {
  const [mode, setMode] = useState<DataViewMode>('nodes');

  const handleDelete = async (type: DataViewMode, item: any) => {
    let confirmMessage = `Are you sure you want to delete this ${type.slice(0, -1)}?`;
    let url = '';
    if (type === 'nodes') {
      confirmMessage += ' This will also delete all connected relations and attributes.';
      url = `/api/graphs/${activeGraphId}/nodes/${item.id}`;
    } else if (type === 'relations') {
      url = `/api/graphs/${activeGraphId}/relations/${item.id}`;
    } else if (type === 'attributes') {
      url = `/api/graphs/${activeGraphId}/attributes/${item.id}`;
    }

    if (window.confirm(confirmMessage)) {
      await fetch(url, { method: 'DELETE' });
      onDataChange();
    }
  };

  return (
    <div className="data-view">
      <div className="tabs">
        <button className={`tab-button ${mode === 'nodes' ? 'active' : ''}`} onClick={() => setMode('nodes')}>Nodes ({nodes.length})</button>
        <button className={`tab-button ${mode === 'relations' ? 'active' : ''}`} onClick={() => setMode('relations')}>Relations ({relations.length})</button>
        <button className={`tab-button ${mode === 'attributes' ? 'active' : ''}`} onClick={() => setMode('attributes')}>Attributes ({attributes.length})</button>
      </div>
      <div className="data-list">
        {mode === 'nodes' && (
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Actions</th></tr></thead>
            <tbody>
              {nodes.map(item => (
                <tr key={item.id}><td>{item.id}</td><td>{item.name}</td><td>{item.role}</td><td><button onClick={() => handleDelete('nodes', item)}>Delete</button></td></tr>
              ))}
            </tbody>
          </table>
        )}
        {mode === 'relations' && (
          <table>
            <thead><tr><th>ID</th><th>Source</th><th>Name</th><th>Target</th><th>Actions</th></tr></thead>
            <tbody>
              {relations.map(item => (
                <tr key={item.id}><td>{item.id}</td><td>{item.source_id}</td><td>{item.name}</td><td>{item.target_id}</td><td><button onClick={() => handleDelete('relations', item)}>Delete</button></td></tr>
              ))}
            </tbody>
          </table>
        )}
        {mode === 'attributes' && (
          <table>
            <thead><tr><th>ID</th><th>Source</th><th>Name</th><th>Value</th><th>Unit</th><th>Actions</th></tr></thead>
            <tbody>
              {attributes.map(item => (
                <tr key={item.id}><td>{item.id}</td><td>{item.source_id}</td><td>{item.name}</td><td>{item.value}</td><td>{item.unit}</td><td><button onClick={() => handleDelete('attributes', item)}>Delete</button></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
