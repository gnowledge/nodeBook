import React, { useEffect, useState } from "react";
import { marked } from "marked";

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
          <div key={node.id} className="border border-gray-300 rounded-lg shadow-sm p-4 bg-white">
            <h2 className="text-lg font-semibold text-blue-700 mb-1">
              <span dangerouslySetInnerHTML={{ __html: marked.parseInline(node.name || node.node_id) }} />
            </h2>
            {node.description && <p className="mb-2 text-gray-700 text-sm">{node.description}</p>}

            {node.attributes?.length > 0 && (
              <div className="mb-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Attributes</h3>
                <ul className="list-disc list-inside text-gray-800 text-sm">
                  {node.attributes.map((attr, i) => (
                    <li key={i}>
                      {attr.attribute_name ? (
                        <>
                          <span className="font-semibold">{attr.attribute_name}:</span> {attr.value}
                          {attr.unit && ` (${attr.unit})`}
                        </>
                      ) : (
                        <>
                          {attr.value}
                          {attr.unit && ` (${attr.unit})`}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {node.relations?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Relations</h3>
                <ul className="list-disc list-inside text-gray-800 text-sm">
                  {node.relations.map((rel, i) => (
                    <li key={i}>
                      {rel.adverb && (
                        <span className="text-purple-700 font-semibold mr-1">{rel.adverb}</span>
                      )}
                      <span className="text-blue-700 font-semibold">{rel.name}</span>
                      {': '}
                      <span dangerouslySetInnerHTML={{ __html: marked.parseInline(rel.target_name || rel.target) }} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DisplayHTML;
