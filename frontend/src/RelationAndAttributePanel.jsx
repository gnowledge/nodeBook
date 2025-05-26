import React, { useState, useEffect } from 'react';
import { API_BASE } from './config';
import {
  fetchNodes,
  fetchRelationTypes,
  fetchAttributeTypes
} from './services/api';
import StyledCard from './StyledCard';
import RelationForm from './RelationForm';
import AttributeForm from './AttributeForm';
import NodeForm from './NodeForm';

// --- Remove NodeForm definition from this file ---

export default function RelationAndAttributePanel({ userId = "user0", graphId = "graph1" }) {
  const [tab, setTab] = useState("relation");
  const [nodes, setNodes] = useState([]);
  const [relationTypes, setRelationTypes] = useState([]);
  const [attributeTypes, setAttributeTypes] = useState([]);

  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [relationName, setRelationName] = useState('');

  const [selectedNode, setSelectedNode] = useState('');
  const [attributeName, setAttributeName] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [quantifier, setQuantifier] = useState('');
  const [modality, setModality] = useState('');

  const [showRelationModal, setShowRelationModal] = useState(false);
  const [showAttributeModal, setShowAttributeModal] = useState(false);

  useEffect(() => {
    fetchNodes(userId, graphId).then(setNodes).catch(console.error);
    fetchRelationTypes(userId, graphId).then(setRelationTypes).catch(console.error);
    fetchAttributeTypes(userId, graphId).then(setAttributeTypes).catch(console.error);
  }, [userId, graphId]);

  const handleRelationSubmit = async () => {
    await fetch(`${API_BASE}/api/users/${userId}/graphs/${graphId}/relation/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node_id: source,
        name: relationName,
        target
      })
    });
    alert("Relation created.");
  };

  const handleAttributeSubmit = async () => {
    await fetch(`${API_BASE}/api/users/${userId}/graphs/${graphId}/attribute/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node_id: selectedNode,
        name: attributeName,
        value,
        unit,
        quantifier,
        modality
      })
    });
    alert("Attribute assigned.");
  };

  return (
    <div className="pt-10">
      <div className="flex border-b border-gray-300 mb-4">
        <button
          className={`px-5 py-2 -mb-px rounded-t-lg border border-b-0 transition-all duration-150
            ${tab === 'relation'
              ? 'bg-blue-200 text-blue-800 shadow font-bold z-10 border-gray-300'
              : 'bg-gray-100 text-gray-500 hover:text-blue-700 border-transparent'
            }`}
          onClick={() => setTab('relation')}
          style={{ minWidth: 120 }}
          aria-selected={tab === 'relation'}
        >
          Add Relation
        </button>
        <button
          className={`px-5 py-2 -mb-px rounded-t-lg border border-b-0 transition-all duration-150
            ${tab === 'attribute'
              ? 'bg-blue-200 text-blue-800 shadow font-bold z-10 border-gray-300'
              : 'bg-gray-100 text-gray-500 hover:text-blue-700 border-transparent'
            }`}
          onClick={() => setTab('attribute')}
          style={{ minWidth: 120 }}
          aria-selected={tab === 'attribute'}
        >
          Assign Attribute
        </button>
        <button
          className={`px-5 py-2 -mb-px rounded-t-lg border border-b-0 transition-all duration-150
            ${tab === 'node'
              ? 'bg-blue-200 text-blue-800 shadow font-bold z-10 border-gray-300'
              : 'bg-gray-100 text-gray-500 hover:text-blue-700 border-transparent'
            }`}
          onClick={() => setTab('node')}
          style={{ minWidth: 120 }}
          aria-selected={tab === 'node'}
        >
          Add/Edit Node
        </button>
      </div>
      <div className="bg-blue-50 rounded-b-lg p-4">
        {tab === 'relation' && (
          <RelationForm
            nodes={nodes}
            relationTypes={relationTypes}
            userId={userId}
            graphId={graphId}
          />
        )}
        {tab === 'attribute' && (
          <AttributeForm
            nodes={nodes}
            attributeTypes={attributeTypes}
            userId={userId}
            graphId={graphId}
          />
        )}
        {tab === 'node' && (
          <NodeForm
            nodes={nodes}
            userId={userId}
            graphId={graphId}
            onSuccess={() => fetchNodes(userId, graphId).then(setNodes)}
          />
        )}

      </div>

      {showRelationModal && (
        <div style={modalStyle}>
          <h4>Create New Relation Type</h4>
          <button onClick={() => setShowRelationModal(false)}>Close</button>
        </div>
      )}

      {showAttributeModal && (
        <div style={modalStyle}>
          <h4>Create New Attribute Type</h4>
          <button onClick={() => setShowAttributeModal(false)}>Close</button>
        </div>
      )}
    </div>
  );
}

const modalStyle = {
  position: 'fixed', top: '20%', left: '30%', right: '30%', backgroundColor: 'white',
  border: '1px solid #ccc', padding: '1rem', zIndex: 1000, boxShadow: '0 0 10px rgba(0,0,0,0.25)'
};
