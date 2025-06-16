// Updated RelationTypeList.jsx to show cards with Edit and Delete actions
import React, { useEffect, useState } from 'react';
import RelationTypeModal from './RelationTypeModal';

export default function RelationTypeList({ userId, graphId = "graph1" }) {
  const [relationTypes, setRelationTypes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const loadTypes = async () => {
    const res = await fetch(`/api/users/${userId}/graphs/${graphId}/relation-types`);
    const data = await res.json();
    setRelationTypes(data);
  };

  const handleEdit = (rt) => {
    setEditTarget(rt);
    setModalOpen(true);
  };

  const handleDelete = async (name) => {
    if (!window.confirm(`Delete relation type '${name}'?`)) return;
    await fetch(`/api/users/${userId}/graphs/${graphId}/relation-types/${name}`, { method: 'DELETE' });
    loadTypes();
  };

  useEffect(() => { loadTypes(); }, []);

  return (
    <div className="p-4">
      <button onClick={() => { setEditTarget(null); setModalOpen(true); }} className="px-2 py-1 bg-blue-600 text-white rounded">+ Add Relation Type</button>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {relationTypes.map((r) => (
          <div key={r.name} className="border p-4 rounded shadow bg-white">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-lg font-semibold">{r.name} <span className="text-sm text-gray-600">(inverse: {r.inverse_name})</span></h4>
                <p className="text-sm text-gray-700">{r.description}</p>
                <p className="text-xs text-gray-500">Domain: {(r.domain || []).join(', ')} | Range: {(r.range || []).join(', ')}</p>
                <p className="text-xs text-gray-500">Symmetric: {r.symmetric ? 'Yes' : 'No'} | Transitive: {r.transitive ? 'Yes' : 'No'}</p>
              </div>
              <div className="space-y-1 text-right">
                <button className="text-blue-600 hover:underline text-sm" onClick={() => handleEdit(r)}>Edit</button><br />
                <button className="text-red-600 hover:underline text-sm" onClick={() => handleDelete(r.name)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <RelationTypeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadTypes}
        userId={userId}
        graphId={graphId}
        endpoint={editTarget ? `/api/users/${userId}/graphs/${graphId}/relation-types/${editTarget.name}` : `/api/users/${userId}/graphs/${graphId}/relation-types/create`}
        method={editTarget ? 'PUT' : 'POST'}
        initialData={editTarget}
      />
    </div>
  );
}
