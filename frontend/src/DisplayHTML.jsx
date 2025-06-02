import React, { useEffect, useState } from 'react';
import yaml from 'js-yaml';

export default function DisplayHTML({ userId, graphId }) {
  const [parsedYaml, setParsedYaml] = useState(null);
  const [activeNode, setActiveNode] = useState(null);

  useEffect(() => {
    const onHashChange = () => {
      setActiveNode(window.location.hash.replace(/^#/, ""));
    };
    window.addEventListener("hashchange", onHashChange);
    onHashChange();
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!userId || !graphId) return;

    const fetchData = async () => {
      try {
        const resYaml = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/parsed`);
        const parsedText = await resYaml.text();
        const parsed = yaml.load(parsedText);
        setParsedYaml(parsed);
      } catch (err) {
        console.error("❌ Error loading parsed YAML:", err);
      }
    };

    fetchData();
  }, [userId, graphId]);

  if (!parsedYaml || !parsedYaml.nodes) return <div className="p-4">Loading graph data...</div>;

  return (
    <div className="p-4">
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {parsedYaml.nodes.map((node) => {
          const isActive = activeNode === node.id;
          return (
            <div
              key={node.id}
              id={node.id}
              tabIndex={0}
              onClick={() => {
                window.location.hash = `#${node.id}`;
                document.getElementById(node.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className={`transition-all duration-200 cursor-pointer flex flex-col min-h-52 mb-8 rounded-xl p-4 shadow-md bg-white border ${isActive ? 'border-blue-600 bg-blue-50 shadow-lg' : 'border-gray-200 hover:shadow-lg'}`}
            >
              <h2 className="text-xl font-bold mb-2">{node.id}</h2>
              <pre className="whitespace-pre-wrap bg-gray-100 rounded px-2 py-1 text-sm mb-2 flex-1">{node.description}</pre>
              {node.attributes?.length > 0 && (
                <div className="mt-2">
                  <div className="text-gray-700 font-semibold text-sm mb-1">Attributes:</div>
                  <ul className="ml-4 text-sm text-gray-800 list-disc">
                    {node.attributes.map((attr, i) => (
                      <li key={i} className="mb-1">
                        <span className="font-semibold">{attr.name}</span>: {attr.value} {attr.unit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {node.relations?.length > 0 && (
                <div className="mt-2">
                  <div className="text-gray-700 font-semibold text-sm mb-1">Relations:</div>
                  <ul className="ml-4 text-sm text-gray-800 list-disc">
                    {node.relations.map((rel, i) => (
                      <li key={i} className="mb-1">
                        <span className="font-semibold">{rel.name}</span> ➝{' '}
                        <span
                          className="text-blue-700 font-semibold cursor-pointer hover:underline"
                          onClick={e => {
                            e.stopPropagation();
                            window.location.hash = `#${rel.target}`;
                            document.getElementById(rel.target)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                        >
                          {rel.target}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
