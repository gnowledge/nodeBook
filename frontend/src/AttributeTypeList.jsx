// This patch adds full editing support to AttributeTypeList.jsx
// It enables:
// - Viewing attribute types as cards
// - Editing existing types via the modal (using PUT)
// - Deleting existing types (using DELETE - optional backend support needed)

import React, { useEffect, useState } from 'react';
import { getApiBase } from "./config";
import AttributeTypeModal from './AttributeTypeModal';
import { useUserInfo } from "./UserIdContext";

export default function AttributeTypeList({ graphId = "graph1" }) {
  const { userId } = useUserInfo();
  const [attributeTypes, setAttributeTypes] = useState([]);
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
      const res = await fetch(`${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/attribute-types`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.attributeTypes || data.attribute_types || []);
      setAttributeTypes(list);

      // Load global and user types separately for display
      const globalRes = await fetch(`${getApiBase()}/api/ndf/users/${userId}/schemas/global`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const globalData = await globalRes.json();
      setGlobalTypes(globalData.attribute_types || []);

      const userRes = await fetch(`${getApiBase()}/api/ndf/users/${userId}/schemas/user`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const userData = await userRes.json();
      setUserTypes(userData.attribute_types || []);
    } catch (err) {
      console.error("Failed to load attribute types:", err);
      setAttributeTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (attr) => {
    setEditTarget(attr);
    setModalOpen(true);
  };

  const handleDelete = async (name) => {
    if (!window.confirm(`Delete attribute type '${name}'?`)) return;
    try {
      const token = localStorage.getItem("token");
      await fetch(`${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/attribute-types/${name}`, { 
        method: 'DELETE',
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      loadTypes();
    } catch (err) {
      console.error("Failed to delete attribute type:", err);
    }
  };

  useEffect(() => { loadTypes(); }, [userId, graphId]);

  const isGlobalType = (name) => globalTypes.some(at => at.name === name);
  const isUserType = (name) => userTypes.some(at => at.name === name);

  if (loading) {
    return <div className="p-4 text-center">Loading attribute types...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Attribute Types</h2>
        <button 
          onClick={() => { setEditTarget(null); setModalOpen(true); }} 
          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          + Add Custom Attribute Type
        </button>
      </div>

      <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
        <div className="text-sm text-purple-800">
          <strong>Global Types:</strong> {globalTypes.length} (read-only, built-in)
          <br />
          <strong>Custom Types:</strong> {userTypes.length} (editable, user-defined)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {attributeTypes.map((a) => {
          const isGlobal = isGlobalType(a.name);
          const isUser = isUserType(a.name);
          
          return (
            <div key={a.name} className={`border p-4 rounded shadow bg-white ${isGlobal ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-lg font-semibold">{a.name}</h4>
                    <span className="text-sm text-gray-600">({a.data_type})</span>
                    {isGlobal && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Global</span>
                    )}
                    {isUser && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Custom</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{a.description}</p>
                  <p className="text-xs text-gray-500">Unit: {a.unit || '—'} | Domain: {(a.domain || []).join(', ') || 'Any'}</p>
                </div>
                <div className="space-y-1 text-right ml-2">
                  {isUser && (
                    <>
                      <button 
                        className="text-blue-600 hover:underline text-sm" 
                        onClick={() => handleEdit(a)}
                      >
                        Edit
                      </button>
                      <br />
                      <button 
                        className="text-red-600 hover:underline text-sm" 
                        onClick={() => handleDelete(a.name)}
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

      <AttributeTypeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadTypes}
        userId={userId}
        graphId={graphId}
        endpoint={editTarget ? `${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/attribute-types/${editTarget.name}` : `${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/attribute-types`}
        method={editTarget ? 'PUT' : 'POST'}
        initialData={editTarget}
      />
    </div>
  );
} 