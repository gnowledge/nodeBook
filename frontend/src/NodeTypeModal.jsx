import React, { useState, useEffect } from 'react';

export default function NodeTypeModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
  graphId = "graph1",
  endpoint,
  method = 'POST',
  initialData = null
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentTypes, setParentTypes] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setParentTypes((initialData.parent_types || []).join(', '));
    } else {
      setName('');
      setDescription('');
      setParentTypes('');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    const parentTypesList = parentTypes ? parentTypes.split(',').map(p => p.trim()).filter(Boolean) : [];

    const payload = {
      name: name.trim(),
      description: description.trim(),
      parent_types: parentTypesList
    };

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        const data = isJson ? await res.json() : { detail: await res.text() };
        throw new Error(data.detail || `Failed to ${method === 'PUT' ? 'update' : 'create'} node type`);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>{method === 'PUT' ? 'Edit' : 'Create'} Node Type</h3>

        <div style={styles.field}>
          <label>Name:</label>
          <input value={name} onChange={e => setName(e.target.value)} style={styles.input} disabled={method === 'PUT'} />
        </div>

        <div style={styles.field}>
          <label>Description:</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} style={styles.textarea} />
        </div>

        <div style={styles.field}>
          <label>Parent Types (comma-separated):</label>
          <input value={parentTypes} onChange={e => setParentTypes(e.target.value)} style={styles.input} />
          <small style={styles.helpText}>e.g., individual, class, Person, Organization</small>
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <div style={styles.actions}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSubmit}>{method === 'PUT' ? 'Update' : 'Add'} Node Type</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    minWidth: '400px',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflow: 'auto'
  },
  field: {
    marginBottom: '15px'
  },
  input: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  },
  textarea: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    minHeight: '80px',
    resize: 'vertical'
  },
  helpText: {
    color: '#666',
    fontSize: '12px',
    marginTop: '4px',
    display: 'block'
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px'
  }
};
