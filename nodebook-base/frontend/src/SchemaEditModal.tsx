import React, { useState, useEffect } from 'react';
import type { NodeType, RelationType, AttributeType } from './types';

interface SchemaEditModalProps {
  item: Partial<NodeType | RelationType | AttributeType> | null;
  itemType: 'nodes' | 'relations' | 'attributes';
  onClose: () => void;
  onSave: (item: any) => void;
}

export function SchemaEditModal({ item, itemType, onClose, onSave }: SchemaEditModalProps) {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    setFormData(item || {});
  }, [item]);

  if (!item) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isBoolean = (e.target as HTMLSelectElement).type === 'select-one' && typeof JSON.parse(value) === 'boolean';
    setFormData({ ...formData, [name]: isBoolean ? JSON.parse(value) : value });
  };

  const handleArrayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const parts = value.split(';');
    // Trim all parts except the last one, which the user may still be typing.
    const processedParts = parts.map((part, index) => index === parts.length - 1 ? part : part.trim());
    setFormData({ ...formData, [name]: processedParts });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Perform a final trim on all array fields before saving
    const finalFormData = { ...formData };
    for (const key in finalFormData) {
      if (Array.isArray(finalFormData[key])) {
        finalFormData[key] = finalFormData[key].map((s: string) => s.trim()).filter(Boolean); // Also remove empty strings
      }
    }
    onSave(finalFormData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>&times;</button>
        <h3>{formData.name ? `Edit ${formData.name}` : `Create New ${itemType.slice(0, -1)} Type`}</h3>
        <form onSubmit={handleSubmit} className="schema-edit-form">
          <label>Name: <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required /></label>
          <label>Description: <textarea name="description" value={formData.description || ''} onChange={handleChange}></textarea></label>
          <label>Aliases: <input type="text" name="aliases" value={(formData.aliases || []).join(';')} onChange={handleArrayChange} placeholder="e.g. kind of;type of" /></label>

          {itemType === 'nodes' && (
            <label>Parent Types: <input type="text" name="parent_types" value={(formData.parent_types || []).join(';')} onChange={handleArrayChange} /></label>
          )}

          {itemType === 'relations' && (
            <>
              <label>Inverse Name: <input type="text" name="inverse_name" value={formData.inverse_name || ''} onChange={handleChange} /></label>
              <label>Symmetric: 
                <select name="symmetric" value={String(formData.symmetric || false)} onChange={handleChange}>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </label>
              <label>Transitive: 
                <select name="transitive" value={String(formData.transitive || false)} onChange={handleChange}>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </label>
              <label>Domain: <input type="text" name="domain" value={(formData.domain || []).join(';')} onChange={handleArrayChange} /></label>
              <label>Range: <input type="text" name="range" value={(formData.range || []).join(';')} onChange={handleArrayChange} /></label>
            </>
          )}

          {itemType === 'attributes' && (
            <>
              <label>Value Type: 
                <select name="value_type" value={formData.value_type || 'string'} onChange={handleChange}>
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="integer">integer</option>
                  <option value="boolean">boolean</option>
                  <option value="date">date</option>
                  <option value="lat-long">lat-long</option>
                </select>
              </label>
              <label>Scope: <input type="text" name="scope" value={(formData.scope || []).join(';')} onChange={handleArrayChange} /></label>
            </>
          )}

          <button type="submit">Save</button>
        </form>
      </div>
    </div>
  );
}
