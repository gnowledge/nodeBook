import React, { useState, useEffect } from 'react';
import { API_BASE } from './config';

export default function NodeForm({ onSuccess, nodes, initialData }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [role, setRole] = useState('');
  const [qualifier, setQualifier] = useState('');
  const [editing, setEditing] = useState(false);
  const [nodeId, setNodeId] = useState(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || initialData.label || '');
      setDescription(initialData.description || '');
      setRole(initialData.role || '');
      setQualifier(initialData.qualifier || '');
      setNodeId(initialData.id || null);
      setEditing(true);
    } else {
      setName('');
      setDescription('');
      setRole('');
      setQualifier('');
      setNodeId(null);
      setEditing(false);
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name,
      qualifier: qualifier || undefined,
      role: role || undefined,
      description: description || undefined,
      attributes: [],
      relations: []
    };
    console.log("NodeForm payload:", payload);

    try {
      let res;
      if (editing && nodeId) {
        // Edit mode: use PUT only
        res = await fetch(`${API_BASE}/api/nodes/${nodeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Add mode: use POST
        res = await fetch(`${API_BASE}/api/nodes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert("Failed to save node: " + (err.detail || res.statusText));
        return;
      }
      alert(editing ? 'Node updated.' : 'Node created.');
      setName('');
      setDescription('');
      setRole('');
      setQualifier('');
      setNodeId(null);
      onSuccess && onSuccess();
    } catch (err) {
      alert("Failed to save node: " + err.message);
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold text-gray-800">{editing ? 'Edit Node' : 'Add Node'}</h3>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Qualifier:</label>
          <input
            value={qualifier}
            onChange={e => setQualifier(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Name:</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description:</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Role:</label>
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="">-- Select --</option>
          <option value="class">Class</option>
          <option value="individual">Individual</option>
          <option value="process">Process</option>
        </select>
      </div>
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {editing ? 'Update' : 'Add'}
      </button>
    </form>
  );
}
