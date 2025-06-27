import React from "react";
import NDFPreview from "./NDFPreview";
import NDFJsonPreview from "./NDFJsonPreview";
import Statistics from "./Statistics";
import RelationTypeList from "./RelationTypeList";
import AttributeTypeList from "./AttributeTypeList";
import NodeTypeList from "./NodeTypeList";
import LogViewer from "./LogViewer";
import AdminPanel from "./AdminPanel";

export default function DevPanel({ userId, graphId, graph, onGraphUpdate, prefs, activeTab, userInfo }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto bg-white">
        {activeTab === "yaml" && (
          <NDFPreview
            userId={userId}
            graphId={graphId}
            graph={graph}
            onGraphUpdate={onGraphUpdate}
          />
        )}
        {activeTab === "json" && (
          <NDFJsonPreview userId={userId} graphId={graphId} />
        )}
        {activeTab === "stats" && (
          <Statistics
            userId={userId}
            graphId={graphId}
            graph={graph}
          />
        )}
        {activeTab === "nodeTypes" && (
          <NodeTypeList graphId={graphId} />
        )}
        {activeTab === "relationTypes" && (
          <RelationTypeList userId={userId} graphId={graphId} />
        )}
        {activeTab === "attributeTypes" && (
          <AttributeTypeList />
        )}
        {activeTab === "logs" && (
          <div className="p-4">
            <LogViewer
              title="User Activity Logs"
              showUserSpecific={true}
              userId={userId}
              maxHeight="600px"
              refreshInterval={3000}
            />
          </div>
        )}
        {activeTab === "admin" && userInfo?.is_superuser && (
          <div className="p-4">
            <AdminPanel />
          </div>
        )}
        {activeTab === "admin" && !userInfo?.is_superuser && (
          <div className="p-4 text-center">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Access Denied:</strong> Admin privileges required to access this panel.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
