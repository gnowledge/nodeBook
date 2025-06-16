// This patch adds full editing support to AttributeTypeList.jsx
// It enables:
// - Viewing attribute types as cards
// - Editing existing types via the modal (using PUT)
// - Deleting existing types (using DELETE - optional backend support needed)

import React, { useEffect, useState } from 'react';
import { useUserId } from "./UserIdContext";
import AttributeTypeModal from './AttributeTypeModal';

export default function AttributeTypeList({ graphId = "graph1" }) {
  const userId = useUserId();
  const [attributeTypes, setAttributeTypes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const loadTypes = async () => {
    try {
      const res = await fetch(`/api/users/${userId}/graphs/${graphId}/attribute-types`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.attributeTypes || data.attribute_types || []);
      setAttributeTypes(list);
    } catch (err) {
      console.error("Failed to load attribute types:", err);
      setAttributeTypes([]);
    }
  };

  const handleEdit = (attr) => {
    setEditTarget(attr);
    setModalOpen(true);
  };

  const handleDelete = async (name) => {
    // This assumes DELETE route is implemented
    if (!window.confirm(`Delete attribute type '${name}'?`)) return;
    await fetch(`/api/users/${userId}/graphs/${graphId}/attribute-types/${name}`, { method: 'DELETE' });
    loadTypes();
  };

  useEffect(() => { loadTypes(); }, []);

  return (
    <div className="p-4">
      <button onClick={() => { setEditTarget(null); setModalOpen(true); }} className="px-2 py-1 bg-purple-600 text-white rounded">+ Add Attribute Type</button>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {attributeTypes.map((a) => (
          <div key={a.name} className="border p-4 rounded shadow bg-white">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-lg font-semibold">{a.name} <span className="text-sm text-gray-600">({a.data_type})</span></h4>
                <p className="text-sm text-gray-700">{a.description}</p>
                <p className="text-xs text-gray-500">Unit: {a.unit || '—'} | Domain: {(a.domain || []).join(', ')}</p>
              </div>
              <div className="space-y-1 text-right">
                <button className="text-blue-600 hover:underline text-sm" onClick={() => handleEdit(a)}>Edit</button><br />
                <button className="text-red-600 hover:underline text-sm" onClick={() => handleDelete(a.name)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AttributeTypeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadTypes}
        userId={userId}
        graphId={graphId}
        endpoint={editTarget ? `/api/users/${userId}/graphs/${graphId}/attribute-types/${editTarget.name}` : `/api/users/${userId}/graphs/${graphId}/attribute-types`}
        method={editTarget ? 'PUT' : 'POST'}
        initialData={editTarget}
      />
    </div>
  );
}
