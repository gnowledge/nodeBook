import React, { useState, useEffect } from "react";
import CytoscapeStudio from "./CytoscapeStudio";
import NDFStudioPanel from "./NDFStudioPanel";
import yaml from "js-yaml";

const TabbedGraphEditor = ({ userId = "user0", initialGraphs = ["graph1"] }) => {
  const [tabs, setTabs] = useState(initialGraphs.map((id) => ({ id, name: id })));
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [graphData, setGraphData] = useState(null);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const res = await fetch(`/api/ndf/users/${userId}/graphs/${activeTab}`);
        const text = await res.text();
        const parsed = yaml.load(text);
        setGraphData(parsed);
      } catch (err) {
        console.error("Failed to load graph:", err);
      }
    };

    fetchGraph();
  }, [userId, activeTab]);

  const handleAddTab = () => {
    const newId = `graph${tabs.length + 1}`;
    setTabs([...tabs, { id: newId, name: newId }]);
    setActiveTab(newId);
  };

  const handleGraphUpdate = (updatedGraph) => {
    setGraphData(updatedGraph);
  };

  return (
    <div className="p-2 h-full flex flex-col">
      <div className="flex space-x-2 border-b pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1 rounded-t-md ${
              activeTab === tab.id ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            {tab.name}
          </button>
        ))}
        <button
          onClick={handleAddTab}
          className="px-3 py-1 rounded bg-green-500 text-white"
        >
          +
        </button>
      </div>

      <div className="flex flex-1 border border-gray-300 rounded-b-md">
        <div className="w-1/2 border-r overflow-auto">
          <NDFStudioPanel
              userId={userId}
              graphId={activeTab}
	      graphData={currentGraphData}
	      onGraphUpdate={(newYaml) => setCurrentGraphData(newYaml)
              graph={graphData}
	     onGraphUpdate={handleGraphUpdate}
          />
        </div>
        <div className="w-1/2 overflow-auto">
          <CytoscapeStudio graphData={currentGraphData} graph={graphData} />
        </div>
      </div>
    </div>
  );
};

export default TabbedGraphEditor;
