import React, { useEffect, useState } from "react";
import { marked } from "marked";
import NodeCard from "./NodeCard";

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

const DisplayHTML = ({ userId, graphId }) => {
  const [graph, setGraph] = useState(null);

  useEffect(() => {
    const fetchComposed = async () => {
      try {
        const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/composed`);
        const data = await res.json();
        setGraph(data);
      } catch (err) {
        console.error("Failed to load composed.json:", err);
        setGraph(null);
      }
    };

    fetchComposed();
  }, [userId, graphId]);

  if (!graph) {
    return <div className="p-4 text-red-600">Failed to load graph.</div>;
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {graph.nodes.map((node) => (
          <NodeCard key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
};

export default DisplayHTML;
