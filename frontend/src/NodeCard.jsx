import React, { useState, useEffect } from "react";
import { marked } from "marked";
import { API_BASE } from "./config";
import RelationForm from "./RelationForm";
import AttributeForm from "./AttributeForm";
import RelationTypeModal from "./RelationTypeModal";
import AttributeTypeModal from "./AttributeTypeModal";

function NodeCard({ node, userId, graphId, onSummaryQueued }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [freshNode, setFreshNode] = useState(node);
  const [editing, setEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editRole, setEditRole] = useState("");
  const [showRelationForm, setShowRelationForm] = useState(false);
  const [showAttributeForm, setShowAttributeForm] = useState(false);
  const [editRelationIndex, setEditRelationIndex] = useState(null);
  const [editAttributeIndex, setEditAttributeIndex] = useState(null);
  const [nlpResult, setNlpResult] = useState(null);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [nlpError, setNlpError] = useState(null);

  // Always fetch the latest node data when node.id/node.node_id changes
  useEffect(() => {
    const nodeId = node.node_id || node.id;
    if (!nodeId) return;
    fetch(`${API_BASE}/api/users/${userId}/graphs/${graphId}/getInfo/${nodeId}`)
      .then(res => res.json())
      .then(data => setFreshNode(data))
      .catch(() => setFreshNode(node));
  }, [node.node_id, node.id, userId, graphId]);

  // Persist NLP result per node in sessionStorage
  const nodeKey = `nlpResult-${freshNode.node_id || freshNode.id}`;

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
  }, [freshNode.node_id, freshNode.id]);

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

  const handleNlpParse = async () => {
    setNlpLoading(true);
    setNlpError(null);
    setNlpResult(null);
    const nodeId = node.node_id || node.id;
    try {
      const res = await fetch(
        `${API_BASE}/api/users/${userId}/graphs/${graphId}/nodes/${nodeId}/nlp_parse_description`,
        { method: "POST" }
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
    }
  };

  // Fetch relationTypes from backend or context if available
  // For demo, use relationTypes from freshNode.relations if present
  const relationTypes = Array.from(new Set((freshNode.relations || []).map(r => ({ name: r.name }))));
  const attributeTypes = [];

  // Helper to generate a random id (8 chars)
  function generateRandomId() {
    return Math.random().toString(36).substr(2, 8);
  }

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
          {/* NLP Parse Button and Result */}
          {typeof freshNode.description === "string" && freshNode.description.trim() && !editing && (
            <div className="mb-2">
              <button
                className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs mr-2"
                onClick={handleNlpParse}
                disabled={nlpLoading}
              >
                {nlpLoading ? "Parsing..." : "NLP Parse"}
              </button>
              {nlpError && <span className="text-red-500 text-xs ml-2">{nlpError}</span>}
            </div>
          )}
          {/* Render NLP result if available */}
          {nlpResult && (
            <div className="mb-2 p-2 border rounded bg-gray-50">
              <div className="text-xs font-bold mb-1">NLP Parts of Speech:</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(nlpResult).map(([key, arr]) => (
                  arr.length > 0 && (
                    <div key={key}>
                      <span className="font-semibold capitalize mr-1">{key}:</span>
                      {arr.map((item, i) => (
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
                        }>{item}{i < arr.length - 1 ? ', ' : ''}</span>
                      ))}
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
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

      {/* Attributes section: show even if empty, with add button */}
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Attributes</h3>
          <button className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded ml-2" onClick={() => setShowAttributeForm(true)}>+ Add</button>
        </div>
        {freshNode.attributes?.length > 0 ? (
          <ul className="list-disc list-inside text-gray-800 text-sm">
            {freshNode.attributes.map((attr, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>
                  <span className="font-semibold">{attr.name || attr.attribute_name}:</span> {attr.value}
                  {attr.unit && ` (${attr.unit})`}
                </span>
                <button className="ml-2 text-xs text-blue-600 hover:underline" onClick={() => setEditAttributeIndex(i)}>Edit</button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-400 italic text-xs">No attributes yet.</div>
        )}
      </div>

      {/* Relations section: show even if empty, with add button */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Relations</h3>
          <button className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded ml-2" onClick={() => setShowRelationForm(true)}>+ Add</button>
        </div>
        {freshNode.relations?.length > 0 ? (
          <ul className="list-disc list-inside text-gray-800 text-sm">
            {freshNode.relations.map((rel, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>
                  {rel.adverb && (
                    <span className="text-purple-700 font-semibold mr-1">{rel.adverb}</span>
                  )}
                  <span className="text-blue-700 font-semibold">{rel.type || rel.name}</span>
                  {': '}
                  <a
                    href={"#node-" + (rel.target || rel.target_node_id)}
                    className="text-blue-600 underline hover:text-blue-900"
                    style={{ cursor: 'pointer' }}
                  >
                    <span dangerouslySetInnerHTML={{ __html: marked.parseInline(rel.target_name || rel.target) }} />
                  </a>
                </span>
                <button className="ml-2 text-xs text-blue-600 hover:underline" onClick={() => setEditRelationIndex(i)}>Edit</button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-400 italic text-xs">No relations yet.</div>
        )}
      </div>

      {showAttributeForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <AttributeForm
              nodeId={freshNode.node_id || freshNode.id}
              attributeTypes={attributeTypes}
              userId={userId}
              graphId={graphId}
              onAddAttributeType={() => {}}
              initialData={{ id: generateRandomId() }}
            />
            <button className="mt-2 px-3 py-1 bg-gray-300 rounded" onClick={() => setShowAttributeForm(false)}>Close</button>
          </div>
        </div>
      )}
      {editAttributeIndex !== null && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <AttributeForm
              nodeId={freshNode.node_id || freshNode.id}
              attributeTypes={attributeTypes}
              userId={userId}
              graphId={graphId}
              onAddAttributeType={() => {}}
              // Optionally pass initialData for editing
            />
            <button className="mt-2 px-3 py-1 bg-gray-300 rounded" onClick={() => setEditAttributeIndex(null)}>Close</button>
          </div>
        </div>
      )}

      {showRelationForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <RelationForm
              nodeId={freshNode.node_id || freshNode.id}
              relationTypes={relationTypes}
              userId={userId}
              graphId={graphId}
              onAddRelationType={() => {}}
              onSuccess={() => {
                setShowRelationForm(false);
                // Reload this node only
                const nodeId = freshNode.node_id || freshNode.id;
                fetch(`${API_BASE}/api/users/${userId}/graphs/${graphId}/getInfo/${nodeId}`)
                  .then(res => res.json())
                  .then(data => setFreshNode(data));
              }}
            />
            <button className="mt-2 px-3 py-1 bg-gray-300 rounded" onClick={() => setShowRelationForm(false)}>Close</button>
          </div>
        </div>
      )}
      {editRelationIndex !== null && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <RelationForm
              nodeId={freshNode.node_id || freshNode.id}
              relationTypes={relationTypes}
              userId={userId}
              graphId={graphId}
              onAddRelationType={() => {}}
              initialData={freshNode.relations[editRelationIndex]}
              editMode={true}
            />
            <button className="mt-2 px-3 py-1 bg-gray-300 rounded" onClick={() => setEditRelationIndex(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NodeCard;
