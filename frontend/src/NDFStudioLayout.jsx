import React, { useState, useEffect } from "react";
import CytoscapeStudio from "./CytoscapeStudio";
import NDFStudioPanel from "./NDFStudioPanel";
import yaml from "js-yaml";
import { listGraphs, loadGraphCNL } from "./services/api";


const NDFStudioLayout = ({ userId = "user0" }) => {
  const [graphs, setGraphs] = useState([]);
  const [activeGraph, setActiveGraph] = useState(null);
  const [graphData, setGraphData] = useState(null);

  useEffect(() => {
    async function initTabs() {
      try {
        const graphIds = await listGraphs(userId);
        if (!graphIds || graphIds.length === 0) {
          console.warn("No graphs found.");
          return;
        }

        const defaultGraph = graphIds[0];
        const raw = await loadGraphCNL(userId, defaultGraph);
        const parsed = yaml.load(raw);
	  const fullGraph = {
	      ...parsed,
	      raw_markdown: raw,
	  };
	  
        setGraphs(graphIds);
        setActiveGraph(defaultGraph);
        setGraphData(fullGraph);
      } catch (err) {
        console.error("Error initializing tabs:", err);
      }
    }

    initTabs();
  }, [userId]);

 const handleAddGraph = async () => {
  const name = prompt("Enter a name for the new graph:");
  if (!name) return;

  const newId = name.trim().replace(/\s+/g, "_").toLowerCase();

  try {
    const res = await fetch(`/api/ndf/users/${userId}/graphs/${newId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: name,
        description: ""
      }),
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Server error: ${msg}`);
    }

      const rawMarkdown = await loadGraphCNL(userId, defaultGraph);
      setGraphData({ raw_markdown: rawMarkdown });

    setGraphs([...graphs, newId]);
    setActiveGraph(newId);
    setGraphData(parsed);
  } catch (err) {
    console.error("Failed to create graph:", err);
    alert("Failed to create graph. See console for details.");
  }
};

    
  const handleGraphUpdate = (updated) => {
    setGraphData(updated);
  };

 
  return (
    <div className="p-2 h-full flex flex-col">
      <div className="flex space-x-2 border-b pb-2">
        {graphs.map((id) => (
          <button
            key={id}
            onClick={() => setActiveGraph(id)}
            className={`px-4 py-1 rounded-t-md ${
              activeGraph === id ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            {id}
          </button>
        ))}
        <button
          onClick={handleAddGraph}
          className="px-3 py-1 rounded bg-green-500 text-white"
        >
          +
        </button>
      </div>

      <div className="flex flex-1 border border-gray-300 rounded-b-md">
        <div className="w-1/2 border-r overflow-auto">
          <NDFStudioPanel
            userId={userId}
            graphId={activeGraph}
            graph={graphData}
            onGraphUpdate={handleGraphUpdate}
          />
        </div>
        <div className="w-1/2 overflow-auto">
          <CytoscapeStudio graph={graphData} />
        </div>
      </div>
    </div>
  );
};

export default NDFStudioLayout;
