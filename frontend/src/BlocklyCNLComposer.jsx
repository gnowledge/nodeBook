import React from "react";

/**
 * BlocklyCNLComposer (placeholder): Visual CNL Composer is temporarily disabled.
 * Props:
 *   - onClose: function() called when user closes the composer
 */
export default function BlocklyCNLComposer({ onCNLGenerated, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-4 w-[500px] max-w-full flex flex-col items-center">
        <div className="font-bold text-lg mb-2">Visual CNL Composer (Temporarily Disabled)</div>
        <div className="text-gray-600 mb-4 text-center">
          The visual CNL composer is currently disabled.<br />
          We are working on a simpler, more robust CNL helper experience.<br />
          Please use the CNL editor directly for now.
        </div>
        <button onClick={onClose} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Close</button>
      </div>
    </div>
  );
}
