import React, { useState, useEffect } from 'react';
import { API_BASE } from './config';
import AttributeTypeModal from './AttributeTypeModal';
import { useUserId } from "./UserIdContext";

function PreviewBox({ label, value }) {
  return (
    <div className="bg-gray-50 rounded p-2 mt-2 text-sm">
      <div><span className="font-semibold">Preview:</span> <span className="text-blue-700">{value || <span className="text-gray-400">({label})</span>}</span></div>
    </div>
  );
}

export default function AttributeForm({ nodeId, graphId = "graph1", onAddAttributeType, initialData = {}, onSuccess, morphId }) {
  const userId = useUserId();
  // CNL-style fields
  const [attribute, setAttribute] = useState(initialData.name || '');
  const [attrValue, setAttrValue] = useState(initialData.value || '');
  const [attrAdverb, setAttrAdverb] = useState(initialData.adverb || '');
  const [attrUnit, setAttrUnit] = useState(initialData.unit || '');
  const [attrModality, setAttrModality] = useState(initialData.modality || '');
  const [showAttributeModal, setShowAttributeModal] = useState(false);

  // Always use composed id for registry consistency
  const composedId = `${nodeId}::${attribute}`;

  // Attribute name suggestions from backend
  const [attributeTypes, setAttributeTypes] = useState([]);
  const [attributeTypesLoading, setAttributeTypesLoading] = useState(false);

  const fetchAttributeTypes = async () => {
    setAttributeTypesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/attribute-types`);
      const data = await res.json();
      setAttributeTypes((data || []).map(a => typeof a === 'string' ? { name: a } : a));
    } catch {
      setAttributeTypes([]);
    }
    setAttributeTypesLoading(false);
  };

  useEffect(() => {
    fetchAttributeTypes();
  }, [userId, graphId]);

  // CNL-style preview logic
  let attrPreview = `has ${attribute.trim()}: `;
  if (attrAdverb.trim()) attrPreview += `++${attrAdverb.trim()}++ `;
  attrPreview += attrValue.trim();
  if (attrUnit.trim()) attrPreview += ` *${attrUnit.trim()}*`;
  if (attrModality.trim()) attrPreview += ` [${attrModality.trim()}]`;

  const handleAttributeSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      id: composedId,
      source_id: nodeId,
      name: attribute,
      value: attrValue,
      unit: attrUnit || undefined,
      adverb: attrAdverb || undefined,
      modality: attrModality || undefined,
      ...(morphId ? { morph_id: morphId } : {})
    };
    const response = await fetch(`${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/attribute/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const responseData = await response.json();
      alert("Attribute assigned.");
      setAttribute('');
      setAttrValue('');
      setAttrAdverb('');
      setAttrUnit('');
      setAttrModality('');
      
      // Call onSuccess callback with the created attribute data
      if (typeof onSuccess === 'function') {
        // If backend returns full attribute object, use it; otherwise use our payload
        const attributeData = responseData.id || responseData.attribute_id ? 
          { ...payload, id: responseData.id || responseData.attribute_id } : payload;
        onSuccess(attributeData);
      }
    } else {
      alert("Error creating attribute. Please try again.");
    }
  };

  const handleAttributeTypeCreated = () => {
    setShowAttributeModal(false);
    // Reload attribute types to include the newly created one
    fetchAttributeTypes();
  };

  return (
    <form className="space-y-4" onSubmit={handleAttributeSubmit}>
      <h3 className="text-lg font-semibold text-gray-800">Assign Attribute</h3>
      <div>
        <label className="block text-sm font-medium mb-1">Target Node:</label>
        <div className="px-3 py-2 border rounded bg-gray-50 text-gray-700">{nodeId}</div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          Attribute Name:
          <button
            className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded"
            type="button"
            onClick={() => setShowAttributeModal(true)}
          >
            + Add
          </button>
        </label>
        <input
          type="text"
          placeholder="Type to search or create"
          value={attribute}
          onChange={e => setAttribute(e.target.value)}
          list="attribute-type-list"
          className="w-full border border-gray-300 rounded px-3 py-2 mb-1"
          autoFocus
        />
        <datalist id="attribute-type-list">
          {attributeTypes.map((a) => (
            <option key={a.name} value={a.name} />
          ))}
        </datalist>
        {attributeTypesLoading && <div className="text-xs text-gray-400">Loading attribute types...</div>}
      </div>
      <div className="grid grid-cols-3 gap-3 items-end mb-2">
        <div className="flex flex-col">
          <label className="font-semibold text-xs mb-1 text-center">Adverb</label>
          <input className="border rounded px-2 py-1 text-center" value={attrAdverb} onChange={e => setAttrAdverb(e.target.value)} placeholder="e.g. rapidly" />
        </div>
        <div className="flex flex-col">
          <label className="font-semibold text-xs mb-1 text-center">Value<span className="text-red-500">*</span></label>
          <input className="border rounded px-2 py-1 text-center" value={attrValue} onChange={e => setAttrValue(e.target.value)} placeholder="e.g. 50" required />
        </div>
        <div className="flex flex-col">
          <label className="font-semibold text-xs mb-1 text-center">Unit</label>
          <input className="border rounded px-2 py-1 text-center" value={attrUnit} onChange={e => setAttrUnit(e.target.value)} placeholder="e.g. microns" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 items-end mb-2">
        <div className="flex flex-col">
          <label className="font-semibold text-xs mb-1 text-center">Modality</label>
          <input className="border rounded px-2 py-1 text-center" value={attrModality} onChange={e => setAttrModality(e.target.value)} placeholder="e.g. uncertain" />
        </div>
      </div>
      <PreviewBox label="attribute" value={attrPreview} />
      <div className="flex justify-end gap-2 mt-4">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={!attribute.trim() || !attrValue.trim()}
        >
          Submit
        </button>
      </div>
      <div className="text-xs text-gray-500 mt-2">
        <div><b>Examples:</b></div>
        <div>Easy: <span className="italic">has size: 50 *microns*</span></div>
        <div>Expert: <span className="italic">has growth_rate: ++rapidly++ 5 *cm/year* [uncertain]</span></div>
      </div>
      {showAttributeModal && (
        <AttributeTypeModal
          isOpen={showAttributeModal}
          onClose={() => setShowAttributeModal(false)}
          onSuccess={handleAttributeTypeCreated}
          userId={userId}
          graphId={graphId}
          endpoint={`${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/attribute-types/create`}
          method="POST"
        />
      )}
    </form>
  );
}
