import React, { useState, useEffect } from "react";
import CytoscapeStudio from "./CytoscapeStudio";
import NDFStudioPanel from "./NDFStudioPanel";
import yaml from "js-yaml";

const NDFStudioLayout = ({ userId = "user0" }) => {
  const [graphs, setGraphs] = useState([]);
  const [activeGraph, setActiveGraph] = useState(null);
  const [graphData, setGraphData] = useState(null);

  useEffect(() => {
    const fetchGraphs = async () => {
      try {
        const res = await fetch(`/api/ndf/users/${userId}/graphs`);
        const data = await res.json();
        setGraphs(data);
        if (data.length > 0) {
          setActiveGraph(data[0]);
        }
      } catch (err) {
        console.error("Failed to list graphs:", err);
      }
    };

    fetchGraphs();
  }, [userId]);

  useEffect(() => {
    const fetchGraphData = async () => {
      if (!activeGraph) return;
      try {
        const res = await fetch(`/api/ndf/users/${userId}/graphs/${activeGraph}`);
        const text = await res.text();
        const parsed = yaml.load(text);
        setGraphData(parsed);
      } catch (err) {
        console.error("Failed to load graph:", err);
      }
    };

    fetchGraphData();
  }, [userId, activeGraph]);

  const handleGraphUpdate = (updated) => {
    setGraphData(updated);
  };

  const handleAddGraph = () => {
    const newId = `graph${graphs.length + 1}`;
    setGraphs([...graphs, newId]);
    setActiveGraph(newId);
    setGraphData(null); // Reset editor
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
