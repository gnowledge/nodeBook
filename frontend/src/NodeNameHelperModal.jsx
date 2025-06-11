// DEPRECATED: This component is replaced by CNLHelperModal.jsx (multi-tab CNL Helper)
// Do not use in new code. Remove after migration is complete.

/**
 * NodeNameHelperModal - helps users construct node names with base, qualifier, and quantifier fields.
 * Difficulty levels:
 *   - easy: only base
 *   - medium: base + qualifier
 *   - advanced: base + qualifier + quantifier
 *
 * Props:
 *   - onNodeNameGenerated(nodeName: string): called with the constructed node name
 *   - onClose(): close the modal
 */
export default function NodeNameHelperModal({ onNodeNameGenerated, onClose, difficulty = "easy" }) {
  const [base, setBase] = useState("");
  const [qualifier, setQualifier] = useState("");
  const [quantifier, setQuantifier] = useState("");

  // Build node name and id preview (Markdown grouping)
  let nodeName = base.trim();
  let nodeId = base.trim().replace(/\s+/g, '_').toLowerCase();
  let preview = base.trim();
  if (difficulty === "medium" && qualifier.trim()) {
    preview = `**${qualifier.trim()}** ${base.trim()}`;
    nodeName = preview;
    nodeId = `${qualifier.trim().replace(/\s+/g, '_').toLowerCase()}_${base.trim().replace(/\s+/g, '_').toLowerCase()}`;
  }
  if (difficulty === "advanced") {
    if (qualifier.trim() && quantifier.trim()) {
      preview = `*${quantifier.trim()}* **${qualifier.trim()}** ${base.trim()}`;
      nodeName = preview;
      nodeId = `${quantifier.trim().replace(/\s+/g, '_').toLowerCase()}_${qualifier.trim().replace(/\s+/g, '_').toLowerCase()}_${base.trim().replace(/\s+/g, '_').toLowerCase()}`;
    } else if (quantifier.trim()) {
      preview = `*${quantifier.trim()}* ${base.trim()}`;
      nodeName = preview;
      nodeId = `${quantifier.trim().replace(/\s+/g, '_').toLowerCase()}_${base.trim().replace(/\s+/g, '_').toLowerCase()}`;
    } else if (qualifier.trim()) {
      preview = `**${qualifier.trim()}** ${base.trim()}`;
      nodeName = preview;
      nodeId = `${qualifier.trim().replace(/\s+/g, '_').toLowerCase()}_${base.trim().replace(/\s+/g, '_').toLowerCase()}`;
    }
  }

  // Determine which fields are enabled based on difficulty
  const isQualifierEnabled = ["medium", "advanced", "expert"].includes(difficulty);
  const isQuantifierEnabled = ["advanced", "expert"].includes(difficulty);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-6 w-[500px] max-w-full flex flex-col gap-4">
        <div className="font-bold text-lg mb-2">Node Name Helper</div>
        {/* Difficulty is set by user preferences and cannot be changed here */}
        {/* Three-column input row */}
        <div className="grid grid-cols-3 gap-3 items-end mb-2">
          {/* Quantifier */}
          <div className="flex flex-col">
            <label className="font-semibold text-xs mb-1 text-center">Quantifier</label>
            <select
              className="border rounded px-2 py-1 text-center"
              value={quantifier}
              onChange={e => setQuantifier(e.target.value)}
              disabled={!isQuantifierEnabled}
              tabIndex={isQuantifierEnabled ? 1 : -1}
            >
              <option value="">(none)</option>
              <option value="all">all</option>
              <option value="some">some</option>
              <option value="none">none</option>
              <option value="at most">at most</option>
              <option value="at least">at least</option>
            </select>
          </div>
          {/* Qualifier */}
          <div className="flex flex-col">
            <label className="font-semibold text-xs mb-1 text-center">Qualifier</label>
            <input
              className="border rounded px-2 py-1 text-center"
              value={qualifier}
              onChange={e => setQualifier(e.target.value)}
              placeholder="e.g. female"
              disabled={!isQualifierEnabled}
              tabIndex={isQualifierEnabled ? 2 : -1}
            />
          </div>
          {/* Base Name */}
          <div className="flex flex-col">
            <label className="font-semibold text-xs mb-1 text-center">Base Name<span className="text-red-500">*</span></label>
            <input
              className="border rounded px-2 py-1 text-center"
              value={base}
              onChange={e => setBase(e.target.value)}
              placeholder="e.g. mathematician"
              autoFocus
              tabIndex={3}
            />
          </div>
        </div>
        <div className="bg-gray-50 rounded p-2 mt-2 text-sm">
          <div><span className="font-semibold">Preview:</span> <span className="text-blue-700">{preview || <span className="text-gray-400">(node name)</span>}</span></div>
          <div><span className="font-semibold">Node ID:</span> <span className="text-green-700">{nodeId || <span className="text-gray-400">(node_id)</span>}</span></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
          <button
            onClick={() => { if (base.trim()) { onNodeNameGenerated(nodeName); onClose(); } }}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            disabled={!base.trim()}
          >Insert</button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          <div><b>Examples:</b></div>
          <div>Easy: <span className="italic">mathematician</span></div>
          <div>Medium: <span className="italic">**female** mathematician</span></div>
          <div>Advanced: <span className="italic">*all* mathematicians</span>, <span className="italic">*some* **female** mathematicians</span></div>
        </div>
      </div>
    </div>
  );
}
