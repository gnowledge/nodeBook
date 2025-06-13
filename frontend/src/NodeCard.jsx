import React, { useState, useEffect } from "react";
import { marked } from "marked";
import { API_BASE } from "./config";

function NodeCard({ node, userId, graphId, onSummaryQueued }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [freshNode, setFreshNode] = useState(node);
  const [editing, setEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editRole, setEditRole] = useState("");

  // Always fetch the latest node data when node.id/node.node_id changes
  useEffect(() => {
    const nodeId = node.node_id || node.id;
    if (!nodeId) return;
    fetch(`${API_BASE}/api/users/${userId}/graphs/${graphId}/getInfo/${nodeId}`)
      .then(res => res.json())
      .then(data => setFreshNode(data))
      .catch(() => setFreshNode(node));
  }, [node.node_id, node.id, userId, graphId]);

  const handleQueueSummary = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/users/${userId}/graphs/${graphId}/nodes/${node.node_id || node.id}/submit_to_summary_queue`,
        { method: "POST" }
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
    const nodeId = node.node_id || node.id;
    if (!nodeId) return;
    setLoading(true);
    setStatus(null);
    try {
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
        `${API_BASE}/api/users/${userId}/graphs/${graphId}/nodes/${nodeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
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

  const handleEdit = () => {
    setEditDescription(freshNode.description || "");
    setEditRole(freshNode.role || "");
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditDescription("");
    setEditRole("");
  };

  const handleSaveEdit = async () => {
    const nodeId = node.node_id || node.id;
    if (!nodeId) return;
    setLoading(true);
    setStatus(null);
    try {
      const { name, qualifier, attributes, relations, role } = freshNode;
      // Map attributes to backend schema
      const mappedAttributes = (attributes || []).map(attr => ({
        name: attr.attribute_name || attr.name || "",
        value: attr.value,
        quantifier: attr.quantifier,
        modality: attr.modality
        // unit is not in backend model, so omit
      }));
      // Map relations to backend schema
      const mappedRelations = (relations || []).map(rel => ({
        name: rel.name,
        target: rel.target || rel.target_name || "",
        subject_quantifier: rel.subject_quantifier || rel.target_qualifier || undefined,
        object_quantifier: rel.object_quantifier || rel.target_quantifier || undefined,
        modality: rel.modality
        // adverb is not in backend model, so omit
      }));
      // Only include qualifier if non-empty and not just whitespace
      const trimmedQualifier = (qualifier || "").trim();
      const payload = {
        id: freshNode.id || nodeId,
        name,
        base_name: freshNode.base_name || undefined,
        ...(trimmedQualifier ? { qualifier: trimmedQualifier } : {}),
        role: editRole,
        description: editDescription,
        attributes: mappedAttributes,
        relations: mappedRelations,
      };
      const res = await fetch(
        `${API_BASE}/api/users/${userId}/graphs/${graphId}/nodes/${nodeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );
      if (res.ok) {
        setFreshNode({ ...freshNode, description: editDescription, role: editRole });
        setStatus("saved");
        setEditing(false);
      } else {
        setStatus("error saving");
      }
    } catch (err) {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id={"node-" + (freshNode.node_id || freshNode.id)} className="border border-gray-300 rounded-lg shadow-sm p-4 bg-white">
      <h2 className="text-lg font-semibold text-blue-700 mb-1">
        <span dangerouslySetInnerHTML={{ __html: marked.parseInline(freshNode.name || freshNode.node_id) }} />
      </h2>
      {/* In-place edit UI for description and role */}
      {editing ? (
        <div className="mb-2">
          <textarea
            className="w-full border rounded p-1 text-sm mb-2"
            rows={3}
            value={editDescription}
            onChange={e => setEditDescription(e.target.value)}
            placeholder="Enter node description..."
            disabled={loading}
          />
          <div className="mb-2">
            <label className="text-xs font-semibold mr-2">Role:</label>
            <select
              className="border rounded p-1 text-sm"
              value={editRole}
              onChange={e => setEditRole(e.target.value)}
              disabled={loading}
            >
              <option value="">(none)</option>
              <option value="class">class</option>
              <option value="individual">individual</option>
              <option value="process">process</option>
            </select>
          </div>
          <button
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs mr-2"
            onClick={handleSaveEdit}
            disabled={loading}
          >
            Save
          </button>
          <button
            className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-xs"
            onClick={handleCancelEdit}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          {freshNode.description && <p className="mb-2 text-gray-700 text-sm">{freshNode.description}</p>}
          <div className="mb-2 text-xs text-gray-500">
            <span className="font-semibold">Role:</span> {freshNode.role || <span className="italic text-gray-400">(none)</span>}
          </div>
          <button
            className="px-3 py-1 mb-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-xs"
            onClick={handleEdit}
            disabled={loading}
          >
            Edit Description & Role
          </button>
        </>
      )}
      {/* Highlighted success message */}
      {showSuccess && (
        <div className="mb-2 px-3 py-2 bg-green-500 text-white rounded shadow animate-fade-in-out font-semibold text-center">
          Summary request submitted! The summary will appear soon.
        </div>
      )}
      {/* Summary queue button */}
      {(!freshNode.description || freshNode.description === "") && !editing && (
        <button
          className="px-3 py-1 mb-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
          onClick={handleQueueSummary}
          disabled={loading}
        >
          {loading ? "Submitting..." : "Generate Summary"}
        </button>
      )}
      {status && (
        <div className={`text-xs mt-1 ${status === "submitted" ? "text-green-600" : "text-gray-500"}`}>{status}</div>
      )}

      {freshNode.attributes?.length > 0 && (
        <div className="mb-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Attributes</h3>
          <ul className="list-disc list-inside text-gray-800 text-sm">
            {freshNode.attributes.map((attr, i) => (
              <li key={i}>
                {attr.attribute_name ? (
                  <>
                    <span className="font-semibold">{attr.attribute_name}:</span> {attr.value}
                    {attr.unit && ` (${attr.unit})`}
                  </>
                ) : (
                  <>
                    {attr.value}
                    {attr.unit && ` (${attr.unit})`}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {freshNode.relations?.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Relations</h3>
          <ul className="list-disc list-inside text-gray-800 text-sm">
            {freshNode.relations.map((rel, i) => (
              <li key={i}>
                {rel.adverb && (
                  <span className="text-purple-700 font-semibold mr-1">{rel.adverb}</span>
                )}
                <span className="text-blue-700 font-semibold">{rel.name}</span>
                {': '}
                <a
                  href={"#node-" + (rel.target || rel.target_node_id)}
                  className="text-blue-600 underline hover:text-blue-900"
                  style={{ cursor: 'pointer' }}
                >
                  <span dangerouslySetInnerHTML={{ __html: marked.parseInline(rel.target_name || rel.target) }} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default NodeCard;
