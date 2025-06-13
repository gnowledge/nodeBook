import React from "react";
import { marked } from "marked";

function NodeCard({ node }) {
  return (
    <div id={"node-" + (node.node_id || node.id)} className="border border-gray-300 rounded-lg shadow-sm p-4 bg-white">
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
                <a
                  href={"#node-" + (rel.target || rel.target_node_id)}
                  className="text-blue-600 underline hover:text-blue-900"
                  style={{ cursor: 'pointer' }}
                >
                  <span dangerouslySetInnerHTML={{ __html: marked.parseInline(rel.target_name || rel.target) }} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default NodeCard;
