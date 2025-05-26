import React, { useState } from 'react';
import { API_BASE } from './config';
import RelationTypeModal from './RelationTypeModal';

export default function RelationForm({ nodes, relationTypes, userId = "user0", graphId = "graph1", onAddRelationType }) {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [relationName, setRelationName] = useState('');
  const [showRelationModal, setShowRelationModal] = useState(false);

  // For async search
  const [sourceQuery, setSourceQuery] = useState('');
  const [targetQuery, setTargetQuery] = useState('');
  const [sourceOptions, setSourceOptions] = useState([]);
  const [targetOptions, setTargetOptions] = useState([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [targetLoading, setTargetLoading] = useState(false);

  // Fetch matching nodes for autocomplete
  const fetchNodeOptions = async (query, setOptions, setLoading) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}/graphs/${graphId}/nodes?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setOptions(data);
    } catch {
      setOptions([]);
    }
    setLoading(false);
  };

  const handleRelationSubmit = async () => {
    let srcId = source;
    let tgtId = target;

    // If not selected from options, create node (with correct payload)
    if (!nodes.find(n => n.id === source) && sourceQuery) {
      const res = await fetch(`${API_BASE}/api/users/${userId}/graphs/${graphId}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sourceQuery,
          attributes: [],
          relations: []
        })
      });
      const data = await res.json();
      srcId = data.id;
    }
    if (!nodes.find(n => n.id === target) && targetQuery) {
      const res = await fetch(`${API_BASE}/api/users/${userId}/graphs/${graphId}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: targetQuery,
          attributes: [],
          relations: []
        })
      });
      const data = await res.json();
      tgtId = data.id;
    }

    await fetch(`${API_BASE}/api/users/${userId}/graphs/${graphId}/relation/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: srcId, name: relationName, target: tgtId })
    });
    alert("Relation created.");
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Create Relation</h3>

      <div>
        <label className="block text-sm font-medium mb-1">Source Node:</label>
        <input
          type="text"
          placeholder="Type to search or create"
          value={sourceQuery}
          onChange={async e => {
            setSourceQuery(e.target.value);
            setSource('');
            if (e.target.value) {
              await fetchNodeOptions(e.target.value, setSourceOptions, setSourceLoading);
            } else {
              setSourceOptions([]);
            }
          }}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-1"
        />
        {sourceLoading && <div className="text-xs text-gray-400">Searching...</div>}
        {sourceOptions.length > 0 && (
          <ul className="border border-gray-200 rounded bg-white max-h-32 overflow-y-auto text-sm">
            {sourceOptions.map(opt => (
              <li
                key={opt.id}
                className={`px-3 py-1 cursor-pointer hover:bg-blue-100 ${source === opt.id ? 'bg-blue-50' : ''}`}
                onClick={() => {
                  setSource(opt.id);
                  setSourceQuery(opt.name || opt.label || opt.id);
                  setSourceOptions([]);
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
          Relation Type:
          <button
            className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded"
            onClick={() => setShowRelationModal(true)}
          >
            + Add
          </button>
        </label>
        <select
          value={relationName}
          onChange={e => setRelationName(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="">-- Select --</option>
          {relationTypes.map(rt => <option key={rt.name} value={rt.name}>{rt.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Target Node:</label>
        <input
          type="text"
          placeholder="Type to search or create"
          value={targetQuery}
          onChange={async e => {
            setTargetQuery(e.target.value);
            setTarget('');
            if (e.target.value) {
              await fetchNodeOptions(e.target.value, setTargetOptions, setTargetLoading);
            } else {
              setTargetOptions([]);
            }
          }}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-1"
        />
        {targetLoading && <div className="text-xs text-gray-400">Searching...</div>}
        {targetOptions.length > 0 && (
          <ul className="border border-gray-200 rounded bg-white max-h-32 overflow-y-auto text-sm">
            {targetOptions.map(opt => (
              <li
                key={opt.id}
                className={`px-3 py-1 cursor-pointer hover:bg-blue-100 ${target === opt.id ? 'bg-blue-50' : ''}`}
                onClick={() => {
                  setTarget(opt.id);
                  setTargetQuery(opt.name || opt.label || opt.id);
                  setTargetOptions([]);
                }}
              >
                {opt.name || opt.label || opt.id}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={handleRelationSubmit}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Submit
      </button>

      {showRelationModal && (
        <RelationTypeModal
          isOpen={showRelationModal}
          onClose={() => setShowRelationModal(false)}
          onSuccess={() => {
            setShowRelationModal(false);
            // Optional: trigger reload of relationTypes list
          }}
        />
      )}
    </div>
  );
}


