import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import NDFStudioPanel from "./NDFStudioPanel";
import { listGraphsWithTitles, loadGraphCNL, loadDocFile, authenticatedApiCall } from "./services/api";
import { getApiBase } from "./config";
import WorkspaceStatistics from "./WorkspaceStatistics";
import PreferencesPanel from "./PreferencesPanel";
import { marked } from "marked";
import DisplayHTML from "./DisplayHTML";
import CytoscapeStudio from "./CytoscapeStudio";
import BlocklyCNLComposer from "./BlocklyCNLComposer";
import DevPanel from "./DevPanel";
import CNLInput from "./CNLInput";
import LogViewer from "./LogViewer";
import ShareButton from "./components/ShareButton";
import SaveButton from "./components/SaveButton";
import { useUserInfo } from "./UserIdContext";
import AdminPanel from "./AdminPanel";

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
  { key: "admin", label: "Admin", adminOnly: true },
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
  const userInfo = useUserInfo();
  
  const [searchParams] = useSearchParams();
  const [allGraphs, setAllGraphs] = useState([]);
  const [openGraphs, setOpenGraphs] = useState([]);
  const [activeGraph, setActiveGraph] = useState(null);
  const [rawMarkdowns, setRawMarkdowns] = useState({});
  const [composedGraphs, setComposedGraphs] = useState({});
  const [inMemoryGraphs, setInMemoryGraphs] = useState({}); // In-memory graphs for morph changes
  const [modifiedGraphs, setModifiedGraphs] = useState({});
  const [activeTopTab, setActiveTopTab] = useState("graphs");
  const [activeWorkTab, setActiveWorkTab] = useState("display");
  const [activeDevTab, setActiveDevTab] = useState("json");
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [showNewGraphModal, setShowNewGraphModal] = useState(false);
  const [newGraphName, setNewGraphName] = useState("");
  const [importing, setImporting] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  // Handle URL parameters for graph sharing
  useEffect(() => {
    const graphParam = searchParams.get('graph');
    if (graphParam && userInfo?.userId && allGraphs.length > 0) {
      // Check if the graph exists in the user's graphs
      const graphExists = allGraphs.find(g => g.id === graphParam);
      if (graphExists) {
        openGraphInTab(graphParam);
      }
    }
  }, [searchParams, userInfo?.userId, allGraphs]);

  useEffect(() => {
    async function init() {
      if (!userInfo?.userId) return; // Don't make API calls if no user is logged in
      try {
        const graphList = await listGraphsWithTitles(userInfo?.userId);
        setAllGraphs(graphList);
      } catch (err) {
        console.error("Error loading graph list:", err);
      }
    }
    init();
  }, [userInfo?.userId]);

  useEffect(() => {
    async function fetchPrefs() {
      if (!userInfo?.userId) {
        setPrefs(DEFAULT_PREFERENCES);
        setPrefsLoading(false);
        return; // Don't make API calls if no user is logged in
      }
      setPrefsLoading(true);
      try {
        const res = await authenticatedApiCall(`${getApiBase()}/api/ndf/preferences?user_id=${encodeURIComponent(userInfo?.userId)}`);
        const data = await res.json();
        setPrefs(data);
      } catch (e) {
        setPrefs(DEFAULT_PREFERENCES);
      } finally {
        setPrefsLoading(false);
      }
    }
    fetchPrefs();
  }, [userInfo?.userId]);

  // Fetch pending approvals count for admin users
  useEffect(() => {
    async function fetchPendingApprovals() {
      if (!userInfo?.userId || !userInfo?.is_superuser) return;
      
      try {
        const response = await authenticatedApiCall(`${getApiBase()}/api/auth/admin/pending-approvals`);
        if (response.ok) {
          const data = await response.json();
          setPendingApprovalsCount(data.count || 0);
        }
      } catch (error) {
        console.error("Error fetching pending approvals:", error);
      }
    }
    
    fetchPendingApprovals();
    // Refresh every 30 seconds for admins
    const interval = setInterval(fetchPendingApprovals, 30000);
    return () => clearInterval(interval);
  }, [userInfo?.userId, userInfo?.is_superuser]);

  const refreshPendingApprovalsCount = async () => {
    if (!userInfo?.userId || !userInfo?.is_superuser) return;
    
    try {
      const response = await authenticatedApiCall(`${getApiBase()}/api/auth/admin/pending-approvals`);
      if (response.ok) {
        const data = await response.json();
        setPendingApprovalsCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
    }
  };

  const openGraphInTab = async (graphId) => {
    if (openGraphs.find((g) => g.id === graphId)) {
      setActiveGraph(graphId);
      return;
    }
    try {
      const raw = await loadGraphCNL(userInfo?.userId, graphId);
      const composedRes = await authenticatedApiCall(`${getApiBase()}/api/ndf/users/${userInfo?.userId}/graphs/${graphId}/polymorphic_composed`);
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
    setShowNewGraphModal(true);
  };

  const handleCreateGraph = async () => {
    if (!newGraphName.trim()) return;
    
    try {
      const response = await authenticatedApiCall(`${getApiBase()}/api/ndf/users/${userInfo?.userId}/graphs/${newGraphName.trim()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newGraphName.trim(),
          description: "",
        }),
      });

      if (response.ok) {
        const newGraph = await response.json();
        setAllGraphs((prev) => [...prev, newGraph]);
        await openGraphInTab(newGraph.id);
        setShowNewGraphModal(false);
        setNewGraphName("");
      } else {
        const errorData = await response.json();
        alert(`Failed to create graph: ${errorData.detail || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error creating graph:", error);
      alert("Failed to create graph. Please try again.");
    }
  };

  const handleImportGraph = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset file input
    event.target.value = "";

    if (!file.name.endsWith('.ndf')) {
      alert('Please select a .ndf file');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiBase()}/api/exchange/import_ndf/${userInfo?.userId}`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        
        // Refresh the graph list to include the imported graph
        const graphList = await listGraphsWithTitles(userInfo?.userId);
        setAllGraphs(graphList);
        
        // Open the imported graph
        await openGraphInTab(result.imported_graph_id);
        
        alert(`Graph '${result.imported_graph_id}' imported successfully!\n\nImported files: ${result.imported_files.length}\nNew types: ${result.imported_types.nodes + result.imported_types.attributes + result.imported_types.relations}`);
      } else {
        const errorData = await response.json();
        alert(`Import failed: ${errorData.detail || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error importing graph:", error);
      alert("Failed to import graph. Please try again.");
    } finally {
      setImporting(false);
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
    }
  };

  const refreshActiveGraph = async () => {
    if (!activeGraph) return;
    
    const composedRes = await fetch(`${getApiBase()}/api/ndf/users/${userInfo?.userId}/graphs/${activeGraph}/polymorphic_composed`, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });
    
    if (composedRes.ok) {
      const composed = await composedRes.json();
      setComposedGraphs((prev) => ({ ...prev, [activeGraph]: composed }));
      setInMemoryGraphs((prev) => ({ ...prev, [activeGraph]: JSON.parse(JSON.stringify(composed)) }));
    }
  };

  const handleSaveGraph = async () => {
    if (!activeGraph) return;
    
    try {
      const raw = await loadGraphCNL(userInfo?.userId, activeGraph);
      const token = localStorage.getItem("token");
      const composed = await fetch(`${getApiBase()}/api/ndf/users/${userInfo?.userId}/graphs/${activeGraph}/polymorphic_composed`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (composed.ok) {
        const composedData = await composed.json();
        setComposedGraphs((prev) => ({ ...prev, [activeGraph]: composedData }));
        setModifiedGraphs((prev) => ({ ...prev, [activeGraph]: false }));
      }
    } catch (err) {
      console.error("Failed to save graph:", err);
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
    // Force a complete page reload to clear all state
    window.location.reload();
  };

  // Render top-level tabs
  const renderTopTabs = () => (
    <div className="flex border-b bg-gray-100">
      {TOP_TABS.map(({ key, label, adminOnly }) => {
        // Skip admin tab if user is not a superuser
        if (adminOnly && !userInfo?.is_superuser) {
          return null;
        }
        
        return (
          <button
            key={key}
            className={`px-4 py-2 ${activeTopTab === key ? "bg-white border-b-2 border-blue-600 font-bold" : ""}`}
            onClick={() => {
              setActiveTopTab(key);
              if (key === "admin") {
                refreshPendingApprovalsCount();
              }
            }}
          >
            {label}
            {key === "admin" && pendingApprovalsCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {pendingApprovalsCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  // Render file selector and open graph tabs (only for Knowledge Base)
  const renderGraphSelectorBar = () => (
    <div className="flex items-center justify-between bg-gray-100 border-b border-gray-200 px-4 py-2">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">Graph:</span>
        <select
          value={activeGraph || ""}
          onChange={(e) => openGraphInTab(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
        >
          <option value="">Select a graph</option>
          {allGraphs.map((graph) => (
            <option key={graph.id} value={graph.id}>
              {graph.title || graph.id}
            </option>
          ))}
        </select>
        
        <button
          onClick={handleAddGraph}
          className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
        >
          + New Graph
        </button>

        <button
          onClick={() => document.getElementById('import-ndf-input').click()}
          disabled={importing}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {importing ? "Importing..." : "📂 Open Graph"}
        </button>

        <input
          id="import-ndf-input"
          type="file"
          accept=".ndf"
          onChange={handleImportGraph}
          style={{ display: 'none' }}
        />
      </div>
      
      {/* Add Save and Share Buttons */}
      {activeGraph && (
        <div className="flex items-center space-x-2">
          <SaveButton userId={userInfo?.userId} graphId={activeGraph} />
          <ShareButton graphId={activeGraph} />
        </div>
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
    if (activeTopTab === "admin" && userInfo?.is_superuser) {
      return (
        <div className="p-4">
          <AdminPanel />
        </div>
      );
    }
    if (activeTopTab === "admin" && !userInfo?.is_superuser) {
      return (
        <div className="p-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Access Denied:</strong> Admin privileges required to access this panel.
          </div>
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
      
      {/* New Graph Modal */}
      {showNewGraphModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Graph</h3>
            <input
              type="text"
              placeholder="Enter graph name"
              value={newGraphName}
              onChange={(e) => setNewGraphName(e.target.value)}
              className="w-full p-2 border rounded mb-4"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateGraph();
                }
              }}
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowNewGraphModal(false);
                  setNewGraphName("");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGraph}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={!newGraphName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function HelpTab() {
  const [helpMd, setHelpMd] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDocFile("Help.md")
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
