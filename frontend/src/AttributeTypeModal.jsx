import React, { useState } from 'react';

export default function AttributeTypeModal({ isOpen, onClose, onSuccess, userId = "user0", graphId = "graph1", endpoint }) {
  const [name, setName] = useState('');
  const [dataType, setDataType] = useState('');
  const [unit, setUnit] = useState('');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!name.trim() || !dataType.trim()) {
      setError("Name and data type are required.");
      return;
    }

    const payload = {
      name: name.trim(),
      data_type: dataType.trim(),
      unit: unit.trim() || null,
      domain: domain ? domain.split(',').map(d => d.trim()).filter(Boolean) : [],
      description: description.trim()
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        const data = isJson ? await res.json() : { detail: await res.text() };
        throw new Error(data.detail || "Failed to create attribute type");
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
        <h3>Create Attribute Type</h3>

        <div style={styles.field}>
          <label>Name:</label>
          <input value={name} onChange={e => setName(e.target.value)} style={styles.input} />
        </div>

        <div style={styles.field}>
          <label>Data Type:</label>
          <select
            value={dataType}
            onChange={e => setDataType(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">-- Select Data Type --</option>
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
            <option value="float">float</option>
          </select>
        </div>

        <div style={styles.field}>
          <label>Unit (optional):</label>
          <input value={unit} onChange={e => setUnit(e.target.value)} style={styles.input} />
        </div>

        <div style={styles.field}>
          <label>Domain (comma-separated):</label>
          <input value={domain} onChange={e => setDomain(e.target.value)} style={styles.input} />
        </div>

        <div style={styles.field}>
          <label>Description:</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} style={styles.textarea} />
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <div style={styles.actions}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSubmit}>Add Attribute Type</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0,
    width: '100vw', height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.3)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    width: '400px',
    boxShadow: '0 0 10px rgba(0,0,0,0.25)'
  },
  field: {
    marginBottom: '1rem'
  },
  input: {
    width: '100%',
    padding: '0.5rem'
  },
  textarea: {
    width: '100%',
    height: '4rem',
    padding: '0.5rem'
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between'
  }
};


