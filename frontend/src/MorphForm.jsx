import React, { useState, useEffect } from "react";
import { getApiBase } from "./config";
import RelationForm from "./RelationForm";
import AttributeForm from "./AttributeForm";
import MessageArea from './MessageArea';

// New component for managing morph items with multi-select and actions
function MorphItemManager({ 
  nodeId, 
  graphId, 
  userId, 
  morphId, 
  itemType, // 'attributes' or 'relations'
  onGraphUpdate 
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [targetMorphId, setTargetMorphId] = useState("");
  const [availableMorphs, setAvailableMorphs] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [showTargetSelector, setShowTargetSelector] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');

  // Function to refresh graph data
  const refreshGraphData = async () => {
    try {
      // Refresh the morph items list
      await fetchMorphItems();
      // Call onGraphUpdate to trigger parent refresh
      if (onGraphUpdate) onGraphUpdate();
    } catch (error) {
      console.error("Failed to refresh graph data:", error);
    }
  };

  // Fetch items for the current morph
  useEffect(() => {
    fetchMorphItems();
  }, [nodeId, morphId, itemType]);

  // Fetch available morphs for copy/move operations
  useEffect(() => {
    fetchAvailableMorphs();
  }, [nodeId]);

  const fetchMorphItems = async () => {
    try {
      setLoading(true);
      const endpoint = itemType === 'attributes' 
        ? `${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/${itemType.slice(0, -1)}/list_by_morph/${nodeId}`
        : `${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/${itemType.slice(0, -1)}/list_by_morph/${nodeId}`;
      
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`Failed to fetch ${itemType}`);
      
      const data = await response.json();
      const morphData = data.morphs[morphId];
      if (morphData && morphData[itemType]) {
        setItems(morphData[itemType]);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error(`Error fetching ${itemType}:`, error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableMorphs = async () => {
    try {
      const response = await fetch(`${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/polymorphic_composed`);
      if (!response.ok) throw new Error('Failed to fetch graph data');
      
      const data = await response.json();
      const morphs = data.nodes?.find(n => n.node_id === nodeId)?.morphs || [];
      setAvailableMorphs(morphs.filter(m => m.morph_id !== morphId));
    } catch (error) {
      console.error('Error fetching available morphs:', error);
      setAvailableMorphs([]);
    }
  };

  const handleItemSelect = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item[`${itemType.slice(0, -1)}_id`])));
    }
  };

  const handleActionClick = (action) => {
    if (action === 'copy' || action === 'move') {
      setPendingAction(action);
      setShowTargetSelector(true);
    } else {
      performAction(action);
    }
  };

  const handleTargetMorphSelect = (targetMorphId) => {
    setTargetMorphId(targetMorphId);
    setShowTargetSelector(false);
    setPendingAction(null);
    performAction(pendingAction, targetMorphId);
  };

  const performAction = async (action, targetMorphId = null) => {
    if (selectedItems.size === 0) return;
    
    setActionLoading(true);
    try {
      const promises = Array.from(selectedItems).map(async (itemId) => {
        const item = items.find(i => i[`${itemType.slice(0, -1)}_id`] === itemId);
        if (!item) return;

        const itemName = item.name;
        let endpoint, body;

        switch (action) {
          case 'unlist':
            endpoint = `${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/${itemType.slice(0, -1)}/unlist_from_morph/${nodeId}/${encodeURIComponent(itemName)}`;
            body = JSON.stringify({ morph_id: morphId });
            break;
          case 'copy':
            endpoint = `${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/${itemType.slice(0, -1)}/copy_to_morph/${nodeId}/${encodeURIComponent(itemName)}`;
            body = JSON.stringify({ morph_id: targetMorphId });
            break;
          case 'move':
            endpoint = `${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/${itemType.slice(0, -1)}/move_to_morph/${nodeId}/${encodeURIComponent(itemName)}`;
            body = JSON.stringify({ from_morph_id: morphId, to_morph_id: targetMorphId });
            break;
          case 'delete':
            // Use the proper delete endpoint
            if (itemType === 'attributes') {
              endpoint = `${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/attribute/delete/${nodeId}/${encodeURIComponent(itemName)}`;
            } else {
              // For relations, we need target_id
              endpoint = `${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/relation/delete/${nodeId}/${encodeURIComponent(itemName)}/${encodeURIComponent(item.target_id || '')}`;
            }
            break;
          default:
            return;
        }

        const response = await fetch(endpoint, {
          method: action === 'delete' ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: action === 'delete' ? undefined : body
        });

        if (!response.ok) {
          throw new Error(`Failed to ${action} ${itemName}`);
        }

        return response.json();
      });

      await Promise.all(promises);
      
      // Refresh the graph data after successful operation
      await refreshGraphData();
      setSelectedItems(new Set());
      setShowActionMenu(false);
      setTargetMorphId("");
      
    } catch (error) {
      console.error(`Failed to ${action} items:`, error);
      setMessage(`Failed to ${action} selected items: ${error.message}`);
      setMessageType('error');
    }
    setActionLoading(false);
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading {itemType}...</div>;
  }

  return (
    <>
      <MessageArea 
        message={message} 
        type={messageType} 
        onClose={() => setMessage('')} 
      />
      <div className="space-y-3">
        {/* Header with selection controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedItems.size === items.length && items.length > 0}
              indeterminate={selectedItems.size > 0 && selectedItems.size < items.length}
              onChange={handleSelectAll}
              className="rounded"
            />
            <span className="text-sm font-medium">
              {selectedItems.size > 0 ? `${selectedItems.size} selected` : `${items.length} ${itemType}`}
            </span>
          </div>
          
          {selectedItems.size > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowActionMenu(!showActionMenu)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Actions'}
              </button>
              
              {showActionMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 min-w-48">
                  <div className="p-2">
                    <button
                      onClick={() => handleActionClick('unlist')}
                      className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                      disabled={actionLoading}
                    >
                      🗑️ Unlist from this morph
                    </button>
                    
                    <button
                      onClick={() => handleActionClick('delete')}
                      className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded text-red-600"
                      disabled={actionLoading}
                    >
                      ❌ Delete from all morphs
                    </button>
                    
                    {availableMorphs.length > 0 && (
                      <>
                        <div className="border-t my-1"></div>
                        <button
                          onClick={() => handleActionClick('copy')}
                          className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                          disabled={actionLoading}
                        >
                          📋 Copy to another morph
                        </button>
                        
                        <button
                          onClick={() => handleActionClick('move')}
                          className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                          disabled={actionLoading}
                        >
                          ➡️ Move to another morph
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Target morph selector */}
        {showTargetSelector && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="text-sm font-medium mb-2">
              Select target morph for {pendingAction}:
            </div>
            <div className="space-y-1">
              {availableMorphs.map(morph => (
                <button
                  key={morph.morph_id}
                  onClick={() => handleTargetMorphSelect(morph.morph_id)}
                  className="w-full text-left px-2 py-1 text-sm hover:bg-blue-100 rounded"
                  disabled={actionLoading}
                >
                  {morph.name || morph.morph_id}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowTargetSelector(false);
                setPendingAction(null);
              }}
              className="mt-2 px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Items list */}
        {items.length > 0 ? (
          <div className="space-y-1">
            {items.map((item) => {
              const itemId = item[`${itemType.slice(0, -1)}_id`];
              const isSelected = selectedItems.has(itemId);
              
              return (
                <div 
                  key={itemId} 
                  className={`flex items-center gap-2 p-2 rounded text-sm cursor-pointer ${
                    isSelected ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => handleItemSelect(itemId)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleItemSelect(itemId)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded"
                  />
                  <span className="flex-1">
                    <strong>{item.name}</strong>
                    {itemType === 'attributes' && (
                      <span className="text-gray-600">
                        {item.value !== undefined && item.value !== null && item.value !== '' ? (
                          <>
                            : {item.value}
                            {item.unit && <span className="text-gray-500"> {item.unit}</span>}
                          </>
                        ) : (
                          <span className="text-gray-400 italic"> (no value)</span>
                        )}
                      </span>
                    )}
                    {itemType === 'relations' && item.target_id && (
                      <span className="text-gray-600"> → {item.target_id}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic">
            No {itemType} in this morph.
          </div>
        )}
      </div>
    </>
  );
}

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
      const response = await fetch(`${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/relationNodes/${relId}`);
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
      const response = await fetch(`${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/attributeNodes/${attrId}`);
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
              relationId={nodeId}
              relationTypes={[]}
              userId={userId}
              graphId={graphId}
              onAddRelationType={() => {}}
              initialData={editingRelation}
              editMode={!!editingRelation}
              morphId={formData.id}
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
            
            {/* Use the new MorphItemManager for relations */}
            {morph && formData.id && (
              <div className="mt-3">
                <div className="text-sm font-medium mb-2">Manage Relations:</div>
                <MorphItemManager
                  nodeId={nodeId}
                  graphId={graphId}
                  userId={userId}
                  morphId={formData.id}
                  itemType="relations"
                  onGraphUpdate={onGraphUpdate}
                />
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
              morphId={formData.id}
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
            
            {/* Use the new MorphItemManager for attributes */}
            {morph && formData.id && (
              <div className="mt-3">
                <div className="text-sm font-medium mb-2">Manage Attributes:</div>
                <MorphItemManager
                  nodeId={nodeId}
                  graphId={graphId}
                  userId={userId}
                  morphId={formData.id}
                  itemType="attributes"
                  onGraphUpdate={onGraphUpdate}
                />
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