import React, { useEffect, useState } from "react";
import { marked } from "marked";
import NodeCard from "./NodeCard";
import NodeForm from "./NodeForm";
import { useUserId } from "./UserIdContext";

// Utility to strip markdown (basic, for bold/italic/inline code/links)
function stripMarkdown(md) {
  return md
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1') // italic
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // links
    .replace(/_/g, '') // underscores
    .replace(/#+ /g, '') // headings
    .replace(/<.*?>/g, '') // html tags
    .replace(/!\[(.*?)\]\((.*?)\)/g, '$1') // images
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
}

const DisplayHTML = ({ graphId, onGraphRefresh }) => {
  const userId = useUserId();
  const [graph, setGraph] = useState(null);
  const [showNodeForm, setShowNodeForm] = useState(false);

  useEffect(() => {
    const fetchComposed = async () => {
      try {
        const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/polymorphic_composed`);
        const data = await res.json();
        setGraph(data);
      } catch (err) {
        console.error("Failed to load polymorphic_composed.json:", err);
        setGraph(null);
      }
    };

    fetchComposed();
  }, [userId, graphId]);

  // Handler to reload graph after node creation
  const handleNodeCreated = () => {
    setShowNodeForm(false);
    // Refetch graph locally
    fetch(`/api/ndf/users/${userId}/graphs/${graphId}/polymorphic_composed`)
      .then(res => res.json())
      .then(setGraph)
      .catch(() => setGraph(null));
    
    // Also refresh the global graph state if callback provided
    if (onGraphRefresh) {
      onGraphRefresh();
    }
  };

  if (!graph) {
    return <div className="p-4 text-red-600">Failed to load graph.</div>;
  }
  if (!graph.nodes || !Array.isArray(graph.nodes)) {
    return (
      <div className="p-4 text-gray-600">
        <div className="mb-2">This graph is empty. Start by adding a node.</div>
        <div className="flex justify-start">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => setShowNodeForm(true)}
          >
            + Add Node
          </button>
        </div>
        {showNodeForm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 w-[600px] max-w-full">
              <NodeForm
                userId={userId}
                graphId={graphId}
                onSuccess={handleNodeCreated}
                onClose={() => setShowNodeForm(false)}
                difficulty="expert"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Nodes</h2>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => setShowNodeForm(true)}
        >
          + Add Node
        </button>
      </div>
      {showNodeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-[600px] max-w-full">
            <NodeForm
              userId={userId}
              graphId={graphId}
              onSuccess={handleNodeCreated}
              onClose={() => setShowNodeForm(false)}
              difficulty="expert"
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {graph.nodes.map((node) => (
          <div key={node.node_id || node.id} className="relative">
            <NodeCard 
              node={node} 
              userId={userId} 
              graphId={graphId} 
              onGraphUpdate={handleNodeCreated}
              graphRelations={graph.relations}
              graphAttributes={graph.attributes}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default DisplayHTML;
