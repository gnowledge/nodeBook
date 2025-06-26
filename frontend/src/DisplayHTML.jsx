import React, { useEffect, useState } from "react";
import { marked } from "marked";
import NodeCard from "./NodeCard";
import TransitionCard from "./TransitionCard";
import NodeForm from "./NodeForm";
import RelationTypeList from "./RelationTypeList";
import AttributeTypeList from "./AttributeTypeList";
import NodeTypeList from "./NodeTypeList";
import { useUserInfo } from "./UserIdContext";
import { refreshGraphData, isTokenValid } from "./utils/authUtils";

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
  const { userId } = useUserInfo();
  const [graph, setGraph] = useState(null);
  const [showNodeForm, setShowNodeForm] = useState(false);
  const [showRelationTypes, setShowRelationTypes] = useState(false);
  const [showAttributeTypes, setShowAttributeTypes] = useState(false);
  const [showNodeTypes, setShowNodeTypes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchComposed = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check if token is valid before making request
        if (!isTokenValid()) {
          setError("Authentication token expired. Please log in again.");
          setGraph(null);
          return;
        }
        
        const data = await refreshGraphData(userId, graphId);
        setGraph(data);
      } catch (err) {
        console.error("Failed to load polymorphic_composed.json:", err);
        setError(err.message || "Failed to load graph data");
        setGraph(null);
      } finally {
        setLoading(false);
      }
    };

    fetchComposed();
  }, [userId, graphId]);

  // Handler to reload graph after node creation
  const handleNodeCreated = async () => {
    setShowNodeForm(false);
    try {
      setLoading(true);
      const data = await refreshGraphData(userId, graphId);
      setGraph(data);
      setError(null);
    } catch (err) {
      console.error("Failed to refresh graph:", err);
      setError(err.message || "Failed to refresh graph");
    } finally {
      setLoading(false);
    }
    
    // Also refresh the global graph state if callback provided
    if (onGraphRefresh) {
      onGraphRefresh();
    }
  };

  if (loading) {
    return <div className="p-4 text-blue-600">Loading graph...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <div className="mb-2">Error: {error}</div>
        <button 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => window.location.reload()}
        >
          Reload Page
        </button>
      </div>
    );
  }

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
    <div className="p-4 bg-gray-100 min-h-screen relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          Nodes ({graph.nodes?.length || 0})
          {graph.transitions && graph.transitions.length > 0 && (
            <span className="text-blue-600 font-normal ml-2">
              • Transitions ({graph.transitions.length})
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          <button
            className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 text-sm"
            onClick={() => setShowNodeTypes(true)}
            title="Schema management (use sparingly)"
          >
            Schema
          </button>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            onClick={() => setShowNodeForm(true)}
          >
            + Add Node
          </button>
        </div>
      </div>

      {/* Schema Management Modal */}
      {showNodeTypes && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-[90vw] h-[90vh] max-w-6xl overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Schema Management</h2>
              <button
                className="text-gray-500 hover:text-gray-700 text-2xl"
                onClick={() => setShowNodeTypes(false)}
              >
                ×
              </button>
            </div>
            
            {/* Schema Tabs */}
            <div className="flex border-b mb-4">
              <button
                className={`px-4 py-2 font-semibold border-b-2 ${!showRelationTypes && !showAttributeTypes ? 'border-blue-600 text-blue-700' : 'text-gray-500'}`}
                onClick={() => {
                  setShowRelationTypes(false);
                  setShowAttributeTypes(false);
                }}
              >
                Node Types
              </button>
              <button
                className={`px-4 py-2 font-semibold border-b-2 ${showRelationTypes ? 'border-blue-600 text-blue-700' : 'text-gray-500'}`}
                onClick={() => {
                  setShowRelationTypes(true);
                  setShowAttributeTypes(false);
                }}
              >
                Relation Types
              </button>
              <button
                className={`px-4 py-2 font-semibold border-b-2 ${showAttributeTypes ? 'border-blue-600 text-blue-700' : 'text-gray-500'}`}
                onClick={() => {
                  setShowRelationTypes(false);
                  setShowAttributeTypes(true);
                }}
              >
                Attribute Types
              </button>
            </div>
            
            {/* Schema Content */}
            {!showRelationTypes && !showAttributeTypes && (
              <div>
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Parsimony Principle:</strong> Only create new schema types when absolutely necessary. 
                    Reuse existing types whenever possible to maintain rigorous modeling.
                  </p>
                </div>
                <NodeTypeList graphId={graphId} />
              </div>
            )}
            
            {showRelationTypes && (
              <div>
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Parsimony Principle:</strong> Only create new relation types when absolutely necessary. 
                    Reuse existing types whenever possible to maintain rigorous modeling.
                  </p>
                </div>
                <RelationTypeList userId={userId} graphId={graphId} />
              </div>
            )}
            
            {showAttributeTypes && (
              <div>
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Parsimony Principle:</strong> Only create new attribute types when absolutely necessary. 
                    Reuse existing types whenever possible to maintain rigorous modeling.
                  </p>
                </div>
                <AttributeTypeList graphId={graphId} />
              </div>
            )}
          </div>
        </div>
      )}

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
        {/* Regular Nodes */}
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
        
        {/* Transitions */}
        {graph.transitions && graph.transitions.length > 0 && (
          <>
            {/* Transitions Header */}
            <div className="col-span-full mb-4">
              <h3 className="text-lg font-semibold text-blue-700 border-b border-blue-200 pb-2">
                Transitions ({graph.transitions.length})
              </h3>
            </div>
            
            {/* Transition Cards */}
            {graph.transitions.map((transition) => (
              <div key={transition.id} className="relative">
                <TransitionCard 
                  transition={transition}
                  userId={userId}
                  graphId={graphId}
                  onGraphUpdate={handleNodeCreated}
                  availableNodes={graph.nodes || []}
                />
              </div>
            ))}
          </>
        )}
      </div>
      {/* Delete Graph button at bottom left */}
      <button
        className="fixed left-4 bottom-4 px-4 py-2 rounded text-xs font-semibold border bg-red-100 text-red-600 border-red-300 hover:bg-red-200 z-50"
        onClick={async () => {
          if (!window.confirm(`Are you sure you want to delete this graph? This action cannot be undone.`)) return;
          try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/delete`, { 
              method: 'DELETE',
              headers: {
                "Authorization": `Bearer ${token}`
              }
            });
            if (res.ok) {
              // Optionally, redirect or refresh the graph list
              window.location.reload();
            } else {
              const error = await res.json().catch(() => ({}));
              alert(`Failed to delete graph: ${error.detail || res.statusText}`);
            }
          } catch (err) {
            alert(`Failed to delete graph: ${err.message}`);
          }
        }}
        title="Delete Graph"
      >
        [Delete Graph]
      </button>
    </div>
  );
};

export default DisplayHTML;
