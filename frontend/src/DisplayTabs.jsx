import React, { useState } from 'react';
import CytoscapeStudio from './CytoscapeStudio';
import DisplayHTML from './DisplayHTML'; // Viewer-friendly rendering of cnl.md

export default function DisplayTabs({ userId, graphId, graph}) {
  const [tab, setTab] = useState('graph');

  return (
    <div className="h-full flex flex-col">
      {/* Tab Switch */}
      <div className="flex border-b mb-2 space-x-2">
        <button
          className={`px-4 py-2 rounded-t ${tab === 'graph' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setTab('graph')}
        >
          Graph View
        </button>
        <button
          className={`px-4 py-2 rounded-t ${tab === 'html' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setTab('html')}
        >
          Document View
        </button>
      </div>

      {/* Viewport */}
      <div className="flex-1 overflow-auto border p-4 rounded-b bg-white">
        {tab === 'graph' ? (
            <CytoscapeStudio userId={userId} graphId={graphId} graph={graph}/>
        ) : (
          <DisplayHTML userId={userId} graphId={graphId} />
        )}
      </div>
    </div>
  );
}
