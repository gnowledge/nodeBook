import React, { useState, useEffect } from "react";
import NDFStudioPanel from "./NDFStudioPanel";
import { listGraphsWithTitles, loadGraphCNL } from "./services/api";
import WorkspaceStatistics from "./WorkspaceStatistics";
import PreferencesPanel from "./PreferencesPanel";
import { marked } from "marked";
import DisplayHTML from "./DisplayHTML";
import CytoscapeStudio from "./CytoscapeStudio";
import BlocklyCNLComposer from "./BlocklyCNLComposer";
import DevPanel from "./DevPanel";
import CNLInput from "./CNLInput";
import LogViewer from "./LogViewer";
import { useUserInfo } from "./UserIdContext";

const DEFAULT_PREFERENCES = {
  graphLayout: "dagre",
  language: "en",
  educationLevel: "undergraduate",
  landingTab: "help",
  difficulty: "easy",
  subjectOrder: "SVO",
  theme: "system",
  fontSize: "medium",
  showTooltips: true,
  autosave: false,
  showScorecardOnSave: true,
  showAdvanced: false,
  accessibility: false,
};

// Map tab keys to display names and content renderers
const TAB_DEFINITIONS = {
  graphs: {
    label: "Knowledge Base",
    render: ({
      openGraphs,
      activeGraph,
      composedGraphs,
      rawMarkdowns,
      modifiedGraphs,
      setShowMenu,
      showMenu,
      allGraphs,
      openGraphInTab,
      handleAddGraph,
      handleCloseTab,
      handleGraphUpdate,
      handleSaveGraph,
      setComposedGraph,
      handleGraphDeleted,
      prefs,
    }) => (
      <div className="p-2 flex flex-col h-full">
        <NDFStudioPanel
          graphId={activeGraph}
          graph={composedGraphs[activeGraph]}
          onGraphUpdate={handleGraphUpdate}
          onSave={handleSaveGraph}
          setParsedYaml={setComposedGraph}
          onGraphDeleted={handleGraphDeleted}
          rawMarkdown={rawMarkdowns[activeGraph]}
          prefs={prefs}
        />
      </div>
    ),
  },
  "workspace-stats": {
    label: "Score Card",
    render: () => <WorkspaceStatistics />,
  },
  help: {
    label: "Help",
    render: () => <HelpTab />,
  },
  preferences: {
    label: "Preferences",
    render: ({ handlePrefsChange }) => (
      <div className="p-4">
        <div className="text-lg font-semibold mb-2">Preferences</div>
        <PreferencesPanel onPrefsChange={handlePrefsChange} />
      </div>
    ),
  },
  // Add more tab definitions as needed
};

const DEFAULT_MAIN_TABS = ["help", "graphs", "workspace-stats", "preferences"];

const TOP_TABS = [
  { key: "graphs", label: "Graph Document" },
  { key: "workspace-stats", label: "Scorecard" },
  { key: "system-logs", label: "System Logs" },
  { key: "help", label: "Help" },
  { key: "preferences", label: "Preferences" },
];

const WORKAREA_TABS = [
  { key: "display", label: "Nodes and Edges" },
  { key: "graph", label: "Graph" },
  { key: "cnl", label: "CNL" },
  { key: "dev", label: "Knowledge Base" },
];

const DEV_PANEL_TABS = [
  { key: "json", label: "JSON" },
  { key: "yaml", label: "YAML" },
  { key: "stats", label: "Stats" },
  { key: "nodeTypes", label: "Node Types" },
  { key: "relationTypes", label: "Relation Types" },
  { key: "attributeTypes", label: "Attribute Types" },
  { key: "logs", label: "User Logs" },
  { key: "admin", label: "Admin" },
];

const NDFStudioLayout = () => {
  const { userId, userInfo } = useUserInfo();
  const [allGraphs, setAllGraphs] = useState([]);
  const [openGraphs, setOpenGraphs] = useState([]);
  const [activeGraph, setActiveGraph] = useState(null);
  const [rawMarkdowns, setRawMarkdowns] = useState({});
  const [composedGraphs, setComposedGraphs] = useState({});
  const [inMemoryGraphs, setInMemoryGraphs] = useState({}); // In-memory graphs for morph changes
  const [showMenu, setShowMenu] = useState(false);
  const [modifiedGraphs, setModifiedGraphs] = useState({});
  const [activeTopTab, setActiveTopTab] = useState("graphs");
  const [activeWorkTab, setActiveWorkTab] = useState("display");
  const [activeDevTab, setActiveDevTab] = useState("json");
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
  const [prefsLoading, setPrefsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      if (!userId) return; // Don't make API calls if no user is logged in
      try {
        const graphList = await listGraphsWithTitles(userId);
        setAllGraphs(graphList);
      } catch (err) {
        console.error("Error loading graph list:", err);
      }
    }
    init();
  }, [userId]);

  useEffect(() => {
    async function fetchPrefs() {
      if (!userId) {
        setPrefs(DEFAULT_PREFERENCES);
        setPrefsLoading(false);
        return; // Don't make API calls if no user is logged in
      }
      setPrefsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/ndf/preferences?user_id=${encodeURIComponent(userId)}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error("Failed to load preferences");
        const data = await res.json();
        setPrefs(data);
      } catch (e) {
        setPrefs(DEFAULT_PREFERENCES);
      } finally {
        setPrefsLoading(false);
      }
    }
    fetchPrefs();
  }, [userId]);

  const openGraphInTab = async (graphId) => {
    if (openGraphs.find((g) => g.id === graphId)) {
      setActiveGraph(graphId);
      return;
    }
    try {
      const raw = await loadGraphCNL(userId, graphId);
      const token = localStorage.getItem("token");
      const composedRes = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/polymorphic_composed`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const composed = await composedRes.json();
      setRawMarkdowns((prev) => ({ ...prev, [graphId]: raw }));
      setComposedGraphs((prev) => ({ ...prev, [graphId]: composed }));
      setInMemoryGraphs((prev) => ({ ...prev, [graphId]: JSON.parse(JSON.stringify(composed)) })); // Initialize in-memory graph
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
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/ndf/users/${userId}/graphs/${newId}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title: name, description: "" })
      });
      if (!res.ok) throw new Error(await res.text());

      const raw = await loadGraphCNL(userId, newId);
      const composed = await fetch(`/api/ndf/users/${userId}/graphs/${newId}/polymorphic_composed`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }).then(r => r.json());
      const fullGraph = { ...composed, raw_markdown: raw };
      const newMeta = { id: newId, title: name };

      setAllGraphs((prev) => [...prev, newMeta]);
      setOpenGraphs((prev) => [...prev, newMeta]);
      setActiveGraph(newId);
      setComposedGraphs((prev) => ({ ...prev, [newId]: fullGraph }));
      setInMemoryGraphs((prev) => ({ ...prev, [newId]: JSON.parse(JSON.stringify(fullGraph)) })); // Initialize in-memory graph
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

  // Handle in-memory morph changes from NodeCard
  const handleInMemoryMorphChange = (nodeId, newNbh) => {
    console.log('[NDFStudioLayout] In-memory morph change:', { nodeId, newNbh, activeGraph });
    
    if (!activeGraph || !inMemoryGraphs[activeGraph]) return;
    
    // Update the node's nbh in the in-memory graph
    const updatedInMemoryGraph = JSON.parse(JSON.stringify(inMemoryGraphs[activeGraph]));
    const nodeIndex = updatedInMemoryGraph.nodes.findIndex(n => (n.node_id || n.id) === nodeId);
    
    if (nodeIndex !== -1) {
      updatedInMemoryGraph.nodes[nodeIndex] = {
        ...updatedInMemoryGraph.nodes[nodeIndex],
        nbh: newNbh
      };
      setInMemoryGraphs((prev) => ({ ...prev, [activeGraph]: updatedInMemoryGraph }));
      console.log('[NDFStudioLayout] Updated in-memory graph for:', activeGraph);
    }
  };

  const refreshActiveGraph = async () => {
    if (!activeGraph || !userId) return;
    try {
      console.log("🔄 Refreshing graph data for:", activeGraph);
      const token = localStorage.getItem("token");
      const composedRes = await fetch(`/api/ndf/users/${userId}/graphs/${activeGraph}/polymorphic_composed`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!composedRes.ok) throw new Error("Failed to fetch updated graph data");
      const composed = await composedRes.json();
      setComposedGraphs((prev) => ({ ...prev, [activeGraph]: composed }));
      setInMemoryGraphs((prev) => ({ ...prev, [activeGraph]: JSON.parse(JSON.stringify(composed)) })); // Reset in-memory graph
      console.log("✅ Graph data refreshed successfully");
    } catch (err) {
      console.error("Failed to refresh graph data:", err);
      alert("Failed to refresh graph data. See console for details.");
    }
  };

  const handleSaveGraph = async () => {
    if (!activeGraph) return;
    try {
      const raw = await loadGraphCNL(userId, activeGraph);
      const token = localStorage.getItem("token");
      const composed = await fetch(`/api/ndf/users/${userId}/graphs/${activeGraph}/polymorphic_composed`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }).then(r => r.json());
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
    setInMemoryGraphs((prev) => {
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
    setInMemoryGraphs((prev) => {
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
  };

  // Handler for PreferencesPanel to update global prefs
  const handlePrefsChange = (newPrefs) => {
    setPrefs(newPrefs);
  };

  // --- Logout handler ---
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  // Render top-level tabs
  const renderTopTabs = () => (
    <div className="flex border-b bg-gray-100">
      {TOP_TABS.map(({ key, label }) => (
        <button
          key={key}
          className={`px-4 py-2 ${activeTopTab === key ? "bg-white border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => setActiveTopTab(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );

  // Render file selector and open graph tabs (only for Knowledge Base)
  const renderGraphSelectorBar = () => (
    <div className="flex items-center space-x-2 border-b pb-2 relative bg-gray-50">
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
      {activeGraph && (
        <button
          onClick={refreshActiveGraph}
          className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          title="Refresh graph data"
        >
          🔄 Refresh
        </button>
      )}
    </div>
  );

  // Render workarea tabs (only when a graph is open and Knowledge Base is active)
  const renderWorkareaTabs = () => (
    <div className="flex border-b bg-gray-50">
      {WORKAREA_TABS.map(({ key, label }) => (
        <button
          key={key}
          className={`px-4 py-2 ${activeWorkTab === key ? "bg-white border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => setActiveWorkTab(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );

  // Render Dev Panel sub-tabs (only when Dev Panel is active)
  const renderDevPanelTabs = () => (
    <div className="flex border-b bg-gray-50">
      {DEV_PANEL_TABS.map(({ key, label }) => (
        <button
          key={key}
          className={`px-4 py-2 ${activeDevTab === key ? "bg-white border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => setActiveDevTab(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );

  // Render content for workarea tabs
  const renderWorkareaContent = () => {
    if (activeWorkTab === "display") {
      return (
        <DisplayHTML
          graph={composedGraphs[activeGraph]}
          rawMarkdown={rawMarkdowns[activeGraph]}
          graphId={activeGraph}
          onGraphRefresh={refreshActiveGraph}
          onInMemoryMorphChange={handleInMemoryMorphChange}
        />
      );
    }
    if (activeWorkTab === "graph") {
      // Use in-memory graph if available, otherwise fall back to composed graph
      const graphToUse = inMemoryGraphs[activeGraph] || composedGraphs[activeGraph];
      return (
        <CytoscapeStudio
          graph={graphToUse}
          prefs={prefs}
          graphId={activeGraph}
          graphRelations={graphToUse?.relations || []}
          graphAttributes={graphToUse?.attributes || []}
        />
      );
    }
    if (activeWorkTab === "cnl") {
      return (
        <CNLInput
          graphId={activeGraph}
          graph={composedGraphs[activeGraph]}
          rawMarkdown={rawMarkdowns[activeGraph]}
          onGraphUpdate={handleGraphUpdate}
        />
      );
    }
    if (activeWorkTab === "dev") {
      // Only render the DevPanel sub-tabs and DevPanel component (no extra stub row)
      return (
        <>
          {renderDevPanelTabs()}
          <DevPanel
            activeTab={activeDevTab}
            graph={composedGraphs[activeGraph]}
            graphId={activeGraph}
            rawMarkdown={rawMarkdowns[activeGraph]}
            prefs={prefs}
            userInfo={userInfo}
          />
        </>
      );
    }
    return null;
  };

  // Render main content area
  const renderMainContent = () => {
    if (activeTopTab === "graphs") {
      if (!activeGraph) {
        return <div className="p-4 text-gray-500">Select or create a graph to begin.</div>;
      }
      return renderWorkareaContent();
    }
    if (activeTopTab === "workspace-stats") {
      return <WorkspaceStatistics />;
    }
    if (activeTopTab === "system-logs") {
      return (
        <div className="p-4">
          <LogViewer
            title="System Activity Logs"
            showUserSpecific={false}
            maxHeight="700px"
            refreshInterval={5000}
            isAdmin={userInfo?.is_superuser || false}
          />
        </div>
      );
    }
    if (activeTopTab === "help") {
      return <HelpTab />;
    }
    if (activeTopTab === "preferences") {
      return (
        <div className="p-4">
          <div className="text-lg font-semibold mb-2">Preferences</div>
          <PreferencesPanel onPrefsChange={handlePrefsChange} />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full w-full flex flex-col">
      {renderTopTabs()}
      {activeTopTab === "graphs" && renderGraphSelectorBar()}
      {activeTopTab === "graphs" && activeGraph && renderWorkareaTabs()}
      <div className="flex-1 overflow-auto bg-white">
        {renderMainContent()}
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
