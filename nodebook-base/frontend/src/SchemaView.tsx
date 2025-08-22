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
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    fetch(`${API_BASE_URL}/api/schema/nodetypes`, { headers })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401) {
            console.error('Authentication failed, redirecting to login');
            // You might want to redirect to login or show an error
          }
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(setNodeTypes)
      .catch(error => {
        console.error('Error fetching node types:', error);
        setNodeTypes([]);
      });

    fetch(`${API_BASE_URL}/api/schema/relations`, { headers })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401) {
            console.error('Authentication failed, redirecting to login');
          }
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(setRelationTypes)
      .catch(error => {
        console.error('Error fetching relation types:', error);
        setRelationTypes([]);
      });

    fetch(`${API_BASE_URL}/api/schema/attributes`, { headers })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401) {
            console.error('Authentication failed, redirecting to login');
          }
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(setAttributeTypes)
      .catch(error => {
        console.error('Error fetching attribute types:', error);
        setAttributeTypes([]);
      });

    fetch(`${API_BASE_URL}/api/schema/functions`, { headers })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401) {
            console.error('Authentication failed, redirecting to login');
          }
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(setFunctionTypes)
      .catch(error => {
        console.error('Error fetching function types:', error);
        setFunctionTypes([]);
      });
  };

  useEffect(() => {
    fetchAllSchemas();
  }, []);

  const handleSchemaChange = () => {
    fetchAllSchemas();
    onSchemaChange();
  };

  const handleSave = async (item: any) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No authentication token found. Please log in again.');
      return;
    }

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
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      if (res.status === 401) {
        alert('Authentication failed. Please log in again.');
        return;
      }
      const { error } = await res.json();
      alert(`Error: ${error}`);
    } else {
      setEditingItem(null);
      handleSchemaChange();
    }
  };

  const handleDelete = async (type: SchemaViewMode, name: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No authentication token found. Please log in again.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete the type "${name}"?`)) {
      const res = await fetch(`${API_BASE_URL}/api/schema/${type}/${name}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          alert('Authentication failed. Please log in again.');
          return;
        }
        const { error } = await res.json();
        alert(`Error: ${error}`);
        return;
      }
      
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
