import React, { useState, useEffect } from "react";
import { API_BASE } from "./config";
import { useUserId } from "./UserIdContext";

function TransitionForm({ graphId, onSuccess, onClose, onCancel, initialData = null, sourceNodeId = null, sourceNodeName = null }) {
  const userId = useUserId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableNodes, setAvailableNodes] = useState([]);
  
  const [formData, setFormData] = useState({
    id: initialData?.id || "",
    name: initialData?.name || "",
    adjective: initialData?.adjective || "",
    tense: initialData?.tense || "present",
    inputs: initialData?.inputs || (sourceNodeId ? [{ id: sourceNodeId, nbh: "" }] : []),
    outputs: initialData?.outputs || [],
    description: initialData?.description || ""
  });

  useEffect(() => {
    const loadNodes = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/polymorphic_composed`);
        if (response.ok) {
          const graphData = await response.json();
          setAvailableNodes(graphData.nodes || []);
        }
      } catch (err) {
        console.error("Failed to load nodes:", err);
      }
    };
    loadNodes();
  }, [userId, graphId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = initialData 
        ? `${API_BASE}/api/ndf/users/${userId}/transitions/${formData.id}`
        : `${API_BASE}/api/ndf/users/${userId}/transitions/`;
      
      const method = initialData ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to save transition");
      }

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addInput = () => {
    setFormData(prev => ({
      ...prev,
      inputs: [...prev.inputs, { id: "", nbh: "" }]
    }));
  };

  const removeInput = (index) => {
    setFormData(prev => ({
      ...prev,
      inputs: prev.inputs.filter((_, i) => i !== index)
    }));
  };

  const updateInput = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      inputs: prev.inputs.map((input, i) => 
        i === index ? { ...input, [field]: value } : input
      )
    }));
  };

  const addOutput = () => {
    setFormData(prev => ({
      ...prev,
      outputs: [...prev.outputs, { id: "", nbh: "" }]
    }));
  };

  const removeOutput = (index) => {
    setFormData(prev => ({
      ...prev,
      outputs: prev.outputs.filter((_, i) => i !== index)
    }));
  };

  const updateOutput = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      outputs: prev.outputs.map((output, i) => 
        i === index ? { ...output, [field]: value } : output
      )
    }));
  };

  const getNodeMorphs = (nodeId) => {
    const node = availableNodes.find(n => (n.id || n.node_id) === nodeId);
    return node?.morphs || [];
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg">
      <h2 className="text-lg font-bold mb-3">
        {initialData ? "Edit Transition" : "Create New Transition"}
      </h2>
      
      {sourceNodeName && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
          <span className="font-semibold">Source Node:</span> {sourceNodeName}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transition ID
            </label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., oxygen_ionization"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., ionization"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adjective
            </label>
            <input
              type="text"
              value={formData.adjective}
              onChange={(e) => setFormData(prev => ({ ...prev, adjective: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., rapid, slow"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tense
            </label>
            <select
              value={formData.tense}
              onChange={(e) => setFormData(prev => ({ ...prev, tense: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="past">Past</option>
              <option value="present">Present</option>
              <option value="future">Future</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Input Nodes
            </label>
            <button
              type="button"
              onClick={addInput}
              className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
            >
              + Add Input
            </button>
          </div>
          
          {formData.inputs.map((input, index) => (
            <div key={index} className="flex gap-2 mb-1">
              <select
                value={input.id}
                onChange={(e) => updateInput(index, "id", e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Node</option>
                {availableNodes.map(node => (
                  <option key={node.id || node.node_id} value={node.id || node.node_id}>
                    {node.name || node.base_name}
                  </option>
                ))}
              </select>
              
              <select
                value={input.nbh}
                onChange={(e) => updateInput(index, "nbh", e.target.value)}
                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Default</option>
                {getNodeMorphs(input.id).map(morph => (
                  <option key={morph.morph_id} value={morph.morph_id}>
                    {morph.name}
                  </option>
                ))}
              </select>
              
              <button
                type="button"
                onClick={() => removeInput(index)}
                className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Output Nodes
            </label>
            <button
              type="button"
              onClick={addOutput}
              className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
            >
              + Add Output
            </button>
          </div>
          
          {formData.outputs.map((output, index) => (
            <div key={index} className="flex gap-2 mb-1">
              <select
                value={output.id}
                onChange={(e) => updateOutput(index, "id", e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Node</option>
                {availableNodes.map(node => (
                  <option key={node.id || node.node_id} value={node.id || node.node_id}>
                    {node.name || node.base_name}
                  </option>
                ))}
              </select>
              
              <select
                value={output.nbh}
                onChange={(e) => updateOutput(index, "nbh", e.target.value)}
                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Default</option>
                {getNodeMorphs(output.id).map(morph => (
                  <option key={morph.morph_id} value={morph.morph_id}>
                    {morph.name}
                  </option>
                ))}
              </select>
              
              <button
                type="button"
                onClick={() => removeOutput(index)}
                className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="Describe the transition process..."
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <div className="flex justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onCancel || onClose}
            className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : (initialData ? "Update" : "Create")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TransitionForm;
