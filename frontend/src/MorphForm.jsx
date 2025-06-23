import React, { useState, useEffect } from "react";
import { API_BASE } from "./config";
import RelationForm from "./RelationForm";
import AttributeForm from "./AttributeForm";

function MorphForm({ 
  morph = null, 
  onSave, 
  onCancel, 
  nodeId, 
  graphId, 
  userId,
  existingMorphs = [],
  onGraphUpdate 
}) {
  const [formData, setFormData] = useState({
    id: morph?.morph_id || morph?.id || "",
    name: morph?.name || "",
    relationNode_ids: morph?.relationNode_ids || [],
    attributeNode_ids: morph?.attributeNode_ids || []
  });
  const [activeTab, setActiveTab] = useState(0); // 0: Basic, 1: Relations, 2: Attributes
  const [copyFromMorph, setCopyFromMorph] = useState("");
  const [editingRelation, setEditingRelation] = useState(null);
  const [editingAttribute, setEditingAttribute] = useState(null);

  // Generate morph ID if not provided
  useEffect(() => {
    if (!formData.id) {
      const baseName = formData.name.toLowerCase().replace(/\s+/g, '_') || 'morph';
      const timestamp = Date.now();
      setFormData(prev => ({ ...prev, id: `${baseName}_${timestamp}` }));
    }
  }, [formData.name]);

  const handleSave = () => {
    // Ensure the morph has the correct structure expected by the backend
    const morphData = {
      ...formData,
      morph_id: formData.id, // Use the form's id as morph_id
      node_id: nodeId, // Add the node_id
      id: undefined // Remove the id field to avoid confusion
    };
    onSave(morphData);
  };

  const handleCopyFromMorph = () => {
    if (!copyFromMorph) return;
    
    const sourceMorph = existingMorphs.find(m => (m.morph_id || m.id) === copyFromMorph);
    if (sourceMorph) {
      // Copy the relationNode_ids and attributeNode_ids from the source morph
      setFormData(prev => ({
        ...prev,
        relationNode_ids: [...(sourceMorph.relationNode_ids || [])],
        attributeNode_ids: [...(sourceMorph.attributeNode_ids || [])]
      }));
    }
  };

  const handleEditRelation = async (relId) => {
    try {
      // Fetch the existing relation data
      const response = await fetch(`${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/relationNodes/${relId}`);
      if (response.ok) {
        const relationData = await response.json();
        setEditingRelation(relationData);
      }
    } catch (error) {
      console.error('Failed to fetch relation data:', error);
    }
  };

  const handleEditAttribute = async (attrId) => {
    try {
      // Fetch the existing attribute data
      const response = await fetch(`${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/attributeNodes/${attrId}`);
      if (response.ok) {
        const attributeData = await response.json();
        setEditingAttribute(attributeData);
      }
    } catch (error) {
      console.error('Failed to fetch attribute data:', error);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
      <div className="mb-3">
        <h3 className="text-lg font-semibold mb-2">
          {morph ? "Edit Morph" : "Create New Morph"}
        </h3>
        
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Morph Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Ground State, Ionized, Excited"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Morph ID
            </label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., ground_state, ionized"
              required
            />
          </div>
        </div>

        {/* Copy from existing morph */}
        {existingMorphs.length > 0 && (
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
            <div className="text-sm font-medium mb-1">Copy from existing morph:</div>
            <div className="flex gap-2">
              <select
                value={copyFromMorph}
                onChange={(e) => setCopyFromMorph(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">Select morph to copy from...</option>
                {existingMorphs.map(m => (
                  <option key={m.morph_id || m.id} value={m.morph_id || m.id}>
                    {m.name || (m.morph_id || m.id)}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCopyFromMorph}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                disabled={!copyFromMorph}
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b mb-3">
          <button
            className={`flex-1 px-2 py-1 text-xs font-bold ${activeTab === 0 ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500'}`}
            onClick={() => setActiveTab(0)}
          >
            Basic Info
          </button>
          <button
            className={`flex-1 px-2 py-1 text-xs font-bold ${activeTab === 1 ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500'}`}
            onClick={() => setActiveTab(1)}
          >
            Relations ({formData.relationNode_ids.length})
          </button>
          <button
            className={`flex-1 px-2 py-1 text-xs font-bold ${activeTab === 2 ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500'}`}
            onClick={() => setActiveTab(2)}
          >
            Attributes ({formData.attributeNode_ids.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 0 && (
          <div className="text-sm text-gray-600">
            <p>Configure the basic information for this morph.</p>
            <p className="mt-2">Use the tabs above to add relations and attributes that define this morph's state.</p>
          </div>
        )}

        {activeTab === 1 && (
          <div>
            <RelationForm
              nodeId={nodeId}
              relationTypes={[]}
              userId={userId}
              graphId={graphId}
              onAddRelationType={() => {}}
              initialData={editingRelation}
              editMode={!!editingRelation}
              onSuccess={(newRelation) => {
                if (editingRelation) {
                  // Replace the old relation with the new one
                  setFormData(prev => ({
                    ...prev,
                    relationNode_ids: prev.relationNode_ids.map(id => 
                      id === editingRelation.id ? newRelation.id : id
                    )
                  }));
                  setEditingRelation(null);
                } else {
                  // Add new relation
                  setFormData(prev => ({
                    ...prev,
                    relationNode_ids: [...prev.relationNode_ids, newRelation.id]
                  }));
                }
                if (onGraphUpdate) onGraphUpdate();
              }}
              onCancel={() => setEditingRelation(null)}
            />
            {formData.relationNode_ids.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium mb-2">Current Relations:</div>
                <div className="space-y-1">
                  {formData.relationNode_ids.map((relId, index) => (
                    <div key={relId || index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                      <span>{relId}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditRelation(relId)}
                          className="text-blue-600 underline text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              relationNode_ids: prev.relationNode_ids.filter((_, i) => i !== index)
                            }));
                          }}
                          className="text-red-600 underline text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 2 && (
          <div>
            <AttributeForm
              nodeId={nodeId}
              attributeTypes={[]}
              userId={userId}
              graphId={graphId}
              onAddAttributeType={() => {}}
              initialData={editingAttribute || { id: Date.now().toString() }}
              editMode={!!editingAttribute}
              onSuccess={(newAttribute) => {
                if (editingAttribute) {
                  // Replace the old attribute with the new one
                  setFormData(prev => ({
                    ...prev,
                    attributeNode_ids: prev.attributeNode_ids.map(id => 
                      id === editingAttribute.id ? newAttribute.id : id
                    )
                  }));
                  setEditingAttribute(null);
                } else {
                  // Add new attribute
                  setFormData(prev => ({
                    ...prev,
                    attributeNode_ids: [...prev.attributeNode_ids, newAttribute.id]
                  }));
                }
                if (onGraphUpdate) onGraphUpdate();
              }}
              onCancel={() => setEditingAttribute(null)}
            />
            {formData.attributeNode_ids.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium mb-2">Current Attributes:</div>
                <div className="space-y-1">
                  {formData.attributeNode_ids.map((attrId, index) => (
                    <div key={attrId || index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                      <span>{attrId}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditAttribute(attrId)}
                          className="text-blue-600 underline text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              attributeNode_ids: prev.attributeNode_ids.filter((_, i) => i !== index)
                            }));
                          }}
                          className="text-red-600 underline text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-3">
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!formData.name || !formData.id}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {morph ? "Update" : "Create"} Morph
        </button>
      </div>
    </div>
  );
}

export default MorphForm; 