// Updated RelationTypeList.jsx to show cards with Edit and Delete actions
import React, { useEffect, useState } from 'react';
import { API_BASE } from './config';
import RelationTypeModal from './RelationTypeModal';

export default function RelationTypeList({ userId, graphId = "graph1" }) {
  const [relationTypes, setRelationTypes] = useState([]);
  const [globalTypes, setGlobalTypes] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadTypes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      // Load combined types (global + user)
      const res = await fetch(`${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/relation-types`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      setRelationTypes(data);

      // Load global and user types separately for display
      const globalRes = await fetch(`${API_BASE}/api/ndf/users/${userId}/schemas/global`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const globalData = await globalRes.json();
      setGlobalTypes(globalData.relation_types || []);

      const userRes = await fetch(`${API_BASE}/api/ndf/users/${userId}/schemas/user`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const userData = await userRes.json();
      setUserTypes(userData.relation_types || []);
    } catch (err) {
      console.error("Failed to load relation types:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rt) => {
    setEditTarget(rt);
    setModalOpen(true);
  };

  const handleDelete = async (name) => {
    if (!window.confirm(`Delete relation type '${name}'?`)) return;
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/relation-types/${name}`, { 
        method: 'DELETE',
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      loadTypes();
    } catch (err) {
      console.error("Failed to delete relation type:", err);
    }
  };

  useEffect(() => { loadTypes(); }, [userId, graphId]);

  const isGlobalType = (name) => globalTypes.some(rt => rt.name === name);
  const isUserType = (name) => userTypes.some(rt => rt.name === name);

  if (loading) {
    return <div className="p-4 text-center">Loading relation types...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Relation Types</h2>
        <button 
          onClick={() => { setEditTarget(null); setModalOpen(true); }} 
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Custom Relation Type
        </button>
      </div>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <div className="text-sm text-blue-800">
          <strong>Global Types:</strong> {globalTypes.length} (read-only, built-in)
          <br />
          <strong>Custom Types:</strong> {userTypes.length} (editable, user-defined)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {relationTypes.map((r) => {
          const isGlobal = isGlobalType(r.name);
          const isUser = isUserType(r.name);
          
          return (
            <div key={r.name} className={`border p-4 rounded shadow bg-white ${isGlobal ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-lg font-semibold">{r.name}</h4>
                    {isGlobal && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Global</span>
                    )}
                    {isUser && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Custom</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Inverse: {r.inverse_name}</p>
                  <p className="text-sm text-gray-700 mb-2">{r.description}</p>
                  <p className="text-xs text-gray-500">Domain: {(r.domain || []).join(', ') || 'Any'} | Range: {(r.range || []).join(', ') || 'Any'}</p>
                  <p className="text-xs text-gray-500">Symmetric: {r.symmetric ? 'Yes' : 'No'} | Transitive: {r.transitive ? 'Yes' : 'No'}</p>
                </div>
                <div className="space-y-1 text-right ml-2">
                  {isUser && (
                    <>
                      <button 
                        className="text-blue-600 hover:underline text-sm" 
                        onClick={() => handleEdit(r)}
                      >
                        Edit
                      </button>
                      <br />
                      <button 
                        className="text-red-600 hover:underline text-sm" 
                        onClick={() => handleDelete(r.name)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {isGlobal && (
                    <span className="text-xs text-gray-500">Read-only</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <RelationTypeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadTypes}
        userId={userId}
        graphId={graphId}
        endpoint={editTarget ? `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/relation-types/${editTarget.name}` : `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/relation-types/create`}
        method={editTarget ? 'PUT' : 'POST'}
        initialData={editTarget}
      />
    </div>
  );
}
