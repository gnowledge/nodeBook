import React, { useState, useEffect } from "react";
import DisplayTabs from "./DisplayTabs";
import NDFStudioPanel from "./NDFStudioPanel";
import yaml from "js-yaml";
import { listGraphs, loadGraphCNL } from "./services/api";
import { listGraphsWithTitles } from "./services/graphUtils"; // 👈 new helper (see below)


const NDFStudioLayout = ({ userId = "user0" }) => {
  const [graphs, setGraphs] = useState([]);
  const [activeGraph, setActiveGraph] = useState(null);
  const [graphData, setGraphData] = useState(null);

  useEffect(() => {
    async function initTabs() {
      try {
      const graphList = await listGraphsWithTitles(userId);
      if (!graphList || graphList.length === 0) {
          console.warn("No graphs found.");
          return;
      }

      setGraphs(graphList);
      await handleTabSwitch(graphList[0].id);


	  const defaultGraph = graphList[0].id; 
	  const raw = await loadGraphCNL(userId, defaultGraph);
          const parsed = yaml.load(raw);
	  const fullGraph = {
	      ...parsed,
	      raw_markdown: raw,
	  };
	  
        setGraphs(graphList);
        setActiveGraph(defaultGraph);
        setGraphData(fullGraph);
      } catch (err) {
        console.error("Error initializing tabs:", err);
      }
    }

    initTabs();
  }, [userId]);

    
    const handleTabSwitch = async (graphId) => {
      try {
        const raw = await loadGraphCNL(userId, graphId); // loads cnl.md
	  const parsedRes = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/parsed`);
	  const parsedText = await parsedRes.text();
	  const parsed = yaml.load(parsedText);

        const fullGraph = {
          ...parsed,
          raw_markdown: raw,
        };

        setActiveGraph(graphId);
        setGraphData(fullGraph);
      } catch (err) {
        console.error("Failed to load selected graph:", err);
      }
    };

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

	    const rawMarkdown = await loadGraphCNL(userId, newId); // FIXED
	    const parsed = yaml.load(rawMarkdown);
	    const fullGraph = {
		...parsed,
		raw_markdown: rawMarkdown,
	    };

	    setGraphs([...graphs, newId]);
	    setActiveGraph(newId);
	    setGraphData(fullGraph);
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
        {graphs.map(({ id, title }) => (
          <button
            key={id}
            onClick={() => handleTabSwitch(id)}
            className={`px-4 py-1 rounded-t-md transition-colors duration-150 ${
              activeGraph === id
                ? "bg-blue-100 text-blue-900 border-b-2 border-blue-600 font-bold shadow"
                : "bg-gray-200 text-gray-700 hover:bg-blue-50"
            }`}
            style={activeGraph === id ? { position: "relative", zIndex: 2 } : {}}
          >
            {title}
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
	      <DisplayTabs
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
