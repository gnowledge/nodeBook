import React, { useEffect, useState } from 'react';
import AttributeTypeModal from './AttributeTypeModal';

export default function AttributeTypeList({ userId = "user0", graphId = "graph1" }) {
  const [attributeTypes, setAttributeTypes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

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

  useEffect(() => { loadTypes(); }, []);

  return (
    <div className="p-4">
      <button onClick={() => setModalOpen(true)} className="px-2 py-1 bg-purple-600 text-white rounded">+ Add Attribute Type</button>
      <ul className="mt-4">
        {attributeTypes.map((a) => (
          <li key={a.name} className="border p-2 rounded mb-2">
            <b>{a.name}</b> ({a.data_type})<br />
            <small>{a.description}</small><br />
            <i>Unit: {a.unit || '—'}<br />Domain: {(a.domain || []).join(', ')}</i>
          </li>
        ))}
      </ul>

      <AttributeTypeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadTypes}
        userId={userId}
        graphId={graphId}
        showDomainField={true}
        showUnitField={true}
        endpoint={`/api/users/${userId}/graphs/${graphId}/attribute-types`}
      />
    </div>
  );
}
