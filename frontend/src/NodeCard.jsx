import React, { useState, useEffect } from "react";
import { marked } from "marked";
import { API_BASE } from "./config";
import RelationForm from "./RelationForm";
import AttributeForm from "./AttributeForm";
import TransitionForm from "./TransitionForm";
import MorphForm from "./MorphForm";
import RelationTypeModal from "./RelationTypeModal";
import { useUserInfo } from "./UserIdContext";
import { useDifficulty } from "./DifficultyContext";
import MonacoEditor from '@monaco-editor/react';
import { refreshNodeData, authenticatedFetch, safeJsonParse, isTokenValid } from "./utils/authUtils";

// MorphItemManager component for managing morph items with multi-select and actions
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

  // Also refresh when morphId changes (for morph switching)
  useEffect(() => {
    if (morphId) {
      fetchMorphItems();
    }
  }, [morphId]);

  // Fetch available morphs for copy/move operations
  useEffect(() => {
    fetchAvailableMorphs();
  }, [nodeId]);

  useEffect(() => {
    // Debug: log availableMorphs and items for both item types
    if (itemType === 'relations' || itemType === 'attributes') {
      console.log(`[MorphItemManager] itemType: ${itemType}`);
      console.log('  availableMorphs:', availableMorphs);
      console.log('  items:', items);
      console.log('  morphId:', morphId);
    }
  }, [availableMorphs, items, itemType, morphId]);

  const fetchMorphItems = async () => {
    try {
      setLoading(true);
      
      if (!isTokenValid()) {
        console.error("Token expired, cannot fetch morph items");
        setItems([]);
        return;
      }
      
      const endpoint = `/api/ndf/users/${userId}/graphs/${graphId}/${itemType.slice(0, -1)}/list_by_morph/${nodeId}`;
      
      console.log(`[fetchMorphItems] Fetching ${itemType} from:`, endpoint);
      console.log(`[fetchMorphItems] morphId:`, morphId);
      
      const response = await authenticatedFetch(endpoint);
      if (!response.ok) throw new Error(`Failed to fetch ${itemType}`);
      
      const data = await safeJsonParse(response);
      console.log(`[fetchMorphItems] Response data:`, data);
      
      const morphData = data.morphs[morphId];
      console.log(`[fetchMorphItems] Morph data for ${morphId}:`, morphData);
      
      if (morphData && morphData[itemType]) {
        setItems(morphData[itemType]);
        console.log(`[fetchMorphItems] Set ${itemType}:`, morphData[itemType]);
      } else {
        setItems([]);
        console.log(`[fetchMorphItems] No ${itemType} found for morph ${morphId}`);
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
      if (!isTokenValid()) {
        console.error("Token expired, cannot fetch available morphs");
        setAvailableMorphs([]);
        return;
      }
      
      const response = await authenticatedFetch(`/api/ndf/users/${userId}/graphs/${graphId}/polymorphic_composed`);
      if (!response.ok) throw new Error('Failed to fetch graph data');
      
      const data = await safeJsonParse(response);
      console.log('[fetchAvailableMorphs] Debug info:');
      console.log('  nodeId:', nodeId);
      console.log('  morphId:', morphId);
      console.log('  itemType:', itemType);
      console.log('  data.nodes:', data.nodes);
      
      // Try to find the node by both node_id and id
      const node = data.nodes?.find(n => n.node_id === nodeId || n.id === nodeId);
      console.log('  found node:', node);
      
      if (!node) {
        console.warn('  Node not found! Available nodes:', data.nodes?.map(n => ({ id: n.id, node_id: n.node_id, name: n.name })));
      }
      
      const morphs = node?.morphs || [];
      console.log('  all morphs:', morphs);
      
      const filteredMorphs = morphs.filter(m => m.morph_id !== morphId);
      console.log('  filtered morphs (availableMorphs):', filteredMorphs);
      console.log('  current morphId being filtered out:', morphId);
      
      setAvailableMorphs(filteredMorphs);
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
      if (!isTokenValid()) {
        throw new Error("Authentication token expired. Please log in again.");
      }
      
      const promises = Array.from(selectedItems).map(async (itemId) => {
        const item = items.find(i => i[`${itemType.slice(0, -1)}_id`] === itemId);
        if (!item) return;

        const itemName = item.name;
        let endpoint, body;

        switch (action) {
          case 'unlist':
            endpoint = `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/${itemType.slice(0, -1)}/unlist_from_morph/${nodeId}/${encodeURIComponent(itemName)}`;
            body = JSON.stringify({ morph_id: morphId });
            break;
          case 'copy':
            endpoint = `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/${itemType.slice(0, -1)}/copy_to_morph/${nodeId}/${encodeURIComponent(itemName)}`;
            body = JSON.stringify({ morph_id: targetMorphId });
            break;
          case 'move':
            endpoint = `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/${itemType.slice(0, -1)}/move_to_morph/${nodeId}/${encodeURIComponent(itemName)}`;
            body = JSON.stringify({ from_morph_id: morphId, to_morph_id: targetMorphId });
            break;
          case 'delete':
            // Use the proper delete endpoint
            if (itemType === 'attributes') {
              endpoint = `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/attribute/delete/${nodeId}/${encodeURIComponent(itemName)}`;
            } else {
              // For relations, we need target_id
              endpoint = `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/relation/delete/${nodeId}/${encodeURIComponent(itemName)}/${encodeURIComponent(item.target_id || '')}`;
            }
            break;
          default:
            return;
        }

        const response = await authenticatedFetch(endpoint, {
          method: action === 'delete' ? 'DELETE' : 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: action === 'delete' ? undefined : body
        });

        if (!response.ok) {
          throw new Error(`Failed to ${action} ${itemName}`);
        }

        return await safeJsonParse(response);
      });

      await Promise.all(promises);
      
      // Refresh the graph data after successful operation
      await refreshGraphData();
      setSelectedItems(new Set());
      setShowActionMenu(false);
      setTargetMorphId("");
      
    } catch (error) {
      console.error(`Failed to ${action} items:`, error);
      alert(`Failed to ${action} selected items: ${error.message}`);
    }
    setActionLoading(false);
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading {itemType}...</div>;
  }

  return (
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
  );
}

function NodeCard({ node, graphId, onSummaryQueued, onGraphUpdate, graphRelations = [], graphAttributes = [], onInMemoryMorphChange }) {
  const { userId } = useUserInfo();
  const { restrictions, difficulty } = useDifficulty();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [freshNode, setFreshNode] = useState(node);
  const [editing, setEditing] = useState(false);
  const [editDescription, setEditDescription] = useState(node?.description || "");
  const [editRole, setEditRole] = useState("");
  const [showRelationForm, setShowRelationForm] = useState(false);
  const [showAttributeForm, setShowAttributeForm] = useState(false);
  const [showTransitionForm, setShowTransitionForm] = useState(false);
  const [editRelationIndex, setEditRelationIndex] = useState(null);
  const [editAttributeIndex, setEditAttributeIndex] = useState(null);
  const [nlpResult, setNlpResult] = useState(null);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [nlpError, setNlpError] = useState(null);
  const [showParseModal, setShowParseModal] = useState(false);
  const [parseMode, setParseMode] = useState(null); // 'enhanced' or 'basic'
  const [basicNlpResult, setBasicNlpResult] = useState(null);
  const [showNbhModal, setShowNbhModal] = useState(false);
  const [nbhTab, setNbhTab] = useState(0); // 0: Relations, 1: Attributes
  const [editRelations, setEditRelations] = useState([]);
  const [editAttributes, setEditAttributes] = useState([]);
  const [nbhSaveStatus, setNbhSaveStatus] = useState(null);
  const [nbhLoading, setNbhLoading] = useState(false);
  const [nbhViewMode, setNbhViewMode] = useState('rendered'); // 'rendered' or 'editor'
  const [isPolymorphic, setIsPolymorphic] = useState(false);
  const [showMorphForm, setShowMorphForm] = useState(false);
  const [editingMorph, setEditingMorph] = useState(null);
  const [morphs, setMorphs] = useState([]);
  const [activeMorphId, setActiveMorphId] = useState(null);
  // Title editing state
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  // Always fetch the latest node data when node.id/node.node_id changes
  useEffect(() => {
    const nodeId = node?.node_id || node?.id;
    if (!nodeId) return;
    
    const fetchNodeData = async () => {
      try {
        // Check if token is valid before making request
        if (!isTokenValid()) {
          console.error("Token expired, cannot fetch node data");
          return;
        }
        
        const data = await refreshNodeData(userId, graphId, nodeId);
        setFreshNode(data);
        
        // Check if node is polymorphic (has morphs)
        if (data.morphs && data.morphs.length > 0) {
          setIsPolymorphic(true);
          setMorphs(data.morphs);
          // Set active morph to the current nbh or first morph
          setActiveMorphId(data.nbh || data.morphs[0]?.morph_id);
        } else {
          setIsPolymorphic(false);
          setMorphs([]);
          setActiveMorphId(null);
        }
      } catch (err) {
        console.error("Failed to fetch node data:", err);
        // Don't set freshNode to null on error, keep existing data
      }
    };
    
    fetchNodeData();
  }, [node?.node_id, node?.id, userId, graphId]);

  // Update polymorphic state and morphs when freshNode changes
  useEffect(() => {
    if (freshNode?.morphs && freshNode.morphs.length > 0) {
      setIsPolymorphic(true);
      setMorphs(freshNode.morphs);
      // Ensure activeMorphId is synchronized with freshNode.nbh
      if (freshNode.nbh) {
        setActiveMorphId(freshNode.nbh);
      } else if (freshNode.morphs.length > 0) {
        setActiveMorphId(freshNode.morphs[0].morph_id);
      }
    } else {
      setIsPolymorphic(false);
      setMorphs([]);
      setActiveMorphId(null);
    }
  }, [freshNode]);

  // Debug logging for morph selection
  useEffect(() => {
    console.log('[NodeCard] Morph state:', {
      nodeId: freshNode?.node_id || freshNode?.id,
      isPolymorphic,
      morphs: morphs.map(m => ({ id: m.morph_id, name: m.name })),
      activeMorphId,
      freshNodeNbh: freshNode?.nbh
    });
  }, [freshNode, isPolymorphic, morphs, activeMorphId]);

  // Persist NLP result per node in sessionStorage
  const nodeKey = `nlpResult-${freshNode?.node_id || freshNode?.id}`;

  useEffect(() => {
    // Try to load NLP result from sessionStorage when node changes
    const saved = sessionStorage.getItem(nodeKey);
    if (saved) {
      try {
        setNlpResult(JSON.parse(saved));
      } catch {}
    } else {
      setNlpResult(null);
    }
  }, [freshNode?.node_id, freshNode?.id]);

  // Handler to queue this node for summary generation
  const handleQueueSummary = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${freshNode?.node_id || freshNode?.id}/submit_to_summary_queue`,
        { 
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );
      const data = await res.json();
      setStatus(data.status);
      if (data.status === "submitted") {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000); // Show for 3 seconds
      }
      if (onSummaryQueued) onSummaryQueued(data);
    } catch (err) {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  // Handler to clear the description and trigger summary regeneration
  const handleClearDescription = async () => {
    const nodeId = freshNode?.node_id || freshNode?.id;
    if (!nodeId) return;
    setLoading(true);
    setStatus(null);
    try {
      const token = localStorage.getItem("token");
      // Only send fields expected by the backend Node model
      const { name, qualifier, role, attributes, relations } = freshNode;
      const payload = {
        name,
        qualifier,
        role,
        description: "",
        attributes: attributes || [],
        relations: relations || [],
      };
      const res = await fetch(
        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${nodeId}`,
        {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      );
      if (res.ok) {
        setFreshNode({ ...freshNode, description: "" });
        setStatus("description cleared");
      } else {
        setStatus("error clearing description");
      }
    } catch (err) {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  // Editable description with Monaco (markdown mode)
  const handleEdit = () => {
    setEditDescription(freshNode?.description || "");
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditDescription(freshNode?.description || "");
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      // Save the updated description to backend
      const updatedNode = { ...freshNode, description: editDescription };
      const res = await fetch(
        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${updatedNode.node_id || updatedNode.id}`,
        {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(updatedNode)
        }
      );
      if (res.ok) {
        setFreshNode(updatedNode);
        setEditing(false);
        if (onGraphUpdate) onGraphUpdate();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1200);
      } else {
        setStatus("error saving");
      }
    } catch (err) {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  // Title editing handlers
  const handleEditTitle = () => {
    setEditTitle(freshNode?.name || "");
    setEditingTitle(true);
  };

  const handleCancelEditTitle = () => {
    setEditingTitle(false);
    setEditTitle(freshNode?.name || "");
  };

  const handleSaveEditTitle = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      // Save the updated name to backend
      const updatedNode = { ...freshNode, name: editTitle };
      const res = await fetch(
        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${updatedNode.node_id || updatedNode.id}`,
        {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(updatedNode)
        }
      );
      if (res.ok) {
        setFreshNode(updatedNode);
        setEditingTitle(false);
        if (onGraphUpdate) onGraphUpdate();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1200);
      } else {
        setStatus("error saving title");
      }
    } catch (err) {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  // Handler to run enhanced NLP parse
  const handleNlpParse = async () => {
    setNlpLoading(true);
    setNlpError(null);
    setNlpResult(null);
    setBasicNlpResult(null);
    const nodeId = freshNode?.node_id || freshNode?.id;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${nodeId}/nlp_parse_description`,
        { 
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );
      const data = await res.json();
      if (data.error) setNlpError(data.error);
      else {
        setNlpResult(data);
        sessionStorage.setItem(nodeKey, JSON.stringify(data));
      }
    } catch (err) {
      setNlpError("Failed to parse description.");
    } finally {
      setNlpLoading(false);
      setShowParseModal(false);
      // Do NOT reset parseMode here
      // setParseMode(null);
    }
  };

  // Handler to run basic NLP parse
  const handleBasicNlpParse = async () => {
    setNlpLoading(true);
    setNlpError(null);
    setNlpResult(null);
    setBasicNlpResult(null);
    const nodeId = freshNode?.node_id || freshNode?.id;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${nodeId}/nlp_parse_description?mode=basic`,
        { 
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );
      const data = await res.json();
      if (data.error) setNlpError(data.error);
      else setBasicNlpResult(data);
    } catch (err) {
      setNlpError("Failed to parse description.");
    } finally {
      setNlpLoading(false);
      setShowParseModal(false);
      // Do NOT reset parseMode here
      // setParseMode(null);
    }
  };

  // Fetch relationTypes from backend or context if available
  // For demo, use relationTypes from freshNode.relations if present
  const relationTypes = Array.from(new Set((freshNode?.relations || []).map(r => ({ name: r.name }))));
  const attributeTypes = [];

  // Helper to generate a random id (8 chars)
  function generateRandomId() {
    return Math.random().toString(36).substr(2, 8);
  }

  // Helper to safely display any value as a string for React
  function safeDisplay(val) {
    if (val == null) return "";
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return String(val);
    try {
      return JSON.stringify(val);
    } catch {
      return "(invalid value)";
    }
  }

  // Handler functions for deleting relations and attributes
  const handleDeleteRelation = async (rel) => {
    if (!confirm(`Delete relation "${rel.name || rel.type}"?`)) return;
    
    try {
      const token = localStorage.getItem("token");
      const relId = rel.id;
      const res = await fetch(
        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/relations/${relId}`,
        { 
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );
      if (res.ok) {
        if (onGraphUpdate) onGraphUpdate();
        // Reload this node to update the display
        const nodeId = freshNode?.node_id || freshNode?.id;
        fetch(`${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/getInfo/${nodeId}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
          .then(res => res.json())
          .then(data => setFreshNode(data));
      } else {
        alert('Failed to delete relation');
      }
    } catch (err) {
      alert(`Error deleting relation: ${err.message}`);
    }
  };

  const handleDeleteAttribute = async (attr) => {
    if (!confirm(`Delete attribute "${attr.name || attr.attribute_name}"?`)) return;
    
    try {
      const token = localStorage.getItem("token");
      const attrId = attr.id;
      const res = await fetch(
        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/attributes/${attrId}`,
        { 
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );
      if (res.ok) {
        if (onGraphUpdate) onGraphUpdate();
        // Reload this node to update the display
        const nodeId = freshNode?.node_id || freshNode?.id;
        fetch(`${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/getInfo/${nodeId}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
          .then(res => res.json())
          .then(data => setFreshNode(data));
      } else {
        alert('Failed to delete attribute');
      }
    } catch (err) {
      alert(`Error deleting attribute: ${err.message}`);
    }
  };

  // --- NBH (Node Neighborhood) Section ---
  // Helper to generate markdown for Node Neighborhood
  function generateNeighborhoodMarkdown(node) {
    let md = '';
    if (node.relations && node.relations.length > 0) {
      md += '### Relations\n';
      node.relations.forEach(rel => {
        md += `- **${rel.type || rel.name}**: ${rel.target_name || rel.target}`;
        if (rel.adverb) md += ` _(adverb: ${rel.adverb})_`;
        md += '\n';
      });
      md += '\n';
    }
    if (node.attributes && node.attributes.length > 0) {
      md += '### Attributes\n';
      node.attributes.forEach(attr => {
        md += `- **${attr.name || attr.attribute_name}**: ${attr.value}`;
        if (attr.unit) md += ` (${attr.unit})`;
        md += '\n';
      });
    }
    if (!md) md = '_No neighborhood info yet._';
    return md;
  }

  // Helper to render NBH with interactive elements
  function renderInteractiveNBH() {
    // Show CNL view if nbhViewMode is 'editor'
    if (nbhViewMode === 'editor') {
      return (
        <div className="bg-gray-50 p-3 rounded border">
          <div className="text-sm font-semibold mb-2">CNL View (Read-only):</div>
          <div className="text-sm font-mono text-gray-800 whitespace-pre-wrap">
            {nbhCNL || 'No neighborhood data available.'}
          </div>
        </div>
      );
    }

    // For polymorphic nodes with morphs, use MorphItemManager
    if (freshNode?.morphs && freshNode?.nbh) {
      const activeMorphId = freshNode.nbh;
      return (
        <div className="space-y-4">
          {/* Relations Section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-sm">Relations</h4>
              <button 
                className="text-green-600 hover:text-green-700 text-xs px-2 py-1 rounded border border-green-300 hover:border-green-400"
                onClick={() => {
                  setNbhTab(0);
                  setShowNbhModal(true);
                }}
                title="Add relation"
              >
                [+ Add]
              </button>
            </div>
            <MorphItemManager
              nodeId={freshNode?.node_id || freshNode?.id}
              graphId={graphId}
              userId={userId}
              morphId={activeMorphId}
              itemType="relations"
              onGraphUpdate={onGraphUpdate}
            />
          </div>

          {/* Attributes Section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-sm">Attributes</h4>
              <button 
                className="text-green-600 hover:text-green-700 text-xs px-2 py-1 rounded border border-green-300 hover:border-green-400"
                onClick={() => {
                  setNbhTab(1);
                  setShowNbhModal(true);
                }}
                title="Add attribute"
              >
                [+ Add]
              </button>
            </div>
            <MorphItemManager
              nodeId={freshNode?.node_id || freshNode?.id}
              graphId={graphId}
              userId={userId}
              morphId={activeMorphId}
              itemType="attributes"
              onGraphUpdate={onGraphUpdate}
            />
          </div>
        </div>
      );
    }

    // Legacy behavior for non-polymorphic nodes
    const nbhRelations = freshNode?.relations || [];
    const nbhAttributes = freshNode?.attributes || [];

    return (
      <div className="space-y-3">
        {/* Relations Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-sm">Relations</h4>
            <button 
              className="text-green-600 hover:text-green-700 text-xs px-2 py-1 rounded border border-green-300 hover:border-green-400"
              onClick={() => {
                setNbhTab(0);
                setShowNbhModal(true);
              }}
              title="Add relation"
            >
              [+ Add]
            </button>
          </div>
          {nbhRelations.length > 0 ? (
            <ul className="space-y-1">
              {nbhRelations.map((rel, index) => (
                <li key={rel.id || index} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">
                    <strong>{rel.name || rel.type}</strong>: {rel.target_id || rel.target_name || rel.target}
                    {rel.adverb && <em className="text-gray-600"> (adverb: {rel.adverb})</em>}
                    {rel.modality && <span className="text-gray-500"> [{rel.modality}]</span>}
                  </span>
                  <div className="flex gap-1">
                    <button 
                      className="text-red-600 hover:text-red-700 text-xs px-1 py-0.5 rounded border border-red-300 hover:border-red-400"
                      onClick={() => handleDeleteRelation(rel)}
                      title="Delete relation"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic text-sm">No relations yet.</p>
          )}
        </div>

        {/* Attributes Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-sm">Attributes</h4>
            <button 
              className="text-green-600 hover:text-green-700 text-xs px-2 py-1 rounded border border-green-300 hover:border-green-400"
              onClick={() => {
                setNbhTab(1);
                setShowNbhModal(true);
              }}
              title="Add attribute"
            >
              [+ Add]
            </button>
          </div>
          {nbhAttributes.length > 0 ? (
            <ul className="space-y-1">
              {nbhAttributes.map((attr, index) => (
                <li key={attr.id || index} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">
                    <strong>{attr.name || attr.attribute_name}</strong>: {attr.value}
                    {attr.adverb && <em className="text-gray-600"> (adverb: {attr.adverb})</em>}
                    {attr.unit && <span className="text-gray-500"> ({attr.unit})</span>}
                    {attr.modality && <span className="text-gray-500"> [{attr.modality}]</span>}
                  </span>
                  <div className="flex gap-1">
                    <button 
                      className="text-red-600 hover:text-red-700 text-xs px-1 py-0.5 rounded border border-red-300 hover:border-red-400"
                      onClick={() => handleDeleteAttribute(attr)}
                      title="Delete attribute"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic text-sm">No attributes yet.</p>
          )}
        </div>
      </div>
    );
  }

  // Keep NBH state in sync with freshNode
  useEffect(() => {
    setEditRelations(freshNode?.relations ? JSON.parse(JSON.stringify(freshNode.relations)) : []);
    setEditAttributes(freshNode?.attributes ? JSON.parse(JSON.stringify(freshNode.attributes)) : []);
  }, [freshNode?.relations, freshNode?.attributes]);

  // Open NBH modal and initialize edit state
  const handleOpenNbhModal = () => {
    setEditRelations((freshNode?.relations||[]).map(r => ({...r})));
    setEditAttributes((freshNode?.attributes||[]).map(a => ({...a})));
    setShowNbhModal(true);
    setNbhTab(0);
    setNbhSaveStatus(null);
  };

  // Save NBH edits (relations/attributes)
  const handleSaveNbh = async () => {
    setNbhLoading(true);
    setNbhSaveStatus(null);
    try {
      const token = localStorage.getItem("token");
      const updatedNode = { ...freshNode, relations: editRelations, attributes: editAttributes };
      const res = await fetch(
        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${updatedNode.node_id || updatedNode.id}`,
        {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(updatedNode)
        }
      );
      if (res.ok) {
        setFreshNode(updatedNode);
        setShowNbhModal(false);
        if (onGraphUpdate) onGraphUpdate();
      } else {
        setNbhSaveStatus("Failed to save neighborhood");
      }
    } catch (err) {
      setNbhSaveStatus("Error saving neighborhood");
    } finally {
      setNbhLoading(false);
    }
  };

  // NBH markdown: generate from polymorphic data structure (same as CNL)
  const nbhMarkdown = (() => {
    const markdownLines = [];
    
    // Handle polymorphic data structure
    if (freshNode?.morphs && freshNode?.nbh) {
      // Find the active morph (neighborhood)
      const activeMorph = freshNode.morphs.find(m => m.morph_id === freshNode.nbh);
      if (activeMorph) {
        // Process RelationNode edges from active morph
        const relations = [];
        for (const rel_id of activeMorph.relationNode_ids || []) {
          // Find the relation in the graph-level relations array
          const rel = graphRelations.find(r => r.id === rel_id);
          if (rel) {
            relations.push(rel);
          }
        }
        
        // Process AttributeNode edges from active morph
        const attributes = [];
        for (const attr_id of activeMorph.attributeNode_ids || []) {
          // Find the attribute in the graph-level attributes array
          const attr = graphAttributes.find(a => a.id === attr_id);
          if (attr) {
            attributes.push(attr);
          }
        }
        
        // Generate markdown from collected relations and attributes
        if (relations.length > 0) {
          markdownLines.push('### Relations');
          relations.forEach(rel => {
            let line = `- **${rel.name}**: ${rel.target_id}`;
            if (rel.adverb) line += ` _(adverb: ${rel.adverb})_`;
            if (rel.modality) line += ` [${rel.modality}]`;
            markdownLines.push(line);
          });
          markdownLines.push('');
        }
        
        if (attributes.length > 0) {
          markdownLines.push('### Attributes');
          attributes.forEach(attr => {
            let line = `- **${attr.name}**: ${attr.value}`;
            if (attr.adverb) line += ` _(adverb: ${attr.adverb})_`;
            if (attr.unit) line += ` (${attr.unit})`;
            if (attr.modality) line += ` [${attr.modality}]`;
            markdownLines.push(line);
          });
        }
      }
    }
    
    // Fallback to legacy relations/attributes if no polymorphic data
    if (markdownLines.length === 0) {
      if (freshNode?.relations && freshNode.relations.length > 0) {
        markdownLines.push('### Relations');
        freshNode.relations.forEach(rel => {
          let line = `- **${rel.type || rel.name}**: ${rel.target_name || rel.target}`;
          if (rel.adverb) line += ` _(adverb: ${rel.adverb})_`;
          if (rel.modality) line += ` [${rel.modality}]`;
          markdownLines.push(line);
        });
        markdownLines.push('');
      }
      
      if (freshNode?.attributes && freshNode.attributes.length > 0) {
        markdownLines.push('### Attributes');
        freshNode.attributes.forEach(attr => {
          let line = `- **${attr.name || attr.attribute_name}**: ${attr.value}`;
          if (attr.adverb) line += ` _(adverb: ${attr.adverb})_`;
          if (attr.unit) line += ` (${attr.unit})`;
          if (attr.modality) line += ` [${attr.modality}]`;
          markdownLines.push(line);
        });
      }
    }
    
    return markdownLines.join('\n');
  })();

  // NBH CNL: show relations in CNL syntax: <relation name> target_node
  const nbhCNL = (() => {
    const cnlLines = [];
    
    // Handle polymorphic data structure
    if (freshNode?.morphs && freshNode?.nbh) {
      // Find the active morph (neighborhood)
      const activeMorph = freshNode.morphs.find(m => m.morph_id === freshNode.nbh);
      if (activeMorph) {
        // Process RelationNode edges from active morph
        for (const rel_id of activeMorph.relationNode_ids || []) {
          // Find the relation in the graph-level relations array
          const rel = graphRelations.find(r => r.id === rel_id);
          if (rel) {
            let cnlLine = '';
            if (rel.adverb) cnlLine += `++${rel.adverb}++ `;
            cnlLine += `<${rel.name}> ${rel.target_id}`;
            if (rel.modality) cnlLine += ` [${rel.modality}]`;
            cnlLines.push(cnlLine);
          }
        }
        
        // Process AttributeNode edges from active morph
        for (const attr_id of activeMorph.attributeNode_ids || []) {
          // Find the attribute in the graph-level attributes array
          const attr = graphAttributes.find(a => a.id === attr_id);
          if (attr) {
            let cnlLine = `has ${attr.name}: `;
            if (attr.adverb) cnlLine += `++${attr.adverb}++ `;
            cnlLine += `${attr.value}`;
            if (attr.unit) cnlLine += ` *${attr.unit}*`;
            if (attr.modality) cnlLine += ` [${attr.modality}]`;
            cnlLines.push(cnlLine);
          }
        }
      }
    }
    
    // Fallback to legacy relations/attributes if no polymorphic data
    if (cnlLines.length === 0) {
      cnlLines.push(
        ...(freshNode?.relations||[]).map(r => {
          let cnlLine = '';
          if (r.adverb) cnlLine += `++${r.adverb}++ `;
          cnlLine += `<${r.type||r.name||''}> ${r.target_name||r.target||''}`;
          if (r.modality) cnlLine += ` [${r.modality}]`;
          return cnlLine;
        }),
        ...(freshNode?.attributes||[]).map(a => {
          let cnlLine = `has ${a.name||a.attribute_name||''}: `;
          if (a.adverb) cnlLine += `++${a.adverb}++ `;
          cnlLine += `${a.value||''}`;
          if (a.unit) cnlLine += ` *${a.unit}*`;
          if (a.modality) cnlLine += ` [${a.modality}]`;
          return cnlLine;
        })
      );
    }
    
    return cnlLines.filter(Boolean).join("\n");
  })();

  // Check if there's any NBH content
  const hasNBHContent = (freshNode?.relations && freshNode.relations.length > 0) || 
                       (freshNode?.attributes && freshNode.attributes.length > 0) ||
                       (nbhCNL && nbhCNL.trim() !== "");

  // Helper function to get the display name based on active morph
  const getDisplayName = () => {
    // If polymorphic and has multiple morphs, check which morph is active
    if (isPolymorphic && morphs.length > 1) {
      const activeMorph = morphs.find(m => m.morph_id === activeMorphId);
      if (activeMorph) {
        // If it's the basic morph (first morph), use polynode name
        const isBasicMorph = morphs.indexOf(activeMorph) === 0;
        if (isBasicMorph) {
          return freshNode?.name || freshNode?.node_id || '';
        } else if (activeMorph.name) {
          // For non-basic morphs, use the morph name
          return activeMorph.name;
        }
      }
    }
    
    // Fallback to base node name
    return freshNode?.name || freshNode?.node_id || '';
  };

  // Guard clause to prevent rendering when freshNode is null/undefined
  if (!freshNode) {
    return <div className="border border-gray-300 rounded-lg shadow-sm p-4 bg-white">
      <div className="text-gray-500">Loading node...</div>
    </div>;
  }

  const hasDescription = freshNode?.description && freshNode.description.trim() !== "";
  const displayName = getDisplayName();

  const handleSaveMorphs = async (updatedMorphs) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const updatedNode = { ...freshNode, morphs: updatedMorphs };
      const res = await fetch(
        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${updatedNode.node_id || updatedNode.id}`,
        {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(updatedNode)
        }
      );
      if (res.ok) {
        setFreshNode(updatedNode);
        setMorphs(updatedMorphs);
        if (onGraphUpdate) onGraphUpdate();
      }
    } catch (err) {
      console.error("Failed to save morphs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMorphSwitch = async (morphId) => {
    console.log('[handleMorphSwitch] Called with:', {
      morphId,
      currentActiveMorphId: activeMorphId,
      freshNodeNbh: freshNode?.nbh
    });
    
    if (morphId === activeMorphId) {
      console.log('[handleMorphSwitch] Same morph, skipping');
      return;
    }
    
    // In-memory morph switch - no database persistence
    console.log('[handleMorphSwitch] Switching morph in-memory only');
    
    // Update the node's nbh in memory
    const updatedNode = { ...freshNode, nbh: morphId };
    setFreshNode(updatedNode);
    setActiveMorphId(morphId);
    
    console.log('[handleMorphSwitch] Updated state:', {
      newNbh: morphId,
      updatedNode: updatedNode
    });
    
    // Notify parent component about the in-memory morph change
    if (onInMemoryMorphChange) {
      console.log('[handleMorphSwitch] Notifying parent of morph change');
      onInMemoryMorphChange(freshNode.node_id || freshNode.id, morphId);
    }
  };

  const handleDeleteMorph = async (morphId) => {
    if (!confirm("Are you sure you want to delete this morph? This will also delete all its relations and attributes.")) {
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const updatedMorphs = morphs.filter(m => m.morph_id !== morphId);
      
      // If we're deleting the active morph, switch to the first available morph
      let newNbh = freshNode.nbh;
      if (morphId === activeMorphId && updatedMorphs.length > 0) {
        newNbh = updatedMorphs[0].morph_id;
        setActiveMorphId(newNbh);
      } else if (updatedMorphs.length === 0) {
        // No morphs left, remove polymorphic state
        newNbh = null;
        setIsPolymorphic(false);
        setActiveMorphId(null);
      }
      
      const updatedNode = { ...freshNode, morphs: updatedMorphs, nbh: newNbh };
      const res = await fetch(
        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${updatedNode.node_id || updatedNode.id}`,
        {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(updatedNode)
        }
      );
      if (res.ok) {
        setFreshNode(updatedNode);
        setMorphs(updatedMorphs);
        if (onGraphUpdate) onGraphUpdate();
      }
    } catch (err) {
      console.error("Failed to delete morph:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id={"node-" + (freshNode?.node_id || freshNode?.id)} className="border border-gray-300 rounded-lg shadow-sm p-4 bg-white relative">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          {editingTitle ? (
            <div className="mb-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-lg font-semibold text-blue-700"
                placeholder="Enter node name"
                autoFocus
              />
              <div className="flex gap-2 mt-1">
                <button 
                  className="bg-blue-600 text-white px-2 py-1 rounded text-xs" 
                  onClick={handleSaveEditTitle} 
                  disabled={loading}
                >
                  Save
                </button>
                <button 
                  className="bg-gray-300 px-2 py-1 rounded text-xs" 
                  onClick={handleCancelEditTitle}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <h2 className="text-lg font-semibold text-blue-700">
              <span dangerouslySetInnerHTML={{ __html: marked.parseInline(displayName) }} />
              {isPolymorphic && morphs.length > 1 && activeMorphId && (() => {
                const activeMorph = morphs.find(m => m.morph_id === activeMorphId);
                const isBasicMorph = morphs.indexOf(activeMorph) === 0;
                return !isBasicMorph && activeMorph?.name;
              })() && (
                <span className="ml-2 text-xs text-purple-600 font-normal">
                  (morph)
                </span>
              )}
              <button 
                className="ml-2 text-blue-600 underline text-xs" 
                onClick={handleEditTitle}
                title="Edit title"
              >
                Edit
              </button>
            </h2>
          )}
          
          {/* --- Node Neighborhood Section --- */}
          <div className="mb-2">
            {restrictions.canUseMorphManagement && morphs.length > 1 ? (
              <>
                {/* Show base node name as subtitle when non-basic morph is active */}
                {isPolymorphic && activeMorphId && (() => {
                  const activeMorph = morphs.find(m => m.morph_id === activeMorphId);
                  const isBasicMorph = morphs.indexOf(activeMorph) === 0;
                  return !isBasicMorph && activeMorph?.name;
                })() && (
                  <p className="text-sm text-gray-500 mt-1">
                    Base: {freshNode?.name || freshNode?.node_id || ''}
                  </p>
                )}
                {/* Morph Selection Radio Buttons */}
                {isPolymorphic && morphs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="text-xs text-gray-600 font-medium">Morphs:</span>
                    {morphs.map((morph, index) => (
                      <label key={morph.morph_id} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={`morph-${freshNode?.node_id || freshNode?.id}`}
                          value={morph.morph_id}
                          checked={activeMorphId === morph.morph_id}
                          onChange={() => handleMorphSwitch(morph.morph_id)}
                          disabled={loading}
                          className="text-blue-600"
                        />
                        <span className={`text-xs px-2 py-1 rounded ${
                          activeMorphId === morph.morph_id 
                            ? 'bg-blue-100 text-blue-800 font-medium' 
                            : 'text-gray-700 hover:text-blue-600'
                        }`}>
                          {index === 0 ? 'basic' : (morph.name || `morph ${index}`)}
                          {activeMorphId === morph.morph_id && ' ✓'}
                        </span>
                      </label>
                    ))}
                    <button 
                      className="text-green-600 hover:text-green-700 text-xs px-2 py-1 rounded border border-green-300 hover:border-green-400"
                      onClick={() => setShowMorphForm(true)}
                      title="Add new morph"
                    >
                      +
                    </button>
                  </div>
                )}
                {/* Add Morph button when polymorphic but no morphs yet */}
                {isPolymorphic && morphs.length === 0 && (
                  <div className="mt-2">
                    <button 
                      className="text-green-600 hover:text-green-700 text-xs px-2 py-1 rounded border border-green-300 hover:border-green-400"
                      onClick={() => setShowMorphForm(true)}
                      title="Add first morph"
                    >
                      + Add Morph
                    </button>
                  </div>
                )}
                {/* Morph management buttons in Node Neighborhood section */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">
                    {isPolymorphic && activeMorphId 
                      ? `${morphs.findIndex(m => m.morph_id === activeMorphId) === 0 ? 'Basic Morph' : (morphs.find(m => m.morph_id === activeMorphId)?.name || 'Morph')} Neighborhood:`
                      : 'Node Neighborhood:'
                    }
                  </span>
                  {/* Morph management buttons */}
                  {isPolymorphic && morphs.length > 1 && morphs[0]?.morph_id !== activeMorphId && (
                    <button 
                      className="text-red-600 underline text-xs"
                      onClick={() => handleDeleteMorph(activeMorphId)}
                      disabled={loading}
                    >
                      Delete Current Morph
                    </button>
                  )}
                  {/* Only show transition creation if we have polymorphic nodes with multiple morphs and user has permission */}
                  {isPolymorphic && morphs.length >= 2 && restrictions.canCreateTransitions && (
                    <button className="text-green-600 underline text-xs" onClick={() => setShowTransitionForm(true)}>Create Transition</button>
                  )}
                  <button 
                    className="text-gray-600 underline text-xs" 
                    onClick={() => setNbhViewMode(nbhViewMode === 'rendered' ? 'editor' : 'rendered')}
                  >
                    {nbhViewMode === 'rendered' ? 'View CNL' : 'View Rendered'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">Node Neighborhood:</span>
                <button 
                  className="text-gray-600 underline text-xs" 
                  onClick={() => setNbhViewMode(nbhViewMode === 'rendered' ? 'editor' : 'rendered')}
                >
                  {nbhViewMode === 'rendered' ? 'View CNL' : 'View Rendered'}
                </button>
              </div>
            )}
            {/* Always show add buttons and NBH content/message */}
            <div className="space-y-3">
              {renderInteractiveNBH()}
            </div>
          </div>
        </div>
        
        {/* Role selector as compact button group */}
        <div className="flex gap-1">
          {restrictions.canChooseRoles ? (
            <>
              {["individual", "class"].map(option => (
                <button
                  key={option}
                  className={`px-2 py-0.5 rounded text-xs font-semibold border ${freshNode?.role === option ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-blue-100"}`}
                  style={{ minWidth: 0 }}
                  onClick={async () => {
                    if (freshNode?.role === option) return;
                    setLoading(true);
                    try {
                      const token = localStorage.getItem("token");
                      const updatedNode = { ...freshNode, role: option };
                      const res = await fetch(
                        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${updatedNode.node_id || updatedNode.id}`,
                        {
                          method: "PUT",
                          headers: { 
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                          },
                          body: JSON.stringify(updatedNode)
                        }
                      );
                      if (res.ok) {
                        setFreshNode(updatedNode);
                        if (onGraphUpdate) onGraphUpdate();
                      }
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  title={option.charAt(0).toUpperCase() + option.slice(1)}
                >
                  {option.charAt(0).toUpperCase()}
                </button>
              ))}
              {restrictions.canUseProcessRole && (
                <button
                  className={`px-2 py-0.5 rounded text-xs font-semibold border ${freshNode?.role === "process" ? "bg-green-600 text-white border-green-600" : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-green-100"}`}
                  style={{ minWidth: 0 }}
                  onClick={async () => {
                    if (freshNode?.role === "process") return;
                    setLoading(true);
                    try {
                      const token = localStorage.getItem("token");
                      const updatedNode = { ...freshNode, role: "process" };
                      const res = await fetch(
                        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${updatedNode.node_id || updatedNode.id}`,
                        {
                          method: "PUT",
                          headers: { 
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                          },
                          body: JSON.stringify(updatedNode)
                        }
                      );
                      if (res.ok) {
                        setFreshNode(updatedNode);
                        if (onGraphUpdate) onGraphUpdate();
                      }
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  title="Process"
                >
                  P
                </button>
              )}
              {restrictions.canUseFunctionRole && (
                <button
                  className={`px-2 py-0.5 rounded text-xs font-semibold border ${freshNode?.role === "function" ? "bg-orange-600 text-white border-orange-600" : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-orange-100"}`}
                  style={{ minWidth: 0 }}
                  onClick={async () => {
                    if (freshNode?.role === "function") return;
                    setLoading(true);
                    try {
                      const token = localStorage.getItem("token");
                      const updatedNode = { ...freshNode, role: "function" };
                      const res = await fetch(
                        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${updatedNode.node_id || updatedNode.id}`,
                        {
                          method: "PUT",
                          headers: { 
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                          },
                          body: JSON.stringify(updatedNode)
                        }
                      );
                      if (res.ok) {
                        setFreshNode(updatedNode);
                        if (onGraphUpdate) onGraphUpdate();
                      }
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  title="Function"
                >
                  F
                </button>
              )}
            </>
          ) : (
            <div className="px-2 py-0.5 rounded text-xs font-semibold border bg-blue-600 text-white border-blue-600 cursor-default select-none">
              {freshNode?.role ? freshNode.role.charAt(0).toUpperCase() + freshNode.role.slice(1) : restrictions.defaultRole.charAt(0).toUpperCase() + restrictions.defaultRole.slice(1)}
            </div>
          )}
          {/* Polymorphic toggle */}
          {restrictions.canUseMorphManagement && (
            <button
              className={`px-2 py-0.5 rounded text-xs font-semibold border ${isPolymorphic ? "bg-purple-600 text-white border-purple-600" : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-purple-100"}`}
              onClick={() => setIsPolymorphic(!isPolymorphic)}
              title="Polymorphic Node"
            >
              M
            </button>
          )}
        </div>
      </div>

      {/* Description section - always show */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold">Description:</span>
          <button className="text-blue-600 underline text-xs" onClick={handleEdit}>Edit</button>
          {hasDescription && restrictions.canUseParseButton && (
            <button
              className="text-purple-600 underline text-xs"
              onClick={() => setShowParseModal(true)}
              disabled={nlpLoading}
            >
              Parse
            </button>
          )}
        </div>
          
          {editing ? (
            <div>
              <MonacoEditor
                height="120px"
                language="markdown"
                value={editDescription}
                onChange={setEditDescription}
                options={{ wordWrap: 'on' }}
              />
              <div className="flex gap-2 mt-2">
                <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs" onClick={handleSaveEdit} disabled={loading}>
                  Save
                </button>
                <button className="bg-gray-300 px-3 py-1 rounded text-xs" onClick={handleCancelEdit}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm bg-gray-50 p-2 rounded" dangerouslySetInnerHTML={{ __html: marked.parse(freshNode?.description || '') }} />
          )}
        </div>

      {/* Generate Summary button - only show if no description and not editing */}
      {!hasDescription && !editing && (
        <div className="mb-2">
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
            onClick={handleQueueSummary}
            disabled={loading}
          >
            {loading ? "Submitting..." : "Generate Summary"}
          </button>
        </div>
      )}

      {/* Parse Mode Modal */}
      {showParseModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <div className="bg-white p-4 rounded shadow-lg border border-gray-200 min-w-[220px]">
            <div className="mb-2 font-semibold text-sm">Select NLP Parse Mode:</div>
            {restrictions.canUseAdvancedParse && (
              <button
                className="w-full mb-2 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs"
                onClick={() => { setParseMode('enhanced'); handleNlpParse(); }}
                disabled={nlpLoading}
              >
                Enhanced
              </button>
            )}
            <button
              className="w-full mb-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
              onClick={() => { setParseMode('basic'); handleBasicNlpParse(); }}
              disabled={nlpLoading}
            >
              Basic
            </button>
            <button
              className="w-full px-3 py-1 bg-gray-300 rounded text-xs"
              onClick={() => setShowParseModal(false)}
              disabled={nlpLoading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Render NLP result if available */}
      {parseMode !== 'basic' && nlpResult && (
        <div className="mb-2 p-2 border rounded bg-gray-50">
          <div className="text-xs font-bold mb-1">NLP Suggestions (Enhanced):</div>
          {/* SVO Triples (Relation candidates) */}
          {nlpResult.svos && nlpResult.svos.length > 0 && (
            <div className="mb-1">
              <span className="font-semibold">Possible Relations (SVO):</span>
              <ul className="ml-2 list-disc text-xs">
                {nlpResult.svos.map((svo, i) => (
                  <li key={i}>
                    <span className="text-blue-700 font-semibold">{svo.verb}</span>:
                    <span className="ml-1">{svo.subject} → {svo.object}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Attribute-value pairs */}
          {nlpResult.attribute_value_pairs && nlpResult.attribute_value_pairs.length > 0 && (
            <div className="mb-1">
              <span className="font-semibold">Possible Attributes:</span>
              <ul className="ml-2 list-disc text-xs">
                {nlpResult.attribute_value_pairs.map((pair, i) => (
                  <li key={i}>
                    <span className="text-blue-700 font-semibold">
                      {pair.attribute}
                    </span>: {pair.value}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Original POS breakdown (optional, can be toggled) */}
          <details className="mt-1">
            <summary className="text-xs text-gray-500 cursor-pointer">Show POS breakdown</summary>
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(nlpResult).filter(([key]) => ["verbs","verb_phrases","adjectives","adverbs","proper_nouns","common_nouns"].includes(key)).map(([key, arr]) => (
                arr.length > 0 && (
                  <div key={key}>
                    <span className="font-semibold capitalize mr-1">{key}:</span>
                    {arr.map((item, i) => (
                      <span key={i} className={
                        key === "verbs" ? "text-green-700 font-bold" :
                        key === "verb_phrases" ? "text-green-500 italic" :
                        key === "adjectives" ? "text-blue-700" :
                        key === "adverbs" ? "text-purple-700" :
                        key === "proper_nouns" ? "text-pink-700 font-semibold" :
                        key === "common_nouns" ? "text-gray-700" :
                        ""
                      }>{item}{i < arr.length - 1 ? ', ' : ''}</span>
                    ))}
                  </div>
                )
              ))}
            </div>
          </details>
        </div>
      )}
      {parseMode === 'basic' && basicNlpResult && (
        <div className="mb-2 p-2 border rounded bg-blue-50">
          <div className="text-xs font-bold mb-1">NLP Suggestions (Basic):</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(basicNlpResult).map(([key, arr]) => (
              arr.length > 0 && (
                <div key={key}>
                  <span className="font-semibold capitalize mr-1">{key}:</span>
                  {arr.map((item, i) => {
                    let display;
                    if (item && typeof item === 'object') {
                      // SVO triple: {subject, verb, object}
                      if ('subject' in item && 'verb' in item && 'object' in item) {
                        display = `${item.subject} —[${item.verb}]→ ${item.object}`;
                      } else {
                        display = JSON.stringify(item);
                      }
                    } else {
                      display = String(item);
                    }
                    return (
                      <span key={i} className={
                        key === "verbs" ? "text-green-700 font-bold" :
                        key === "verb_phrases" ? "text-green-500 italic" :
                        key === "adjectives" ? "text-blue-700" :
                        key === "adverbs" ? "text-purple-700" :
                        key === "connectives" ? "text-orange-700" :
                        key === "proper_nouns" ? "text-pink-700 font-semibold" :
                        key === "common_nouns" ? "text-gray-700" :
                        key === "prepositions" ? "text-yellow-700" :
                        ""
                      }>{display}{i < arr.length - 1 ? ', ' : ''}</span>
                    );
                  })}
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Highlighted success message */}
      {showSuccess && (
        <div className="mb-2 px-3 py-2 bg-green-500 text-white rounded shadow animate-fade-in-out font-semibold text-center text-xs">
          Summary request submitted! The summary will appear soon.
        </div>
      )}

      {status && (
        <div className={`text-xs mt-1 ${status === "submitted" ? "text-green-600" : "text-gray-500"}`}>{status}</div>
      )}

      {/* NBH Modal */}
      {showNbhModal && (
        <div className="mt-2 bg-white p-4 rounded shadow-lg border border-gray-200">
          <div className="mb-2 font-semibold text-base">Edit Node Neighborhood</div>
          <div className="mb-3">
            <div className="flex border-b mb-2">
              <button
                className={`flex-1 px-2 py-1 text-xs font-bold ${nbhTab===0 ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500'}`}
                onClick={()=>setNbhTab(0)}
              >Relations</button>
              <button
                className={`flex-1 px-2 py-1 text-xs font-bold ${nbhTab===1 ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500'}`}
                onClick={()=>setNbhTab(1)}
              >Attributes</button>
            </div>
            {nbhTab===0 ? (
              <RelationForm
                relationId={freshNode?.node_id || freshNode?.id}
                relationTypes={relationTypes}
                userId={userId}
                graphId={graphId}
                onAddRelationType={() => {}}
                onSuccess={async () => {
                  // Immediately refresh this node's data
                  const nodeId = freshNode?.node_id || freshNode?.id;
                  try {
                    if (!isTokenValid()) {
                      console.error("Token expired, cannot refresh node data");
                      return;
                    }
                    
                    const data = await refreshNodeData(userId, graphId, nodeId);
                    setFreshNode(data);
                    // Also trigger parent graph update
                    if (typeof onGraphUpdate === 'function') onGraphUpdate();
                  } catch (err) {
                    console.error('Failed to refresh node:', err);
                    // Don't fail silently, but don't break the UI
                  }
                }}
                morphId={activeMorphId}
              />
            ) : (
              <AttributeForm
                nodeId={freshNode?.node_id || freshNode?.id}
                attributeTypes={attributeTypes}
                userId={userId}
                graphId={graphId}
                onAddAttributeType={() => {}}
                initialData={{ id: generateRandomId() }}
                onSuccess={async () => {
                  // Immediately refresh this node's data
                  const nodeId = freshNode?.node_id || freshNode?.id;
                  try {
                    if (!isTokenValid()) {
                      console.error("Token expired, cannot refresh node data");
                      return;
                    }
                    
                    const data = await refreshNodeData(userId, graphId, nodeId);
                    setFreshNode(data);
                    // Also trigger parent graph update
                    if (typeof onGraphUpdate === 'function') onGraphUpdate();
                  } catch (err) {
                    console.error('Failed to refresh node:', err);
                    // Don't fail silently, but don't break the UI
                  }
                }}
                morphId={activeMorphId}
              />
            )}
          </div>
          {nbhSaveStatus && <div className="text-xs text-red-500 mb-2">{nbhSaveStatus}</div>}
          <div className="flex gap-2 justify-end">
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-xs" onClick={handleSaveNbh} disabled={nbhLoading}>Save</button>
            <button className="px-3 py-1 bg-gray-300 rounded text-xs" onClick={()=>setShowNbhModal(false)} disabled={nbhLoading}>Cancel</button>
          </div>
        </div>
      )}

      {/* Transition Form Modal */}
      {showTransitionForm && (
        <div className="mt-2 bg-white p-4 rounded shadow-lg border border-gray-200">
          <div className="mb-2 font-semibold text-base">Create Transition</div>
          <TransitionForm
            graphId={graphId}
            userId={userId}
            sourceNodeId={freshNode?.node_id || freshNode?.id}
            sourceNodeName={freshNode?.name}
            onSuccess={() => {
              setShowTransitionForm(false);
              if (typeof onGraphUpdate === 'function') onGraphUpdate();
            }}
            onCancel={() => setShowTransitionForm(false)}
          />
        </div>
      )}

      {/* Morph Form Modal */}
      {showMorphForm && (
        <div className="mt-2">
          <MorphForm
            morph={editingMorph}
            onSave={(morphData) => {
              if (editingMorph) {
                // Update existing morph - preserve existing morph_id and node_id
                const updatedMorph = {
                  ...morphData,
                  morph_id: editingMorph.morph_id || editingMorph.id,
                  node_id: editingMorph.node_id || (freshNode?.node_id || freshNode?.id)
                };
                const updatedMorphs = morphs.map(m => (m.morph_id || m.id) === (editingMorph.morph_id || editingMorph.id) ? updatedMorph : m);
                handleSaveMorphs(updatedMorphs);
              } else {
                // Add new morph - ensure it has the correct structure
                const newMorph = {
                  ...morphData,
                  morph_id: morphData.morph_id || morphData.id,
                  node_id: morphData.node_id || (freshNode?.node_id || freshNode?.id)
                };
                const updatedMorphs = [...morphs, newMorph];
                handleSaveMorphs(updatedMorphs);
              }
              setShowMorphForm(false);
              setEditingMorph(null);
            }}
            onCancel={() => {
              setShowMorphForm(false);
              setEditingMorph(null);
            }}
            nodeId={freshNode?.node_id || freshNode?.id}
            graphId={graphId}
            userId={userId}
            existingMorphs={morphs}
            onGraphUpdate={onGraphUpdate}
          />
        </div>
      )}

      {/* Delete button moved to bottom right */}
      <button
        className="absolute bottom-2 right-2 px-3 py-1 rounded text-xs font-semibold border bg-red-100 text-red-600 border-red-300 hover:bg-red-200"
        onClick={async () => {
          if (!confirm(`Are you sure you want to delete "${freshNode?.name || freshNode?.node_id}"? This will also delete all its relations and attributes.`)) {
            return;
          }
          setLoading(true);
          try {
            const token = localStorage.getItem("token");
            const res = await fetch(
              `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${freshNode?.node_id || freshNode?.id}`,
              { 
                method: "DELETE",
                headers: {
                  "Authorization": `Bearer ${token}`
                }
              }
            );
            if (res.ok) {
              if (onGraphUpdate) onGraphUpdate();
              // Show success message
              setShowSuccess(true);
              setTimeout(() => setShowSuccess(false), 2000);
            } else {
              const error = await res.json().catch(() => ({}));
              alert(`Failed to delete node: ${error.detail || res.statusText}`);
            }
          } catch (err) {
            alert(`Failed to delete node: ${err.message}`);
          } finally {
            setLoading(false);
          }
        }}
        disabled={loading}
        title="Delete Node"
      >
        [Delete Node]
      </button>
    </div>
  );
}

export default NodeCard;