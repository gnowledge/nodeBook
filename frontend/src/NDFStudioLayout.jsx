import React, { useState, useEffect } from "react";
import NDFStudioPanel from "./NDFStudioPanel";
import { listGraphsWithTitles, loadGraphCNL } from "./services/api";
import WorkspaceStatistics from "./WorkspaceStatistics";
import PreferencesPanel from "./PreferencesPanel";
import { marked } from "marked";

const NDFStudioLayout = ({ userId = "user0" }) => {
  const [allGraphs, setAllGraphs] = useState([]);
  const [openGraphs, setOpenGraphs] = useState([]);
  const [activeGraph, setActiveGraph] = useState(null);
  const [rawMarkdowns, setRawMarkdowns] = useState({});
  const [composedGraphs, setComposedGraphs] = useState({});
  const [showMenu, setShowMenu] = useState(false);
  const [modifiedGraphs, setModifiedGraphs] = useState({});
  const [activeTab, setActiveTab] = useState("help"); // Default landing tab is now Help

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

  const handleGraphDeleted = (deletedGraphId) => {
    setOpenGraphs((prev) => prev.filter((g) => g.id !== deletedGraphId));
    setComposedGraphs((prev) => {
      const newState = { ...prev };
      delete newState[deletedGraphId];
      return newState;
    });
    setRawMarkdowns((prev) => {
      const newState = { ...prev };
      delete newState[deletedGraphId];
      return newState;
    });
    setModifiedGraphs((prev) => {
      const newState = { ...prev };
      delete newState[deletedGraphId];
      return newState;
    });
    if (activeGraph === deletedGraphId) {
      const remaining = openGraphs.filter((g) => g.id !== deletedGraphId);
      if (remaining.length > 0) {
        setActiveGraph(remaining[0].id);
      } else {
        setActiveGraph(null);
      }
    }
    setActiveTab("graphs"); // Switch to Knowledge Base tab
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex border-b bg-gray-100">
        <button
          className={`px-4 py-2 ${activeTab === "graphs" ? "bg-white border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => setActiveTab("graphs")}
        >
          Knowledge Base
        </button>
        <button
          className={`px-4 py-2 ${activeTab === "workspace-stats" ? "bg-white border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => setActiveTab("workspace-stats")}
        >
          Score Card
        </button>
        <button
          className={`px-4 py-2 ${activeTab === "help" ? "bg-white border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => setActiveTab("help")}
        >
          Help
        </button>
        <button
          className={`px-4 py-2 ${activeTab === "preferences" ? "bg-white border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => setActiveTab("preferences")}
        >
          Preferences
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-white">
        {activeTab === "graphs" && (
          <div className="p-2 flex flex-col h-full">
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
              onGraphDeleted={handleGraphDeleted}
              rawMarkdown={rawMarkdowns[activeGraph]}
            />
          </div>
        )}
        {activeTab === "workspace-stats" && (
          <WorkspaceStatistics userId={userId} />
        )}
        {activeTab === "help" && (
          <HelpTab />
        )}
        {activeTab === "preferences" && (
          <div className="p-4">
            <div className="text-lg font-semibold mb-2">Preferences</div>
            <PreferencesPanel />
          </div>
        )}
      </div>
    </div>
  );
};

function HelpTab() {
  const [helpMd, setHelpMd] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/doc/Help.md")
      .then((res) => {
        if (!res.ok) throw new Error("Help.md not found");
        return res.text();
      })
      .then(setHelpMd)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="text-lg font-semibold mb-2">Help</div>
      {error ? (
        <div className="text-red-600">{error}</div>
      ) : helpMd ? (
        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: marked(helpMd) }} />
      ) : (
        <div className="text-gray-500">Loading help...</div>
      )}
      <div className="text-gray-500 text-xs mt-4">(This help content is loaded from <code>doc/Help.md</code> and is not user-editable.)</div>
    </div>
  );
}

export default NDFStudioLayout;
