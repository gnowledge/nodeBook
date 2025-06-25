import React from "react";
import NDFPreview from "./NDFPreview";
import NDFJsonPreview from "./NDFJsonPreview";
import Statistics from "./Statistics";
import RelationTypeList from "./RelationTypeList";
import AttributeTypeList from "./AttributeTypeList";
import NodeTypeList from "./NodeTypeList";
import LogViewer from "./LogViewer";

export default function DevPanel({ userId, graphId, graph, onGraphUpdate, prefs, activeTab }) {
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
      </div>
    </div>
  );
}
