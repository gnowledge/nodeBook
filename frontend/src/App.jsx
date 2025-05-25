import React, { useState, useEffect } from 'react';
import CytoscapeStudio from './CytoscapeStudio';
import { createGraphFolder, listGraphs } from './services/api';

function App() {
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);

  // Load all existing graphs from backend
useEffect(() => {
  async function loadGraphs() {
    try {
      const graphList = await listGraphs();
      const tabData = graphList.map(name => ({
        id: name.toLowerCase().replace(/\s+/g, "_"),
        name
      }));
      setTabs(tabData);
      if (tabData.length > 0) {
        setActiveTab(tabData[0].id);
      }
    } catch (err) {
      console.error("Failed to load graphs:", err.message);
    }
  }
  loadGraphs();
}, []);


  const handleAddTab = async () => {
    const graphName = prompt("Enter new graph name:");
    if (!graphName) return;
    const normalized = graphName.toLowerCase().replace(/\s+/g, "_");

    try {
      await createGraphFolder(normalized);
      const newTab = { id: normalized, name: graphName };
      setTabs([...tabs, newTab]);
      setActiveTab(normalized);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="p-4">
      <div className="flex space-x-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded border transition-all duration-150 ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white border-blue-700 font-bold shadow'
                : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-blue-100'
            }`}
            style={{
              outline: activeTab === tab.id ? '2px solid #2563eb' : 'none',
              outlineOffset: activeTab === tab.id ? '2px' : '0'
            }}
          >
            {tab.name}
          </button>
        ))}
        <button
          onClick={handleAddTab}
          className="px-4 py-2 rounded bg-green-400 text-white font-bold"
        >
          +
        </button>
      </div>

      {tabs.map((tab) =>
        tab.id === activeTab ? (
          <CytoscapeStudio key={tab.id} graphId={tab.id} />
        ) : null
      )}
    </div>
  );
}

export default App;
