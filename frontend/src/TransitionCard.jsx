import React, { useState } from "react";
import { marked } from "marked";
import { API_BASE } from "./config";
import { useUserInfo } from "./UserIdContext";

function TransitionCard({ transition, userId, graphId, onGraphUpdate, availableNodes = [] }) {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDescription, setEditDescription] = useState(transition?.description || "");

  // Helper to get node name by ID
  const getNodeName = (nodeId) => {
    const node = availableNodes.find(n => (n.id || n.node_id) === nodeId);
    return node?.name || nodeId;
  };

  // Helper to get morph name by morph_id
  const getMorphName = (nodeId, morphId) => {
    const node = availableNodes.find(n => (n.id || n.node_id) === nodeId);
    if (!node?.morphs) return "Basic Morph";
    
    const morph = node.morphs.find(m => m.morph_id === morphId);
    if (!morph) return "Basic Morph";
    
    // If it's the first morph, it's the basic morph
    const isBasicMorph = node.morphs.indexOf(morph) === 0;
    return isBasicMorph ? "Basic Morph" : (morph.name || `Morph ${node.morphs.indexOf(morph)}`);
  };

  // Helper to generate transition label
  const getTransitionLabel = () => {
    let label = transition.name || transition.id;
    if (transition.adjective) {
      label = `${transition.adjective} ${label}`;
    }
    return label;
  };

  // Handle description editing
  const handleEdit = () => {
    setEditDescription(transition?.description || "");
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditDescription(transition?.description || "");
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const updatedTransition = { ...transition, description: editDescription };
      const res = await fetch(
        `${API_BASE}/api/ndf/users/${userId}/transitions/${transition.id}`,
        {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(updatedTransition)
        }
      );
      if (res.ok) {
        setEditing(false);
        if (onGraphUpdate) onGraphUpdate();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1200);
      }
    } catch (err) {
      console.error("Failed to save transition:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle transition deletion
  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete the transition "${getTransitionLabel()}"?`)) {
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/api/ndf/users/${userId}/transitions/${transition.id}`,
        { 
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );
      if (res.ok) {
        if (onGraphUpdate) onGraphUpdate();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        const error = await res.json().catch(() => ({}));
        alert(`Failed to delete transition: ${error.detail || res.statusText}`);
      }
    } catch (err) {
      alert(`Failed to delete transition: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-blue-300 rounded-lg shadow-sm p-4 bg-blue-50 relative">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
            <span className="text-blue-600">⚡</span>
            <span dangerouslySetInnerHTML={{ __html: marked.parseInline(getTransitionLabel()) }} />
            <span className="text-xs text-blue-600 font-normal">
              ({transition.tense || 'present'})
            </span>
          </h3>
          <p className="text-sm text-blue-600 mt-1">
            ID: {transition.id}
          </p>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-1">
          <button
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            onClick={handleEdit}
            disabled={loading}
            title="Edit description"
          >
            Edit
          </button>
          <button
            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
            onClick={handleDelete}
            disabled={loading}
            title="Delete transition"
          >
            ×
          </button>
        </div>
      </div>

      {/* Description */}
      {transition.description && !editing && (
        <div className="mb-3">
          <div className="prose prose-sm bg-white p-2 rounded border" 
               dangerouslySetInnerHTML={{ __html: marked.parse(transition.description) }} />
        </div>
      )}

      {/* Edit description form */}
      {editing && (
        <div className="mb-3">
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Describe the transition process..."
          />
          <div className="flex gap-2 mt-2">
            <button 
              className="bg-blue-600 text-white px-3 py-1 rounded text-xs" 
              onClick={handleSaveEdit} 
              disabled={loading}
            >
              Save
            </button>
            <button 
              className="bg-gray-300 px-3 py-1 rounded text-xs" 
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Input/Output mapping */}
      <div className="space-y-3">
        {/* Inputs */}
        <div>
          <h4 className="font-semibold text-sm text-blue-700 mb-2">Inputs:</h4>
          <div className="space-y-1">
            {transition.inputs?.map((input, index) => (
              <div key={index} className="flex items-center gap-2 text-sm bg-white p-2 rounded border">
                <span className="text-blue-600">→</span>
                <span className="font-medium">{getNodeName(input.id)}</span>
                <span className="text-gray-500">({getMorphName(input.id, input.nbh)})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Outputs */}
        <div>
          <h4 className="font-semibold text-sm text-green-700 mb-2">Outputs:</h4>
          <div className="space-y-1">
            {transition.outputs?.map((output, index) => (
              <div key={index} className="flex items-center gap-2 text-sm bg-white p-2 rounded border">
                <span className="text-green-600">←</span>
                <span className="font-medium">{getNodeName(output.id)}</span>
                <span className="text-gray-500">({getMorphName(output.id, output.nbh)})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Success message */}
      {showSuccess && (
        <div className="mt-3 px-3 py-2 bg-green-500 text-white rounded shadow animate-fade-in-out font-semibold text-center text-xs">
          Transition updated successfully!
        </div>
      )}
    </div>
  );
}

export default TransitionCard; 