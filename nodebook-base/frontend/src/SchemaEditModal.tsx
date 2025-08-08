import React, { useState, useEffect } from 'react';
import type { RelationType, AttributeType, NodeType } from './types';

interface SchemaEditModalProps {
  item: any;
  itemType: 'nodes' | 'relations' | 'attributes';
  onClose: () => void;
  onSave: (item: any) => void;
}

export function SchemaEditModal({ item, itemType, onClose, onSave }: SchemaEditModalProps) {
  const [formData, setFormData] = useState(item);

  useEffect(() => {
    setFormData(item);
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData({ ...formData, [name]: checked });
    } else if (name === 'domain' || name === 'range' || name === 'scope' || name === 'parent_types') {
      setFormData({ ...formData, [name]: value.split(',').map(s => s.trim()).filter(Boolean) });
    } 
    else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const renderNodeForm = () => (
    <>
      <label>Name: <input name="name" value={formData.name || ''} onChange={handleChange} required /></label>
      <label>Description: <textarea name="description" value={formData.description || ''} onChange={handleChange} /></label>
      <label>Parent Types (comma-separated): <input name="parent_types" value={(formData.parent_types || []).join(', ')} onChange={handleChange} /></label>
    </>
  );

  const renderRelationForm = () => (
    <>
      <label>Name: <input name="name" value={formData.name || ''} onChange={handleChange} required /></label>
      <label>Description: <textarea name="description" value={formData.description || ''} onChange={handleChange} /></label>
      <label>Inverse Name: <input name="inverse_name" value={formData.inverse_name || ''} onChange={handleChange} /></label>
      <div className="checkbox-group">
        <label><input type="checkbox" name="symmetric" checked={formData.symmetric || false} onChange={handleChange} /> Symmetric</label>
        <label><input type="checkbox" name="transitive" checked={formData.transitive || false} onChange={handleChange} /> Transitive</label>
      </div>
      <label>Domain (Node types, comma-separated): <input name="domain" value={(formData.domain || []).join(', ')} onChange={handleChange} /></label>
      <label>Range (Node types, comma-separated): <input name="range" value={(formData.range || []).join(', ')} onChange={handleChange} /></label>
    </>
  );

  const renderAttributeForm = () => (
    <>
      <label>Name: <input name="name" value={formData.name || ''} onChange={handleChange} required /></label>
      <label>Description: <textarea name="description" value={formData.description || ''} onChange={handleChange} /></label>
      <label>Value Type:
        <select name="value_type" value={formData.value_type || 'string'} onChange={handleChange}>
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="date">Date</option>
        </select>
      </label>
      <label>Scope (Node types, comma-separated): <input name="scope" value={(formData.scope || []).join(', ')} onChange={handleChange} /></label>
    </>
  );

  const renderFormContent = () => {
    switch (itemType) {
      case 'nodes': return renderNodeForm();
      case 'relations': return renderRelationForm();
      case 'attributes': return renderAttributeForm();
      default: return null;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>&times;</button>
        <h2>{item.originalName ? 'Edit' : 'Create'} {itemType.slice(0, -1)} Type</h2>
        <form onSubmit={handleSubmit} className="schema-edit-form">
          {renderFormContent()}
          <button type="submit">Save</button>
        </form>
      </div>
    </div>
  );
}