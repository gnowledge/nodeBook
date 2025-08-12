import React, { useState, useEffect } from 'react';
import type { RelationType, AttributeType, NodeType, FunctionType } from './types';
import { SchemaEditModal } from './SchemaEditModal';

interface SchemaViewProps {
  onSchemaChange: () => void;
}

type SchemaViewMode = 'nodetypes' | 'relations' | 'attributes' | 'functions';

export function SchemaView({ onSchemaChange }: SchemaViewProps) {
  const [mode, setMode] = useState<SchemaViewMode>('nodetypes');
  
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [relationTypes, setRelationTypes] = useState<RelationType[]>([]);
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([]);
  const [functionTypes, setFunctionTypes] = useState<FunctionType[]>([]);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const fetchAllSchemas = async () => {
    const [nodes, rels, attrs, funcs] = await Promise.all([
      window.electronAPI.schema.get('nodetypes'),
      window.electronAPI.schema.get('relations'),
      window.electronAPI.schema.get('attributes'),
      window.electronAPI.schema.get('functions'),
    ]);
    setNodeTypes(nodes);
    setRelationTypes(rels);
    setAttributeTypes(attrs);
    setFunctionTypes(funcs);
  };

  useEffect(() => {
    fetchAllSchemas();
  }, []);

  const handleSchemaChange = () => {
    fetchAllSchemas();
    onSchemaChange();
  };

  const handleSave = async (item: any) => {
    const itemType = editingItem.itemType;
    let currentSchema = await window.electronAPI.schema.get(itemType);
    
    if (item.originalName) { // Editing existing
      currentSchema = currentSchema.map((i: any) => i.name === item.originalName ? item : i);
    } else { // Creating new
      currentSchema.push(item);
    }
    
    await window.electronAPI.schema.update(itemType, currentSchema);
    
    setEditingItem(null);
    handleSchemaChange();
  };

  const handleDelete = async (type: SchemaViewMode, name: string) => {
    if (window.confirm(`Are you sure you want to delete the type "${name}"?`)) {
      await window.electronAPI.schema.deleteItem(type, name);
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
      <div className="tabs">
        <button className={`tab-button ${mode === 'nodetypes' ? 'active' : ''}`} onClick={() => setMode('nodetypes')}>Node Types ({nodeTypes.length})</button>
        <button className={`tab-button ${mode === 'relations' ? 'active' : ''}`} onClick={() => setMode('relations')}>Relation Types ({relationTypes.length})</button>
        <button className={`tab-button ${mode === 'attributes' ? 'active' : ''}`} onClick={() => setMode('attributes')}>Attribute Types ({attributeTypes.length})</button>
        <button className={`tab-button ${mode === 'functions' ? 'active' : ''}`} onClick={() => setMode('functions')}>Functions ({functionTypes.length})</button>
        <button className="create-new-btn" onClick={openModalForCreate}>+ Create New</button>
      </div>
      <div className="schema-grid">
        {mode === 'nodetypes' && nodeTypes.map(item => (
          <div key={item.name} className="schema-card" onClick={() => openModalForEdit(item, 'nodetypes')}>
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
