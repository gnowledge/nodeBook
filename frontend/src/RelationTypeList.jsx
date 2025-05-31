import React, { useEffect, useState } from 'react';
import RelationTypeModal from './RelationTypeModal';

export default function RelationTypeList({ userId = "user0", graphId = "graph1" }) {
  const [relationTypes, setRelationTypes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  const loadTypes = async () => {
    const res = await fetch(`/api/users/${userId}/graphs/${graphId}/relation-types`);
    const data = await res.json();
    setRelationTypes(data);
  };

  useEffect(() => { loadTypes(); }, []);

  return (
    <div className="p-4">
      <button onClick={() => setModalOpen(true)} className="px-2 py-1 bg-blue-600 text-white rounded">+ Add Relation Type</button>
      <ul className="mt-4">
        {relationTypes.map((r) => (
          <li key={r.name} className="border p-2 rounded mb-2">
            <b>{r.name}</b> (inverse: <i>{r.inverse_name}</i>)<br />
            <small>{r.description}</small>
          </li>
        ))}
      </ul>

      <RelationTypeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadTypes}
        userId={userId}
        graphId={graphId}
      />
    </div>
  );
}
