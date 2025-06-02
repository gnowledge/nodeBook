// Updated AttributeTypeModal.jsx to support both POST (create) and PUT (edit) modes
import React, { useState, useEffect } from 'react';

export default function AttributeTypeModal({
  isOpen,
  onClose,
  onSuccess,
  userId = "user0",
  graphId = "graph1",
  endpoint,
  method = 'POST',
  initialData = null
}) {
  const [name, setName] = useState('');
  const [dataType, setDataType] = useState('');
  const [unit, setUnit] = useState('');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const [allowedValues, setAllowedValues] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDataType(initialData.data_type || '');
      setUnit(initialData.unit || '');
      setDomain((initialData.domain || []).join(', '));
      setDescription(initialData.description || '');
      setAllowedValues((initialData.allowed_values || []).join(', '));
    } else {
      setName('');
      setDataType('');
      setUnit('');
      setDomain('');
      setDescription('');
      setAllowedValues('');
    }
  }, [initialData, isOpen]);

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
      allowed_values: allowedValues ? allowedValues.split(',').map(v => v.trim()).filter(Boolean) : null,
      description: description.trim()
    };

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        const data = isJson ? await res.json() : { detail: await res.text() };
        throw new Error(data.detail || `Failed to ${method === 'PUT' ? 'update' : 'create'} attribute type`);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
      <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
        <h3 className="text-lg font-bold mb-4">{method === 'PUT' ? 'Edit' : 'Create'} Attribute Type</h3>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Name:</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded" disabled={method === 'PUT'} />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Data Type:</label>
          <select
            value={dataType}
            onChange={e => setDataType(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">-- Select Data Type --</option>
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
            <option value="float">float</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Unit (optional):</label>
          <input value={unit} onChange={e => setUnit(e.target.value)} className="w-full p-2 border rounded" />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Domain (comma-separated):</label>
          <input value={domain} onChange={e => setDomain(e.target.value)} className="w-full p-2 border rounded" />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Allowed Values (comma-separated, optional):</label>
          <input value={allowedValues} onChange={e => setAllowedValues(e.target.value)} className="w-full p-2 border rounded" />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Description:</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded h-20" />
        </div>

        {error && <p className="text-red-600 mb-2">{error}</p>}

        <div className="flex justify-between mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">{method === 'PUT' ? 'Update' : 'Add'} Attribute Type</button>
        </div>
      </div>
    </div>
  );
}
