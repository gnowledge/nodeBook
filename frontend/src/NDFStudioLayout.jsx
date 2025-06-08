import React, { useState, useEffect } from "react";
import NDFStudioPanel from "./NDFStudioPanel";
import { listGraphsWithTitles, loadGraphCNL } from "./services/api";

const NDFStudioLayout = ({ userId = "user0" }) => {
  const [allGraphs, setAllGraphs] = useState([]);
  const [openGraphs, setOpenGraphs] = useState([]);
  const [activeGraph, setActiveGraph] = useState(null);
  const [rawMarkdowns, setRawMarkdowns] = useState({});
  const [composedGraphs, setComposedGraphs] = useState({});
  const [showMenu, setShowMenu] = useState(false);
  const [modifiedGraphs, setModifiedGraphs] = useState({});

  useEffect(() => {
    async function init() {
      try {
        const graphList = await listGraphsWithTitles(userId);
        setAllGraphs(graphList);
      } catch (err) {
        console.error("Error loading graph list:", err);
      }
    }
    init();
  }, [userId]);

  const openGraphInTab = async (graphId) => {
    if (openGraphs.find((g) => g.id === graphId)) {
      setActiveGraph(graphId);
      return;
    }
    try {
      const raw = await loadGraphCNL(userId, graphId);
      const composedRes = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/composed`);
      const composed = await composedRes.json();
      setRawMarkdowns((prev) => ({ ...prev, [graphId]: raw }));
      setComposedGraphs((prev) => ({ ...prev, [graphId]: composed }));
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
      const composed = await fetch(`/api/ndf/users/${userId}/graphs/${newId}/composed`).then(r => r.json());
      const fullGraph = { ...composed, raw_markdown: raw };
      const newMeta = { id: newId, title: name };

      setAllGraphs((prev) => [...prev, newMeta]);
      setOpenGraphs((prev) => [...prev, newMeta]);
      setActiveGraph(newId);
      setComposedGraphs((prev) => ({ ...prev, [newId]: fullGraph }));
      setRawMarkdowns((prev) => ({ ...prev, [newId]: raw }));
    } catch (err) {
      console.error("Failed to create graph:", err);
      alert("Failed to create graph. See console for details.");
    }
  };

  const handleGraphUpdate = (updated) => {
    setComposedGraphs((prev) => ({ ...prev, [activeGraph]: updated }));
    if (activeGraph) {
      setModifiedGraphs((prev) => ({ ...prev, [activeGraph]: true }));
    }
  };

  const handleSaveGraph = async () => {
    if (!activeGraph) return;
    try {
      const raw = await loadGraphCNL(userId, activeGraph);
      const composed = await fetch(`/api/ndf/users/${userId}/graphs/${activeGraph}/composed`).then(r => r.json());
      setRawMarkdowns((prev) => ({ ...prev, [activeGraph]: raw }));
      setComposedGraphs((prev) => ({ ...prev, [activeGraph]: composed }));
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
      }
    }
  };

  const setComposedGraph = (graphId, composed) => {
    setComposedGraphs((prev) => ({ ...prev, [graphId]: composed }));
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

      <NDFStudioPanel
        userId={userId}
        graphId={activeGraph}
        graph={composedGraphs[activeGraph]}
        onGraphUpdate={handleGraphUpdate}
        onSave={handleSaveGraph}
        setParsedYaml={setComposedGraph}
        rawMarkdown={rawMarkdowns[activeGraph]}
      />
    </div>
  );
};

export default NDFStudioLayout;
