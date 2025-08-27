import React, { useState, useEffect } from 'react';
import type { RelationType, AttributeType, NodeType, FunctionType } from './types';
import './SchemaEditModal.css';

interface SchemaEditModalProps {
  item: any;
  itemType: 'nodes' | 'relations' | 'attributes' | 'functions';
  nodeTypes: NodeType[];
  attributeTypes: AttributeType[];
  onClose: () => void;
  onSave: (item: any) => void;
}

function MultiSelect({ options, selected, onChange }: { options: string[], selected: string[], onChange: (selected: string[]) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  return (
    <div className="multi-select">
      <div className="multi-select-header" onClick={() => setIsOpen(!isOpen)}>
        {selected.length > 0 ? selected.join(', ') : 'Select...'}
      </div>
      {isOpen && (
        <div className="multi-select-options">
          {options.map(option => (
            <label key={option}>
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => handleSelect(option)}
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}


export function SchemaEditModal({ item, itemType, nodeTypes, attributeTypes, onClose, onSave }: SchemaEditModalProps) {
  const [formData, setFormData] = useState(item);

  useEffect(() => {
    setFormData(item);
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleMultiSelectChange = (name: string, selected: string[]) => {
    setFormData({ ...formData, [name]: selected });
  };

  const handleInsertAttribute = (attributeName: string) => {
    setFormData({
      ...formData,
      expression: `${formData.expression || ''}"${attributeName}"`
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const renderNodeForm = () => (
    <>
      <label>Name: <input name="name" value={formData.name || ''} onChange={handleChange} required /></label>
      <label>Description: <textarea name="description" value={formData.description || ''} onChange={handleChange} /></label>
      <label>Parent Types:
        <MultiSelect
          options={nodeTypes.map(nt => nt.name)}
          selected={formData.parent_types || []}
          onChange={(selected) => handleMultiSelectChange('parent_types', selected)}
        />
      </label>
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
      <label>Domain (Node types):
        <MultiSelect
          options={nodeTypes.map(nt => nt.name)}
          selected={formData.domain || []}
          onChange={(selected) => handleMultiSelectChange('domain', selected)}
        />
      </label>
      <label>Range (Node types):
        <MultiSelect
          options={nodeTypes.map(nt => nt.name)}
          selected={formData.range || []}
          onChange={(selected) => handleMultiSelectChange('range', selected)}
        />
      </label>
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
      <label>Scope (Node types):
        <MultiSelect
          options={nodeTypes.map(nt => nt.name)}
          selected={formData.scope || []}
          onChange={(selected) => handleMultiSelectChange('scope', selected)}
        />
      </label>
    </>
  );

  const renderFunctionForm = () => (
    <>
      <label>Name: <input name="name" value={formData.name || ''} onChange={handleChange} required /></label>
      <label>Expression:
        <textarea name="expression" value={formData.expression || ''} onChange={handleChange} required />
        <div className="expression-helper">
          <select onChange={(e) => handleInsertAttribute(e.target.value)}>
            <option value="">Insert Attribute...</option>
            {attributeTypes.map(at => <option key={at.name} value={at.name}>{at.name}</option>)}
          </select>
          <p className="setting-description">
            Valid operators: +, -, *, /, ^, %
          </p>
        </div>
      </label>
      <label>Scope (Node types):
        <MultiSelect
          options={nodeTypes.map(nt => nt.name)}
          selected={formData.scope || []}
          onChange={(selected) => handleMultiSelectChange('scope', selected)}
        />
      </label>
    </>
  );

  const renderFormContent = () => {
    switch (itemType) {
      case 'nodes': return renderNodeForm();
      case 'relations': return renderRelationForm();
      case 'attributes': return renderAttributeForm();
      case 'functions': return renderFunctionForm();
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