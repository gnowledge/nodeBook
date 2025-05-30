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

      {/* Resizable split layout */}
      <ResizableSplitPanel
        left={
          <NDFStudioPanel
            userId={userId}
            graphId={activeGraph}
            graph={graphData}
            onGraphUpdate={handleGraphUpdate}
          />
        }
        right={
          <CytoscapeStudio
            userId={userId}
            graphId={activeGraph}
            graph={graphData}
          />
        }
      />
    </div>
  );
};

// Add a simple resizable split panel component
function ResizableSplitPanel({ left, right, minLeft = 200, minRight = 200, initial = 0.5 }) {
  const containerRef = React.useRef(null);
  const [ratio, setRatio] = React.useState(initial);
  const [dragging, setDragging] = React.useState(false);

  React.useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newRatio = (e.clientX - rect.left) / rect.width;
      newRatio = Math.max(minLeft / rect.width, Math.min(1 - minRight / rect.width, newRatio));
      setRatio(newRatio);
    };
    const onMouseUp = () => setDragging(false);
    if (dragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging, minLeft, minRight]);

  return (
    <div ref={containerRef} className="flex flex-1 border border-gray-300 rounded-b-md relative" style={{ minHeight: 0 }}>
      <div style={{ width: `${ratio * 100}%`, minWidth: minLeft, overflow: "auto" }}>
        {left}
      </div>
      <div
        style={{
          width: 6,
          cursor: "col-resize",
          background: "#e0e0e0",
          zIndex: 10,
          userSelect: "none"
        }}
        onMouseDown={() => setDragging(true)}
      />
      <div style={{ flex: 1, minWidth: minRight, overflow: "auto" }}>
        {right}
      </div>
    </div>
  );
}

export default NDFStudioLayout;
