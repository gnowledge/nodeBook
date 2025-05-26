import React, { useState } from 'react';
import { API_BASE } from './config';
import AttributeTypeModal from './AttributeTypeModal';

export default function AttributeForm({ nodes, attributeTypes }) {
  const [selectedNode, setSelectedNode] = useState('');
  const [attributeName, setAttributeName] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [quantifier, setQuantifier] = useState('');
  const [modality, setModality] = useState('');
  const [showAttributeModal, setShowAttributeModal] = useState(false);

  // For async search
  const [nodeQuery, setNodeQuery] = useState('');
  const [nodeOptions, setNodeOptions] = useState([]);
  const [nodeLoading, setNodeLoading] = useState(false);

  // Fetch matching nodes for autocomplete
  const fetchNodeOptions = async (query) => {
    setNodeLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/nodes?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setNodeOptions(data);
    } catch {
      setNodeOptions([]);
    }
    setNodeLoading(false);
  };

  const handleAttributeSubmit = async () => {
    const selectedType = attributeTypes.find(at => at.name === attributeName)?.data_type;

    if (selectedType === "number" && isNaN(Number(value))) {
      alert("Please enter a valid number.");
      return;
    }
    if (selectedType === "boolean" && !["true", "false"].includes(value.toLowerCase())) {
      alert("Please enter 'true' or 'false'.");
      return;
    }

    let nodeId = selectedNode;
    // If not selected from options, create node
    if (!nodes.find(n => n.id === selectedNode) && nodeQuery) {
      const res = await fetch(`${API_BASE}/api/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: nodeQuery })
      });
      const data = await res.json();
      nodeId = data.id;
    }

    await fetch(`${API_BASE}/api/attribute/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: nodeId, name: attributeName, value, unit, quantifier, modality })
    });
    alert("Attribute assigned.");
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Assign Attribute</h3>

      <div>
        <label className="block text-sm font-medium mb-1">Node:</label>
        <input
          type="text"
          placeholder="Type to search or create"
          value={nodeQuery}
          onChange={async e => {
            setNodeQuery(e.target.value);
            setSelectedNode('');
            if (e.target.value) {
              await fetchNodeOptions(e.target.value);
            } else {
              setNodeOptions([]);
            }
          }}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-1"
        />
        {nodeLoading && <div className="text-xs text-gray-400">Searching...</div>}
        {nodeOptions.length > 0 && (
          <ul className="border border-gray-200 rounded bg-white max-h-32 overflow-y-auto text-sm">
            {nodeOptions.map(opt => (
              <li
                key={opt.id}
                className={`px-3 py-1 cursor-pointer hover:bg-blue-100 ${selectedNode === opt.id ? 'bg-blue-50' : ''}`}
                onClick={() => {
                  setSelectedNode(opt.id);
                  setNodeQuery(opt.name || opt.label || opt.id);
                  setNodeOptions([]);
                }}
              >
                {opt.name || opt.label || opt.id}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Attribute Type:
          <button
            className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded"
            onClick={() => setShowAttributeModal(true)}
          >
            + Add
          </button>
        </label>
        <select
          value={attributeName}
          onChange={e => setAttributeName(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="">-- Select --</option>
          {attributeTypes.map(at => <option key={at.name} value={at.name}>{at.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Value:</label>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Unit:</label>
        <input
          value={unit}
          onChange={e => setUnit(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Quantifier:</label>
        <input
          value={quantifier}
          onChange={e => setQuantifier(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Modality:</label>
        <input
          value={modality}
          onChange={e => setModality(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <button
        onClick={handleAttributeSubmit}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Submit
      </button>

      {showAttributeModal && (
        <AttributeTypeModal
          isOpen={showAttributeModal}
          onClose={() => setShowAttributeModal(false)}
          onSuccess={() => {
            setShowAttributeModal(false);
          }}
        />
      )}
    </div>
  );
}
