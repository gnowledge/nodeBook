import React, { useState, useEffect } from 'react';
import { API_BASE } from './config';
import RelationTypeModal from './RelationTypeModal';
import MessageArea from './MessageArea';
import { useUserInfo } from "./UserIdContext";
import { useDifficulty } from "./DifficultyContext";

function PreviewBox({ label, value }) {
  return (
    <div className="bg-gray-50 rounded p-2 mt-2 text-sm">
      <div><span className="font-semibold">Preview:</span> <span className="text-blue-700">{value || <span className="text-gray-400">({label})</span>}</span></div>
    </div>
  );
}

export default function RelationForm({ relationId, graphId = "graph1", onAddRelationType, initialData = null, editMode = false, onSuccess, morphId }) {
  const { userId } = useUserInfo();
  const { restrictions } = useDifficulty();
  // CNL-style fields
  const [relation, setRelation] = useState(initialData?.name || initialData?.type || '');
  const [relTarget, setRelTarget] = useState(initialData?.target || '');
  const [relTargetQualifier, setRelTargetQualifier] = useState('');
  const [relTargetQuantifier, setRelTargetQuantifier] = useState('');
  const [relAdverb, setRelAdverb] = useState('');
  const [relModality, setRelModality] = useState('');
  const [showRelationModal, setShowRelationModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  // Relation type suggestions
  const [relationTypes, setRelationTypes] = useState([]);
  const [relationTypesLoading, setRelationTypesLoading] = useState(false);
  // Node registry for target suggestions
  const [nodeRegistry, setNodeRegistry] = useState({});
  const [targetQuery, setTargetQuery] = useState('');
  const [targetOptions, setTargetOptions] = useState([]);
  const [targetLoading, setTargetLoading] = useState(false);

  const fetchRelationTypes = async () => {
    setRelationTypesLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/relation-types`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      setRelationTypes((data || []).map(r => typeof r === 'string' ? r : r.name));
    } catch {
      setRelationTypes([]);
    }
    setRelationTypesLoading(false);
  };

  useEffect(() => {
    fetchRelationTypes();
  }, [userId, graphId]);

  useEffect(() => {
    async function fetchRegistry() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/ndf/users/${userId}/node_registry`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await res.json();
        setNodeRegistry(data);
      } catch {
        setNodeRegistry({});
      }
    }
    fetchRegistry();
  }, [userId]);

  // CNL-style preview logic
  let relTargetStr = relTarget.trim();
  if (relTargetQualifier.trim()) relTargetStr = `**${relTargetQualifier.trim()}** ${relTargetStr}`;
  if (relTargetQuantifier.trim()) relTargetStr = `*${relTargetQuantifier.trim()}* ${relTargetStr}`;
  let relPreview = '';
  if (relAdverb.trim()) relPreview += `++${relAdverb.trim()}++ `;
  relPreview += relation ? `<${relation.trim()}> ` : '';
  relPreview += relTargetStr;
  if (relModality.trim()) relPreview += ` [${relModality.trim()}]`;

  // Helper to filter node options from registry
  const filterNodeOptions = (query) => {
    if (!query) return [];
    const q = query.toLowerCase();
    return Object.entries(nodeRegistry)
      .filter(([id, n]) => id.toLowerCase().includes(q) || (n.name && n.name.toLowerCase().includes(q)))
      .map(([id, n]) => ({ id, name: n.name }));
  };

  const fetchNodeOptions = async (query, setOptions, setLoading) => {
    setLoading(true);
    setOptions(filterNodeOptions(query));
    setLoading(false);
  };

  const isRelationNameValid = relationTypes.includes(relation);

  const handleRelationSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (isSubmitting) {
      console.log('Preventing duplicate submission');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let tgtId = relTarget;
      
      // If relTarget is empty but targetQuery has content, use targetQuery
      if (!tgtId && targetQuery.trim()) {
        tgtId = targetQuery.trim();
      }
      
      // ATOMICITY FIX: Remove target node creation from frontend
      // The backend now handles target node creation atomically within the same transaction
      
      // Now tgtId is always a valid node ID (or will be created by backend)
      const payload = {
        id: relationId + '::' + relation + '::' + tgtId,
        name: relation,
        source_id: relationId,
        target_id: tgtId,
        adverb: relAdverb || undefined,
        modality: relModality || undefined,
        ...(morphId ? { morph_id: [morphId] } : {})
      };
      
      console.log('Creating relation with payload:', payload);
      
      const response = await fetch(`${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/relation/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('Relation created successfully:', responseData);
        
        setMessage("Relation created successfully!");
        setMessageType('success');
        
        if (typeof onSuccess === 'function') {
          // If backend returns full relation object, use it; otherwise use our payload
          const relationData = responseData.id || responseData.relation_id ? 
            { ...payload, id: responseData.id || responseData.relation_id } : payload;
          onSuccess(relationData);
        }
        
        // Reset form
        setRelation('');
        setRelTarget('');
        setRelTargetQualifier('');
        setRelTargetQuantifier('');
        setRelAdverb('');
        setRelModality('');
        setTargetQuery('');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to create relation:', errorData);
        setMessage(`Error creating relation: ${errorData.detail || 'Unknown error'}`);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error in handleRelationSubmit:', error);
      setMessage(`Error creating relation: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRelationTypeCreated = () => {
    setShowRelationModal(false);
    // Reload relation types to include the newly created one
    fetchRelationTypes();
  };

  return (
    <>
      <MessageArea 
        message={message} 
        type={messageType} 
        onClose={() => setMessage('')} 
      />
      <form className="space-y-4" onSubmit={handleRelationSubmit}>
        {/* CNL Preview - prominent and at the top */}
        <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-lg font-bold rounded">
          CNL Preview: <span className="text-blue-800">{relPreview || <span className="text-gray-400">(relation preview)</span>}</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-800">{editMode ? 'Edit Relation' : 'Create Relation'}</h3>
        <div>
          <label className="block text-sm font-medium mb-1">Source Node:</label>
          <div className="px-3 py-2 border rounded bg-gray-50 text-gray-700">{relationId}</div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Relation Type:
            <button
              className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded"
              type="button"
              onClick={() => setShowRelationModal(true)}
              disabled={editMode}
            >
              + Add
            </button>
          </label>
          <input
            type="text"
            placeholder="Type to search or select"
            value={relation}
            onChange={e => setRelation(e.target.value)}
            list="relation-type-list"
            className="w-full border border-gray-300 rounded px-3 py-2 mb-1"
            disabled={editMode || relationTypesLoading}
          />
          <datalist id="relation-type-list">
            {relationTypes.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          {relationTypesLoading && <div className="text-xs text-gray-400">Loading relation types...</div>}
          {!isRelationNameValid && relation && (
            <div className="text-xs text-red-500 mt-1">Invalid relation type. Please select from the list.</div>
          )}
        </div>
        {restrictions.canUseAdjectives && (
          <div className="grid grid-cols-2 gap-3 items-end mb-2">
            <div className="flex flex-col">
              <label className="font-semibold text-xs mb-1 text-center">Target Qualifier</label>
              <input className="border rounded px-2 py-1 text-center" value={relTargetQualifier} onChange={e => setRelTargetQualifier(e.target.value)} placeholder="e.g. Darwinian" />
            </div>
            {restrictions.canUseQuantifiers && (
              <div className="flex flex-col">
                <label className="font-semibold text-xs mb-1 text-center">Target Quantifier</label>
                <input className="border rounded px-2 py-1 text-center" value={relTargetQuantifier} onChange={e => setRelTargetQuantifier(e.target.value)} placeholder="e.g. all" />
              </div>
            )}
          </div>
        )}
        {restrictions.canUseQuantifiers && !restrictions.canUseAdjectives && (
          <div className="grid grid-cols-1 gap-3 items-end mb-2">
            <div className="flex flex-col">
              <label className="font-semibold text-xs mb-1 text-center">Target Quantifier</label>
              <input className="border rounded px-2 py-1 text-center" value={relTargetQuantifier} onChange={e => setRelTargetQuantifier(e.target.value)} placeholder="e.g. all" />
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1">Target Node:</label>
          <input
            type="text"
            placeholder="Type to search or create"
            value={targetQuery}
            onChange={async e => {
              setTargetQuery(e.target.value);
              setRelTarget(e.target.value);
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
                  className={`px-3 py-1 cursor-pointer hover:bg-blue-100 ${relTarget === opt.id ? 'bg-blue-50' : ''}`}
                  onClick={() => {
                    setRelTarget(opt.id);
                    setTargetQuery(opt.name || opt.id);
                    setTargetOptions([]);
                  }}
                >
                  {opt.name || opt.id}
                </li>
              ))}
            </ul>
          )}
        </div>
        {(restrictions.canUseAdverbs || restrictions.canUseModality) && (
          <div className="grid grid-cols-2 gap-3 items-end mb-2">
            {restrictions.canUseAdverbs && (
              <div className="flex flex-col">
                <label className="font-semibold text-xs mb-1 text-center">Adverb</label>
                <input className="border rounded px-2 py-1 text-center" value={relAdverb} onChange={e => setRelAdverb(e.target.value)} placeholder="e.g. quickly" />
              </div>
            )}
            {restrictions.canUseModality && (
              <div className="flex flex-col">
                <label className="font-semibold text-xs mb-1 text-center">Modality</label>
                <input className="border rounded px-2 py-1 text-center" value={relModality} onChange={e => setRelModality(e.target.value)} placeholder="e.g. probably" />
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={!isRelationNameValid || !relTarget.trim() || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : (editMode ? 'Update' : 'Submit')}
          </button>
        </div>
        {showRelationModal && (
          <RelationTypeModal
            isOpen={showRelationModal}
            onClose={() => setShowRelationModal(false)}
            onSuccess={handleRelationTypeCreated}
            userId={userId}
            graphId={graphId}
            endpoint={`${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/relation-types/create`}
            method="POST"
          />
        )}
      </form>
    </>
  );
}


