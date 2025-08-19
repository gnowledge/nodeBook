import React, { useState, useEffect } from 'react';
import type { RelationType, AttributeType, NodeType, FunctionType } from './types';
import { SchemaEditModal } from './SchemaEditModal';
import { API_BASE_URL } from './api-config';

interface SchemaViewProps {
  onSchemaChange: () => void;
}

type SchemaViewMode = 'nodes' | 'relations' | 'attributes' | 'functions';

export function SchemaView({ onSchemaChange }: SchemaViewProps) {
  const [mode, setMode] = useState<SchemaViewMode>('nodes');
  
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [relationTypes, setRelationTypes] = useState<RelationType[]>([]);
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([]);
  const [functionTypes, setFunctionTypes] = useState<FunctionType[]>([]);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const fetchAllSchemas = () => {
    fetch(`${API_BASE_URL}/api/schema/nodetypes`).then(res => res.json()).then(setNodeTypes);
    fetch(`${API_BASE_URL}/api/schema/relations`).then(res => res.json()).then(setRelationTypes);
    fetch(`${API_BASE_URL}/api/schema/attributes`).then(res => res.json()).then(setAttributeTypes);
    fetch(`${API_BASE_URL}/api/schema/functions`).then(res => res.json()).then(setFunctionTypes);
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
    const itemType = editingItem.itemType;
    const url = isCreating
      ? `${API_BASE_URL}/api/schema/${itemType}`
      : `${API_BASE_URL}/api/schema/${itemType}/${item.originalName}`;
    
    const method = isCreating ? 'POST' : 'PUT';

    const payload = { ...item };
    delete payload.originalName;
    delete payload.itemType;

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
      await fetch(`${API_BASE_URL}/api/schema/${type}/${name}`, { method: 'DELETE' });
      handleSchemaChange();
    }
  };

  const openModalForEdit = (item: any, itemType: SchemaViewMode) => {
    setEditingItem({ ...item, originalName: item.name, itemType });
  };

  const openModalForCreate = () => {
    setEditingItem({ itemType: mode });
  };

  return (
    <div className="schema-view">
      <div className="schema-tabs">
        <button className={`schema-tab-btn ${mode === 'nodes' ? 'active' : ''}`} onClick={() => setMode('nodes')} title="Node Types">NT</button>
        <button className={`schema-tab-btn ${mode === 'relations' ? 'active' : ''}`} onClick={() => setMode('relations')} title="Relation Types">RT</button>
        <button className={`schema-tab-btn ${mode === 'attributes' ? 'active' : ''}`} onClick={() => setMode('attributes')} title="Attribute Types">AT</button>
        <button className={`schema-tab-btn ${mode === 'functions' ? 'active' : ''}`} onClick={() => setMode('functions')} title="Function Types">FT</button>
        <button className="create-new-btn" onClick={openModalForCreate}>+ Create New</button>
      </div>
      <div className="schema-grid">
        {mode === 'nodes' && nodeTypes.map(item => (
          <div key={item.name} className="schema-card" onClick={() => openModalForEdit(item, 'nodes')}>
            <h4>{item.name}</h4>
            <p>{item.description}</p>
            {item.parent_types && item.parent_types.length > 0 && <small>Parents: {item.parent_types.join(', ')}</small>}
          </div>
        ))}
        {mode === 'relations' && relationTypes.map(item => (
          <div key={item.name} className="schema-card" onClick={() => openModalForEdit(item, 'relations')}>
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
          <div key={item.name} className="schema-card" onClick={() => openModalForEdit(item, 'attributes')}>
            <h4>{item.name}</h4>
            <p>{item.description}</p>
            <small>Value Type: {item.value_type}</small>
            {item.scope && item.scope.length > 0 && <small>Scope: {item.scope.join(', ')}</small>}
          </div>
        ))}
        {mode === 'functions' && functionTypes.map(item => (
          <div key={item.name} className="schema-card" onClick={() => openModalForEdit(item, 'functions')}>
            <h4>{item.name}</h4>
            <p>{item.expression}</p>
            {item.scope && item.scope.length > 0 && <small>Scope: {item.scope.join(', ')}</small>}
          </div>
        ))}
      </div>
      {editingItem && (
        <SchemaEditModal
          item={editingItem}
          itemType={editingItem.itemType}
          nodeTypes={nodeTypes}
          attributeTypes={attributeTypes}
          onClose={() => setEditingItem(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
