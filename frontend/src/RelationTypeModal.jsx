import React, { useState } from 'react';

export default function RelationTypeModal({ isOpen, onClose, onSuccess, userId = "user0", graphId = "graph1" }) {
  const [name, setName] = useState('');
  const [inverseName, setInverseName] = useState('');
  const [symmetric, setSymmetric] = useState(false);
  const [transitive, setTransitive] = useState(false);
  const [domain, setDomain] = useState('');
  const [range, setRange] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    const domainList = domain ? domain.split(',').map(d => d.trim()).filter(Boolean) : [];
    const rangeList = range ? range.split(',').map(r => r.trim()).filter(Boolean) : [];

    const payload = {
      name: name.trim(),
      inverse_name: inverseName.trim() || name.trim(),
      symmetric,
      transitive,
      domain: domainList,
      range: rangeList,
      description: description.trim()
    };

    try {
      const res = await fetch(
        `/api/users/${userId}/graphs/${graphId}/relation-types/create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        const data = isJson ? await res.json() : { detail: await res.text() };
        throw new Error(data.detail || "Failed to create relation type");
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
        <h3>Create Relation Type</h3>

        <div style={styles.field}>
          <label>Name:</label>
          <input value={name} onChange={e => setName(e.target.value)} style={styles.input} />
        </div>

        <div style={styles.field}>
          <label>Inverse Name:</label>
          <input value={inverseName} onChange={e => setInverseName(e.target.value)} style={styles.input} />
        </div>

        <div style={styles.field}>
          <label>Domain (comma-separated):</label>
          <input value={domain} onChange={e => setDomain(e.target.value)} style={styles.input} />
        </div>

        <div style={styles.field}>
          <label>Range (comma-separated):</label>
          <input value={range} onChange={e => setRange(e.target.value)} style={styles.input} />
        </div>

        <div style={styles.field}>
          <label>
            <input type="checkbox" checked={symmetric} onChange={e => setSymmetric(e.target.checked)} />
            Symmetric
          </label>
        </div>

        <div style={styles.field}>
          <label>
            <input type="checkbox" checked={transitive} onChange={e => setTransitive(e.target.checked)} />
            Transitive
          </label>
        </div>

        <div style={styles.field}>
          <label>Description:</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} style={styles.textarea} />
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <div style={styles.actions}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSubmit}>Add Relation Type</button>
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
