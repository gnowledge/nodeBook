import React, { useState, useEffect } from 'react';
import { API_BASE } from './config';

export default function NodeUpdateForm({ nodeId, userId = "user0", graphId = "graph1", onSuccess, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [role, setRole] = useState('');
  const [qualifier, setQualifier] = useState('');
  const [attributes, setAttributes] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch node details from backend (getInfo API)
    async function fetchNode() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/users/${userId}/graphs/${graphId}/getInfo/${nodeId}`);
        const data = await res.json();
        setName(data.name || data.label || '');
        setDescription(data.description || '');
        setRole(data.role || '');
        setQualifier(data.qualifier || '');
        setAttributes(data.attributes || []);
        setRelations(data.relations || []);
      } catch {
        // fallback to empty
      }
      setLoading(false);
    }
    if (nodeId) fetchNode();
  }, [nodeId, userId, graphId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Always submit the latest form values + the fetched attributes/relations
    const payload = {
      name: name || "",
      qualifier: qualifier || null,
      role: role || null,
      description: description || null,
      attributes: Array.isArray(attributes) ? attributes : [],
      relations: Array.isArray(relations) ? relations : []
    };
    // Remove null fields (optional, but helps with strict backends)
    Object.keys(payload).forEach(
      key => (payload[key] === null) && delete payload[key]
    );
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}/graphs/${graphId}/nodes/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert("Failed to update node: " + (err.detail || res.statusText));
        return;
      }
      alert('Node updated.');
      onSuccess && onSuccess();
    } catch (err) {
      alert("Failed to update node: " + err.message);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold text-gray-800">Edit Node</h3>
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
      {/* Attributes and relations are preserved and submitted, but not shown/edited here */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Update
        </button>
      </div>
    </form>
  );
}
