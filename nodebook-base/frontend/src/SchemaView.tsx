import React, { useState, useEffect } from 'react';
import type { RelationType, AttributeType, NodeType } from './types';
import { SchemaEditModal } from './SchemaEditModal';

interface SchemaViewProps {
  onSchemaChange: () => void;
}

type SchemaViewMode = 'nodes' | 'relations' | 'attributes';

export function SchemaView({ onSchemaChange }: SchemaViewProps) {
  const [mode, setMode] = useState<SchemaViewMode>('nodes');
  
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [relationTypes, setRelationTypes] = useState<RelationType[]>([]);
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([]);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const fetchAllSchemas = () => {
    fetch('/api/schema/nodetypes').then(res => res.json()).then(setNodeTypes);
    fetch('/api/schema/relations').then(res => res.json()).then(setRelationTypes);
    fetch('/api/schema/attributes').then(res => res.json()).then(setAttributeTypes);
  };

  useEffect(() => {
    fetchAllSchemas();
  }, []);

  const handleSchemaChange = () => {
    fetchAllSchemas();
    onSchemaChange();
  };

  const handleSave = async (item: any) => {
    const isCreating = !item.originalName;
    const url = isCreating
      ? `/api/schema/${mode}`
      : `/api/schema/${mode}/${item.originalName}`;
    
    const method = isCreating ? 'POST' : 'PUT';

    // Clean up the item before sending
    const payload = { ...item };
    delete payload.originalName;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const { error } = await res.json();
      alert(`Error: ${error}`);
    } else {
      setEditingItem(null);
      handleSchemaChange();
    }
  };

  const handleDelete = async (type: SchemaViewMode, name: string) => {
    if (window.confirm(`Are you sure you want to delete the type "${name}"?`)) {
      await fetch(`/api/schema/${type}/${name}`, { method: 'DELETE' });
      handleSchemaChange();
    }
  };

  const openModalForEdit = (item: any) => {
    setEditingItem({ ...item, originalName: item.name });
  };

  const openModalForCreate = () => {
    setEditingItem({});
  };

  return (
    <div className="schema-view">
      <div className="tabs">
        <button className={`tab-button ${mode === 'nodes' ? 'active' : ''}`} onClick={() => setMode('nodes')}>Node Types ({nodeTypes.length})</button>
        <button className={`tab-button ${mode === 'relations' ? 'active' : ''}`} onClick={() => setMode('relations')}>Relation Types ({relationTypes.length})</button>
        <button className={`tab-button ${mode === 'attributes' ? 'active' : ''}`} onClick={() => setMode('attributes')}>Attribute Types ({attributeTypes.length})</button>
        <button className="create-new-btn" onClick={openModalForCreate}>+ Create New</button>
      </div>
      <div className="schema-grid">
        {mode === 'nodes' && nodeTypes.map(item => (
          <div key={item.name} className="schema-card" onClick={() => openModalForEdit(item)}>
            <h4>{item.name}</h4>
            <p>{item.description}</p>
            {item.parent_types && item.parent_types.length > 0 && <small>Parents: {item.parent_types.join(', ')}</small>}
          </div>
        ))}
        {mode === 'relations' && relationTypes.map(item => (
          <div key={item.name} className="schema-card" onClick={() => openModalForEdit(item)}>
            <h4>{item.name}</h4>
            <p>{item.description}</p>
            <small>Inverse: {item.inverse_name}</small>
            <small>Symmetric: {String(item.symmetric)}</small>
            <small>Transitive: {String(item.transitive)}</small>
            {item.domain && item.domain.length > 0 && <small>Domain: {item.domain.join(', ')}</small>}
            {item.range && item.range.length > 0 && <small>Range: {item.range.join(', ')}</small>}
          </div>
        ))}
        {mode === 'attributes' && attributeTypes.map(item => (
          <div key={item.name} className="schema-card" onClick={() => openModalForEdit(item)}>
            <h4>{item.name}</h4>
            <p>{item.description}</p>
            <small>Value Type: {item.value_type}</small>
            {item.scope && item.scope.length > 0 && <small>Scope: {item.scope.join(', ')}</small>}
          </div>
        ))}
      </div>
      {editingItem && (
        <SchemaEditModal
          item={editingItem}
          itemType={mode}
          onClose={() => setEditingItem(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
