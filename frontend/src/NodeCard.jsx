import React, { useState, useEffect } from "react";
import { marked } from "marked";
import { API_BASE } from "./config";
import RelationForm from "./RelationForm";
import AttributeForm from "./AttributeForm";
import RelationTypeModal from "./RelationTypeModal";
import { useUserId } from "./UserIdContext";
import MonacoEditor from '@monaco-editor/react';

function NodeCard({ node, graphId, onSummaryQueued, onGraphUpdate, graphRelations = [], graphAttributes = [] }) {
  const userId = useUserId();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [freshNode, setFreshNode] = useState(node);
  const [editing, setEditing] = useState(false);
  const [editDescription, setEditDescription] = useState(node?.description || "");
  const [editRole, setEditRole] = useState("");
  const [showRelationForm, setShowRelationForm] = useState(false);
  const [showAttributeForm, setShowAttributeForm] = useState(false);
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

  // Always fetch the latest node data when node.id/node.node_id changes
  useEffect(() => {
    const nodeId = node?.node_id || node?.id;
    if (!nodeId) return;
    fetch(`${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/getInfo/${nodeId}`)
      .then(res => res.json())
      .then(data => setFreshNode(data))
      .catch(() => setFreshNode(node));
  }, [node?.node_id, node?.id, userId, graphId]);

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

  const handleQueueSummary = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${freshNode?.node_id || freshNode?.id}/submit_to_summary_queue`,
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
    const nodeId = freshNode?.node_id || freshNode?.id;
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
        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${nodeId}`,
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
      // Save the updated description to backend
      const updatedNode = { ...freshNode, description: editDescription };
      const res = await fetch(
        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${updatedNode.node_id || updatedNode.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
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

  // Handler to run enhanced NLP parse
  const handleNlpParse = async () => {
    setNlpLoading(true);
    setNlpError(null);
    setNlpResult(null);
    setBasicNlpResult(null);
    const nodeId = freshNode?.node_id || freshNode?.id;
    try {
      const res = await fetch(
        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${nodeId}/nlp_parse_description`,
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
      const res = await fetch(
        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${nodeId}/nlp_parse_description?mode=basic`,
        { method: "POST" }
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
    const nodeId = freshNode?.node_id || freshNode?.id;
    try {
      const updatedNode = {
        ...freshNode,
        relations: editRelations,
        attributes: editAttributes
      };
      const res = await fetch(
        `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${nodeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedNode)
        }
      );
      if (res.ok) {
        setFreshNode(updatedNode);
        setShowNbhModal(false);
        if (onGraphUpdate) onGraphUpdate();
      } else {
        setNbhSaveStatus("Error saving neighborhood");
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

  // Guard clause to prevent rendering when freshNode is null/undefined
  if (!freshNode) {
    return <div className="border border-gray-300 rounded-lg shadow-sm p-4 bg-white">
      <div className="text-gray-500">Loading node...</div>
    </div>;
  }

  const hasDescription = freshNode?.description && freshNode.description.trim() !== "";

  return (
    <div id={"node-" + (freshNode?.node_id || freshNode?.id)} className="border border-gray-300 rounded-lg shadow-sm p-4 bg-white relative">
      <div className="flex justify-between items-start mb-2">
        <h2 className="text-lg font-semibold text-blue-700">
          <span dangerouslySetInnerHTML={{ __html: marked.parseInline(freshNode?.name || freshNode?.node_id || '') }} />
        </h2>
        {/* Role selector as compact button group */}
        <div className="flex gap-1">
          {["individual", "class", "process"].map(option => (
            <button
              key={option}
              className={`px-2 py-0.5 rounded text-xs font-semibold border ${freshNode?.role === option ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-blue-100"}`}
              style={{ minWidth: 0 }}
              onClick={async () => {
                if (freshNode?.role === option) return;
                setLoading(true);
                try {
                  const updatedNode = { ...freshNode, role: option };
                  const res = await fetch(
                    `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${updatedNode.node_id || updatedNode.id}`,
                    {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
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
        </div>
      </div>

      {/* Description section - only show if there's content or we're editing */}
      {(hasDescription || editing) && (
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">Description:</span>
            <button className="text-blue-600 underline text-xs" onClick={handleEdit}>Edit</button>
            {hasDescription && (
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
      )}

      {/* Generate Summary button - only show if no description */}
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
            <button
              className="w-full mb-2 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs"
              onClick={() => { setParseMode('enhanced'); handleNlpParse(); }}
              disabled={nlpLoading}
            >
              Enhanced
            </button>
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
                      {pair.attribute !== undefined && pair.attribute !== null
                        ? String(pair.attribute)
                        : "(unknown)"}
                    </span>
                    :{" "}
                    <span>
                      {Array.isArray(pair.value)
                        ? pair.value.map((v, idx) =>
                            v !== undefined && v !== null
                              ? <span key={idx}>{String(v)}{idx < pair.value.length - 1 ? ", " : ""}</span>
                              : <span key={idx}>(unknown){idx < pair.value.length - 1 ? ", " : ""}</span>
                          )
                        : pair.value !== undefined && pair.value !== null
                        ? String(pair.value)
                        : "(unknown)"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Named Entities (possible nodes) */}
          {nlpResult.entities && nlpResult.entities.length > 0 && (
            <div className="mb-1">
              <span className="font-semibold">Possible Nodes (Entities):</span>
              <ul className="ml-2 list-disc text-xs">
                {nlpResult.entities.map((ent, i) => (
                  <li key={i}>
                    <span className="text-blue-700 font-semibold">{ent.text}</span> <span className="text-gray-500">[{ent.label}]</span>
                    {/* TODO: Add button to create node if not exists */}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Prepositions/Connectives with frequency */}
          {((nlpResult.prepositions && nlpResult.prepositions.length > 0) || (nlpResult.connectives && nlpResult.connectives.length > 0)) && (
            <div className="mb-1">
              <span className="font-semibold">Prepositions/Connectives:</span>
              <ul className="ml-2 list-disc text-xs">
                {["prepositions", "connectives"].map(type => (
                  nlpResult[type] && nlpResult[type].length > 0 && (
                    <li key={type}>
                      <span className="capitalize">{type}:</span> {Object.entries(nlpResult[type].reduce((acc, w) => { acc[w] = (acc[w] || 0) + 1; return acc; }, {})).map(([w, n], i, arr) => (
                        <span key={w}>{w}{n > 1 ? ` (${n})` : ""}{i < arr.length - 1 ? ", " : ""}</span>
                      ))}
                    </li>
                  )
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

      {/* --- Node Neighborhood Section --- */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold">Node Neighborhood:</span>
          <button className="text-blue-600 underline text-xs" onClick={handleOpenNbhModal}>Edit NBH</button>
          {hasNBHContent && (
            <button 
              className="text-gray-600 underline text-xs" 
              onClick={() => setNbhViewMode(nbhViewMode === 'rendered' ? 'editor' : 'rendered')}
            >
              {nbhViewMode === 'rendered' ? 'View CNL' : 'View Rendered'}
            </button>
          )}
        </div>
        
        {/* Show NBH content based on toggle */}
        {hasNBHContent ? (
          nbhViewMode === 'editor' ? (
            <MonacoEditor
              height="80px"
              language="markdown"
              value={nbhCNL}
              options={{ readOnly: true, wordWrap: 'on', minimap: { enabled: false } }}
            />
          ) : (
            <div className="prose prose-sm bg-gray-50 p-2 rounded" dangerouslySetInnerHTML={{ __html: marked.parse(nbhMarkdown || '') }} />
          )
        ) : (
          <div className="prose prose-sm bg-gray-50 p-2 rounded text-gray-500 italic">
            No neighborhood info yet.
          </div>
        )}

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
                <div>
                  <RelationForm
                    nodeId={freshNode?.node_id || freshNode?.id}
                    relationTypes={relationTypes}
                    userId={userId}
                    graphId={graphId}
                    onAddRelationType={() => {}}
                    onSuccess={() => {
                      // Reload this node only
                      const nodeId = freshNode?.node_id || freshNode?.id;
                      fetch(`${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/getInfo/${nodeId}`)
                        .then(res => res.json())
                        .then(data => setFreshNode(data));
                      if (typeof onGraphUpdate === 'function') onGraphUpdate();
                    }}
                  />
                </div>
              ) : (
                <div>
                  <AttributeForm
                    nodeId={freshNode?.node_id || freshNode?.id}
                    attributeTypes={attributeTypes}
                    userId={userId}
                    graphId={graphId}
                    onAddAttributeType={() => {}}
                    initialData={{ id: generateRandomId() }}
                    onSuccess={() => {
                      // Reload this node only
                      const nodeId = freshNode?.node_id || freshNode?.id;
                      fetch(`${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/getInfo/${nodeId}`)
                        .then(res => res.json())
                        .then(data => setFreshNode(data));
                      if (typeof onGraphUpdate === 'function') onGraphUpdate();
                    }}
                  />
                </div>
              )}
            </div>
            {nbhSaveStatus && <div className="text-xs text-red-500 mb-2">{nbhSaveStatus}</div>}
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1 bg-blue-600 text-white rounded text-xs" onClick={handleSaveNbh} disabled={nbhLoading}>Save</button>
              <button className="px-3 py-1 bg-gray-300 rounded text-xs" onClick={()=>setShowNbhModal(false)} disabled={nbhLoading}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete button moved to bottom right */}
      <button
        className="absolute bottom-2 right-2 px-2 py-1 rounded text-xs font-semibold border bg-red-100 text-red-600 border-red-300 hover:bg-red-200"
        onClick={async () => {
          if (!confirm(`Are you sure you want to delete "${freshNode?.name || freshNode?.node_id}"? This will also delete all its relations and attributes.`)) {
            return;
          }
          setLoading(true);
          try {
            const res = await fetch(
              `${API_BASE}/api/ndf/users/${userId}/graphs/${graphId}/nodes/${freshNode?.node_id || freshNode?.id}`,
              { method: "DELETE" }
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
        ×
      </button>
    </div>
  );
}

export default NodeCard;
