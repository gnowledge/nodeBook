import React, { useState, useEffect } from "react";
import NDFStudioPanel from "./NDFStudioPanel";
import yaml from "js-yaml";
import { listGraphsWithTitles, loadGraphCNL } from "./services/api";

const NDFStudioLayout = ({ userId = "user0" }) => {
  const [allGraphs, setAllGraphs] = useState([]); // All available graphs
  const [openGraphs, setOpenGraphs] = useState([]); // Tabs
  const [activeGraph, setActiveGraph] = useState(null);
  const [rawMarkdowns, setRawMarkdowns] = useState({}); // { graphId: rawMarkdown }
  const [parsedYamls, setParsedYamls] = useState({});   // { graphId: parsedYaml }
  const [showMenu, setShowMenu] = useState(false);
  const [modifiedGraphs, setModifiedGraphs] = useState({}); // Track modified state

  useEffect(() => {
    async function init() {
      try {
        const graphList = await listGraphsWithTitles(userId);
        setAllGraphs(graphList);
        // Do not open any graph by default
        // if (graphList.length > 0) {
        //   await openGraphInTab(graphList[0].id);
        // }
      } catch (err) {
        console.error("Error loading graph list:", err);
      }
    }
    init();
  }, [userId]);

  // Update openGraphInTab to use per-graph state
  const openGraphInTab = async (graphId) => {
    if (openGraphs.find((g) => g.id === graphId)) {
      setActiveGraph(graphId);
      return;
    }
    try {
      // Fetch raw markdown (for editor)
      const raw = await loadGraphCNL(userId, graphId);
      // Fetch parsed.yaml for graph and HTML
      const parsedRes = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/parsed`);
      const parsedText = await parsedRes.text();
      const parsed = yaml.load(parsedText);
      setRawMarkdowns((prev) => ({ ...prev, [graphId]: raw }));
      setParsedYamls((prev) => ({ ...prev, [graphId]: parsed }));
      const graphMeta = allGraphs.find((g) => g.id === graphId) || { id: graphId, title: graphId };
      setOpenGraphs((prev) => [...prev, graphMeta]);
      setActiveGraph(graphId);
    } catch (err) {
      console.error("Failed to open graph:", err);
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
        body: JSON.stringify({ title: name, description: "" })
      });
      if (!res.ok) throw new Error(await res.text());

      const raw = await loadGraphCNL(userId, newId);
      const parsed = yaml.load(raw);
      const fullGraph = { ...parsed, raw_markdown: raw };
      const newMeta = { id: newId, title: name };

      setAllGraphs((prev) => [...prev, newMeta]);
      setOpenGraphs((prev) => [...prev, newMeta]);
      setActiveGraph(newId);
      setGraphData(fullGraph);
    } catch (err) {
      console.error("Failed to create graph:", err);
      alert("Failed to create graph. See console for details.");
    }
  };

  const handleGraphUpdate = (updated) => {
    setGraphData(updated);
    if (activeGraph) {
      setModifiedGraphs((prev) => ({ ...prev, [activeGraph]: true }));
    }
  };

  // When saving or parsing, re-fetch and update only the relevant entry
  const handleSaveGraph = async () => {
    if (!activeGraph) return;
    try {
      // Re-fetch both raw and parsed after save/parse
      const raw = await loadGraphCNL(userId, activeGraph);
      const parsedRes = await fetch(`/api/ndf/users/${userId}/graphs/${activeGraph}/parsed`);
      const parsedText = await parsedRes.text();
      const parsed = yaml.load(parsedText);
      setRawMarkdowns((prev) => ({ ...prev, [activeGraph]: raw }));
      setParsedYamls((prev) => ({ ...prev, [activeGraph]: parsed }));
      setModifiedGraphs((prev) => ({ ...prev, [activeGraph]: false }));
    } catch (err) {
      console.error("Failed to re-fetch after save/parse:", err);
    }
  };

  const handleCloseTab = (graphId) => {
    if (modifiedGraphs[graphId]) {
      const confirmClose = window.confirm("You have unsaved changes. Close anyway?");
      if (!confirmClose) return;
    }
    setOpenGraphs((prev) => prev.filter((g) => g.id !== graphId));
    setModifiedGraphs((prev) => {
      const newState = { ...prev };
      delete newState[graphId];
      return newState;
    });
    if (activeGraph === graphId) {
      const remaining = openGraphs.filter((g) => g.id !== graphId);
      if (remaining.length > 0) {
        setActiveGraph(remaining[0].id);
      } else {
        setActiveGraph(null);
        setGraphData(null);
      }
    }
  };

  // Accepts (graphId, parsed) to update per-document parsed YAML
  const setParsedYaml = (graphId, parsed) => {
    setParsedYamls((prev) => ({ ...prev, [graphId]: parsed }));
  };

  return (
    <div className="p-2 h-full flex flex-col">
      <div className="flex items-center space-x-2 border-b pb-2 relative">
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">
            File ▾
          </button>
          {showMenu && (
            <div className="absolute mt-1 bg-white shadow border rounded z-10">
              {allGraphs.map(({ id, title }) => (
                <div
                  key={id}
                  onClick={() => {
                    openGraphInTab(id);
                    setShowMenu(false);
                  }}
                  className="px-3 py-1 hover:bg-gray-100 cursor-pointer"
                >
                  {title}
                </div>
              ))}
              <div
                onClick={() => {
                  handleAddGraph();
                  setShowMenu(false);
                }}
                className="border-t px-3 py-1 text-green-600 hover:bg-green-100 cursor-pointer"
              >
                + New Graph
              </div>
            </div>
          )}
        </div>

        {openGraphs.map(({ id, title }) => (
          <div key={id} className="flex items-center">
            <button
              onClick={() => openGraphInTab(id)}
              className={`px-4 py-1 rounded-t-md transition-colors duration-150 ${
                activeGraph === id
                  ? "bg-blue-100 text-blue-900 border-b-2 border-blue-600 font-bold shadow"
                  : "bg-gray-200 text-gray-700 hover:bg-blue-50"
              }`}
              style={activeGraph === id ? { position: "relative", zIndex: 2 } : {}}
            >
              {title}{modifiedGraphs[id] ? " *" : ""}
            </button>
            <button
              onClick={() => handleCloseTab(id)}
              className="ml-1 text-red-500 hover:text-red-700 font-bold"
              title="Close tab"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Remove ResizableSplitPanel, just render NDFStudioPanel directly */}
      <NDFStudioPanel
        userId={userId}
        graphId={activeGraph}
        graph={parsedYamls[activeGraph]}
        onGraphUpdate={handleGraphUpdate}
        onSave={handleSaveGraph}
        setParsedYaml={setParsedYaml}
        rawMarkdown={rawMarkdowns[activeGraph]}
      />
    </div>
  );
};

export default NDFStudioLayout;
