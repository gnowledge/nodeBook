import React, { useState } from "react";

// Helper for preview rendering (shared for all tabs)
function PreviewBox({ label, value }) {
  return (
    <div className="bg-gray-50 rounded p-2 mt-2 text-sm">
      <div><span className="font-semibold">Preview:</span> <span className="text-blue-700">{value || <span className="text-gray-400">({label})</span>}</span></div>
    </div>
  );
}

export default function CNLHelperModal({ onCNLGenerated, onClose, difficulty = "easy" }) {
  const [tab, setTab] = useState("node");

  // Node tab state
  const [base, setBase] = useState("");
  const [qualifier, setQualifier] = useState("");
  const [quantifier, setQuantifier] = useState("");

  // Relation tab state
  const [relation, setRelation] = useState("");
  const [relTarget, setRelTarget] = useState("");
  const [relTargetQualifier, setRelTargetQualifier] = useState("");
  const [relTargetQuantifier, setRelTargetQuantifier] = useState("");
  const [relAdverb, setRelAdverb] = useState("");
  const [relModality, setRelModality] = useState("");

  // Attribute tab state
  const [attribute, setAttribute] = useState("");
  const [attrValue, setAttrValue] = useState("");
  const [attrAdverb, setAttrAdverb] = useState("");
  const [attrUnit, setAttrUnit] = useState("");
  const [attrModality, setAttrModality] = useState("");

  // Difficulty logic
  const isQualifierEnabled = ["medium", "advanced", "expert"].includes(difficulty);
  const isQuantifierEnabled = ["advanced", "expert"].includes(difficulty);
  const isAdverbEnabled = ["expert"].includes(difficulty);
  const isModalityEnabled = ["expert"].includes(difficulty);

  // Node preview
  let nodePreview = base.trim();
  if (isQualifierEnabled && qualifier.trim()) nodePreview = `**${qualifier.trim()}** ${base.trim()}`;
  if (isQuantifierEnabled && quantifier.trim()) nodePreview = `*${quantifier.trim()}* ${nodePreview}`;

  // Relation preview (target node can have qualifier/quantifier)
  let relTargetStr = relTarget.trim();
  if (isQualifierEnabled && relTargetQualifier.trim()) relTargetStr = `**${relTargetQualifier.trim()}** ${relTargetStr}`;
  if (isQuantifierEnabled && relTargetQuantifier.trim()) relTargetStr = `*${relTargetQuantifier.trim()}* ${relTargetStr}`;
  let relPreview = "";
  if (isAdverbEnabled && relAdverb.trim()) relPreview += `++${relAdverb.trim()}++ `;
  relPreview += relation ? `<${relation.trim()}> ` : "";
  relPreview += relTargetStr;
  if (isModalityEnabled && relModality.trim()) relPreview += ` [${relModality.trim()}]`;

  // Attribute preview (no qualifier/quantifier)
  let attrPreview = `has ${attribute.trim()}: `;
  if (isAdverbEnabled && attrAdverb.trim()) attrPreview += `++${attrAdverb.trim()}++ `;
  attrPreview += attrValue.trim();
  if (attrUnit.trim()) attrPreview += ` *${attrUnit.trim()}*`;
  if (isModalityEnabled && attrModality.trim()) attrPreview += ` [${attrModality.trim()}]`;

  // Handlers
  function handleInsert() {
    let result = "";
    if (tab === "node") result = nodePreview;
    if (tab === "relation") result = relPreview;
    if (tab === "attribute") result = attrPreview;
    if (result.trim()) {
      onCNLGenerated(result);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-6 w-[600px] max-w-full flex flex-col gap-4">
        <div className="font-bold text-lg mb-2">CNL Helper</div>
        <div className="flex gap-2 mb-4">
          <button className={`px-3 py-1 rounded ${tab === "node" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setTab("node")}>Node</button>
          <button className={`px-3 py-1 rounded ${tab === "relation" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setTab("relation")}>Relation</button>
          <button className={`px-3 py-1 rounded ${tab === "attribute" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setTab("attribute")}>Attribute</button>
        </div>
        {tab === "node" && (
          <>
            <div className="grid grid-cols-3 gap-3 items-end mb-2">
              <div className="flex flex-col">
                <label className="font-semibold text-xs mb-1 text-center">Quantifier</label>
                <input className="border rounded px-2 py-1 text-center" value={quantifier} onChange={e => setQuantifier(e.target.value)} disabled={!isQuantifierEnabled} placeholder="e.g. all" />
              </div>
              <div className="flex flex-col">
                <label className="font-semibold text-xs mb-1 text-center">Qualifier</label>
                <input className="border rounded px-2 py-1 text-center" value={qualifier} onChange={e => setQualifier(e.target.value)} disabled={!isQualifierEnabled} placeholder="e.g. female" />
              </div>
              <div className="flex flex-col">
                <label className="font-semibold text-xs mb-1 text-center">Base Name<span className="text-red-500">*</span></label>
                <input className="border rounded px-2 py-1 text-center" value={base} onChange={e => setBase(e.target.value)} placeholder="e.g. mathematician" autoFocus />
              </div>
            </div>
            <PreviewBox label="node name" value={nodePreview} />
          </>
        )}
        {tab === "relation" && (
          <>
            <div className="grid grid-cols-3 gap-3 items-end mb-2">
              <div className="flex flex-col">
                <label className="font-semibold text-xs mb-1 text-center">Adverb</label>
                <input className="border rounded px-2 py-1 text-center" value={relAdverb} onChange={e => setRelAdverb(e.target.value)} disabled={!isAdverbEnabled} placeholder="e.g. quickly" />
              </div>
              <div className="flex flex-col">
                <label className="font-semibold text-xs mb-1 text-center">Relation<span className="text-red-500">*</span></label>
                <input className="border rounded px-2 py-1 text-center" value={relation} onChange={e => setRelation(e.target.value)} placeholder="e.g. discovered" />
              </div>
              <div className="flex flex-col">
                <label className="font-semibold text-xs mb-1 text-center">Target Node<span className="text-red-500">*</span></label>
                <input className="border rounded px-2 py-1 text-center" value={relTarget} onChange={e => setRelTarget(e.target.value)} placeholder="e.g. natural selection" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 items-end mb-2">
              <div className="flex flex-col">
                <label className="font-semibold text-xs mb-1 text-center">Target Qualifier</label>
                <input className="border rounded px-2 py-1 text-center" value={relTargetQualifier} onChange={e => setRelTargetQualifier(e.target.value)} disabled={!isQualifierEnabled} placeholder="e.g. Darwinian" />
              </div>
              <div className="flex flex-col">
                <label className="font-semibold text-xs mb-1 text-center">Target Quantifier</label>
                <input className="border rounded px-2 py-1 text-center" value={relTargetQuantifier} onChange={e => setRelTargetQuantifier(e.target.value)} disabled={!isQuantifierEnabled} placeholder="e.g. all" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 items-end mb-2">
              <div className="flex flex-col">
                <label className="font-semibold text-xs mb-1 text-center">Modality</label>
                <input className="border rounded px-2 py-1 text-center" value={relModality} onChange={e => setRelModality(e.target.value)} disabled={!isModalityEnabled} placeholder="e.g. probably" />
              </div>
            </div>
            <PreviewBox label="relation" value={relPreview} />
          </>
        )}
        {tab === "attribute" && (
          <>
            <div className="grid grid-cols-3 gap-3 items-end mb-2">
              <div className="flex flex-col">
                <label className="font-semibold text-xs mb-1 text-center">Adverb</label>
                <input className="border rounded px-2 py-1 text-center" value={attrAdverb} onChange={e => setAttrAdverb(e.target.value)} disabled={!isAdverbEnabled} placeholder="e.g. rapidly" />
              </div>
              <div className="flex flex-col">
                <label className="font-semibold text-xs mb-1 text-center">Attribute<span className="text-red-500">*</span></label>
                <input className="border rounded px-2 py-1 text-center" value={attribute} onChange={e => setAttribute(e.target.value)} placeholder="e.g. size" />
              </div>
              <div className="flex flex-col">
                <label className="font-semibold text-xs mb-1 text-center">Value<span className="text-red-500">*</span></label>
                <input className="border rounded px-2 py-1 text-center" value={attrValue} onChange={e => setAttrValue(e.target.value)} placeholder="e.g. 50" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 items-end mb-2">
              <div className="flex flex-col">
                <label className="font-semibold text-xs mb-1 text-center">Unit</label>
                <input className="border rounded px-2 py-1 text-center" value={attrUnit} onChange={e => setAttrUnit(e.target.value)} placeholder="e.g. microns" />
              </div>
              <div className="flex flex-col">
                <label className="font-semibold text-xs mb-1 text-center">Modality</label>
                <input className="border rounded px-2 py-1 text-center" value={attrModality} onChange={e => setAttrModality(e.target.value)} disabled={!isModalityEnabled} placeholder="e.g. uncertain" />
              </div>
            </div>
            <PreviewBox label="attribute" value={attrPreview} />
          </>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
          <button onClick={handleInsert} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" disabled={tab === "node" ? !base.trim() : tab === "relation" ? !(relation.trim() && relTarget.trim()) : !(attribute.trim() && attrValue.trim())}>Insert</button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          <div><b>Examples:</b></div>
          {tab === "node" && <>
            <div>Easy: <span className="italic">mathematician</span></div>
            <div>Medium: <span className="italic">**female** mathematician</span></div>
            <div>Advanced: <span className="italic">*all* mathematicians</span></div>
            <div>Expert: <span className="italic">*some* **ancient** philosophers</span></div>
          </>}
          {tab === "relation" && <>
            <div>Easy: <span className="italic">&lt;discovered&gt; natural selection</span></div>
            <div>Medium: <span className="italic">&lt;discovered&gt; **Darwinian** theory</span></div>
            <div>Advanced: <span className="italic">&lt;discovered&gt; *all* theories</span></div>
            <div>Expert: <span className="italic">++rapidly++ &lt;spreads&gt; *some* **ancient** philosophers [possibly]</span></div>
          </>}
          {tab === "attribute" && <>
            <div>Easy: <span className="italic">has size: 50 *microns*</span></div>
            <div>Expert: <span className="italic">has growth_rate: ++rapidly++ 5 *cm/year* [uncertain]</span></div>
          </>}
        </div>
      </div>
    </div>
  );
}
