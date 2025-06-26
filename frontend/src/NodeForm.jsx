import React, { useState, useEffect } from 'react';
import { API_BASE } from './config';
import { useUserInfo } from "./UserIdContext";

function PreviewBox({ label, value }) {
  return (
    <div className="bg-gray-50 rounded p-2 mt-2 text-sm">
      <div><span className="font-semibold">Preview:</span> <span className="text-blue-700">{value || <span className="text-gray-400">({label})</span>}</span></div>
    </div>
  );
}

/**
 * NodeForm - CNL-style node creation form (no description).
 * Props:
 *   onSuccess: function to call after successful save
 *   initialData: (optional) node object for editing
 *   difficulty: (optional) controls which fields are enabled (default: 'easy')
 *   onClose: (optional) for modal usage
 */
export default function NodeForm({ onSuccess, initialData, difficulty = 'easy', onClose, graphId, nodeId, onAddNodeType, morphId }) {
  const { userId } = useUserInfo();
  // CNL-style fields
  const [base, setBase] = useState('');
  const [qualifier, setQualifier] = useState('');
  const [quantifier, setQuantifier] = useState('');
  const [role, setRole] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (initialData) {
      setBase(initialData.name || initialData.label || '');
      setQualifier(initialData.qualifier || '');
      setQuantifier(initialData.quantifier || '');
      setRole(initialData.role || '');
      setEditing(true);
    } else {
      setBase('');
      setQualifier('');
      setQuantifier('');
      setRole('');
      setEditing(false);
    }
  }, [initialData]);

  // Difficulty logic
  const isQualifierEnabled = ["medium", "advanced", "expert"].includes(difficulty);
  const isQuantifierEnabled = ["advanced", "expert"].includes(difficulty);

  // Node preview logic (matches CNL Helper)
  let nodePreview = base.trim();
  if (isQualifierEnabled && qualifier.trim()) nodePreview = `**${qualifier.trim()}** ${base.trim()}`;
  if (isQuantifierEnabled && quantifier.trim()) nodePreview = `*${quantifier.trim()}* ${nodePreview}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      base_name: base,  // Required for ID generation
      adjective: qualifier || null,  // Optional qualifier
      quantifier: quantifier || null,  // Optional quantifier
      role: role || "individual",  // Default role
      morphs: []  // Empty morphs array
    };
    try {
      const token = localStorage.getItem("token");
      let res;
      if (editing && nodeId) {
        res = await fetch(`${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${nodeId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert('Failed to save node: ' + (err.detail || res.statusText));
        return;
      }
      setBase('');
      setQualifier('');
      setQuantifier('');
      setRole('');
      onSuccess && onSuccess();
      onClose && onClose();
    } catch (err) {
      alert('Failed to save node: ' + err.message);
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold text-gray-800">{editing ? 'Edit Node' : 'Add Node'}</h3>
      <div className="grid grid-cols-3 gap-3 items-end mb-2">
        <div className="flex flex-col">
          <label className="font-semibold text-xs mb-1 text-center">Quantifier</label>
          <input className="border rounded px-2 py-1 text-center" value={quantifier} onChange={e => setQuantifier(e.target.value)} disabled={!isQuantifierEnabled} placeholder="e.g. all" />
        </div>
        <div className="flex flex-col">
          <label className="font-semibold text-xs mb-1 text-center">Qualifier</label>
          <input className="border rounded px-2 py-1 text-center" value={qualifier} onChange={e => setQualifier(e.target.value)} disabled={!isQualifierEnabled} placeholder="e.g. female" />
        </div>
        <div className="flex flex-col">
          <label className="font-semibold text-xs mb-1 text-center">Base Name<span className="text-red-500">*</span></label>
          <input className="border rounded px-2 py-1 text-center" value={base} onChange={e => setBase(e.target.value)} placeholder="e.g. mathematician" autoFocus required />
        </div>
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
      <PreviewBox label="node name" value={nodePreview} />
      <div className="flex justify-end gap-2 mt-4">
        {onClose && <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Cancel</button>}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={!base.trim()}
        >
          {editing ? 'Update' : 'Add'}
        </button>
      </div>
      <div className="text-xs text-gray-500 mt-2">
        <div><b>Examples:</b></div>
        <div>Easy: <span className="italic">mathematician</span></div>
        <div>Medium: <span className="italic">**female** mathematician</span></div>
        <div>Advanced: <span className="italic">*all* mathematicians</span></div>
        <div>Expert: <span className="italic">*some* **ancient** philosophers</span></div>
      </div>
    </form>
  );
}
