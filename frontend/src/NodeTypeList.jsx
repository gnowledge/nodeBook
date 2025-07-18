import React, { useEffect, useState } from 'react';
import { useUserInfo } from "./UserIdContext";
import { getApiBase } from "./config";
import NodeTypeModal from './NodeTypeModal';

export default function NodeTypeList({ graphId = "graph1", onSelect, onAdd, onEdit, onDelete, showAddButton = true }) {
  const { userId } = useUserInfo();
  const [nodeTypes, setNodeTypes] = useState([]);
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
      const res = await fetch(`${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/node-types`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      setNodeTypes(data);

      // Load global and user types separately for display
      const globalRes = await fetch(`${getApiBase()}/api/ndf/users/${userId}/schemas/global`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const globalData = await globalRes.json();
      setGlobalTypes(globalData.node_types || []);

      const userRes = await fetch(`${getApiBase()}/api/ndf/users/${userId}/schemas/user`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const userData = await userRes.json();
      setUserTypes(userData.node_types || []);
    } catch (err) {
      console.error("Failed to load node types:", err);
      setNodeTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (nt) => {
    setEditTarget(nt);
    setModalOpen(true);
  };

  const handleDelete = async (name) => {
    if (!window.confirm(`Delete node type '${name}'?`)) return;
    try {
      const token = localStorage.getItem("token");
      await fetch(`${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/node-types/${name}`, { 
        method: 'DELETE',
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      loadTypes();
    } catch (err) {
      console.error("Failed to delete node type:", err);
    }
  };

  useEffect(() => { loadTypes(); }, [userId, graphId]);

  const isGlobalType = (name) => globalTypes.some(nt => nt.name === name);
  const isUserType = (name) => userTypes.some(nt => nt.name === name);

  if (loading) {
    return <div className="p-4 text-center">Loading node types...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Node Types</h2>
        {showAddButton && (
          <button 
            onClick={() => { setEditTarget(null); setModalOpen(true); }} 
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            + Add Custom Node Type
          </button>
        )}
      </div>

      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
        <div className="text-sm text-green-800">
          <strong>Global Types:</strong> {globalTypes.length} (read-only, built-in)
          <br />
          <strong>Custom Types:</strong> {userTypes.length} (editable, user-defined)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {nodeTypes.map((nt) => {
          const isGlobal = isGlobalType(nt.name);
          const isUser = isUserType(nt.name);
          
          return (
            <div key={nt.name} className={`border p-4 rounded shadow bg-white ${isGlobal ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-lg font-semibold">{nt.name}</h4>
                    {isGlobal && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Global</span>
                    )}
                    {isUser && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Custom</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{nt.description}</p>
                  <p className="text-xs text-gray-500">
                    Parent Types: {(nt.parent_types || []).join(', ') || 'None'}
                  </p>
                </div>
                <div className="space-y-1 text-right ml-2">
                  {isUser && (
                    <>
                      <button 
                        className="text-blue-600 hover:underline text-sm" 
                        onClick={() => handleEdit(nt)}
                      >
                        Edit
                      </button>
                      <br />
                      <button 
                        className="text-red-600 hover:underline text-sm" 
                        onClick={() => handleDelete(nt.name)}
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

      <NodeTypeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadTypes}
        userId={userId}
        graphId={graphId}
        endpoint={editTarget ? `${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/node-types/${editTarget.name}` : `${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/node-types`}
        method={editTarget ? 'PUT' : 'POST'}
        initialData={editTarget}
      />
    </div>
  );
} 