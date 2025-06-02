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

  if (!parsedYaml || !parsedYaml.nodes) return <div style={{ padding: '1rem' }}>Loading graph data...</div>;

  const gridStyle = {
    display: 'grid',
    gap: '1.5rem',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    margin: 0,
    padding: 0,
  };

  const cardStyle = (isActive) => ({
    marginBottom: '2rem',
    border: isActive ? '2px solid #2563eb' : '1px solid #ccc',
    borderRadius: '12px',
    padding: '1rem',
    background: isActive ? '#f0f6ff' : '#fff',
    boxShadow: isActive
      ? '0 4px 16px rgba(37,99,235,0.15)'
      : '0 2px 8px rgba(0,0,0,0.07)',
    transition: 'all 0.2s',
    cursor: 'pointer',
    outline: isActive ? '2px solid #2563eb' : undefined,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 200,
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(0,0,0,0.1)'
    }
  });

  const preStyle = {
    whiteSpace: 'pre-wrap',
    background: '#f3f4f6',
    padding: '0.5rem',
    borderRadius: '6px',
    fontSize: '0.95em',
    overflowX: 'auto',
    flex: 1,
    marginBottom: '0.5rem'
  };
  const sectionTitleStyle = {
    fontSize: '1.2rem',
    fontWeight: 600,
    marginBottom: '0.5rem'
  };
  const labelStyle = {
    color: '#555',
    fontWeight: 500,
    fontSize: '0.9em',
    marginBottom: '0.2rem'
  };
  const ulStyle = {
    marginLeft: '1.2em',
    fontSize: '0.95em',
    color: '#222',
    marginBottom: 0,
    paddingLeft: 0,
    listStyle: 'disc'
  };
  const liStyle = {
    marginBottom: '0.2em'
  };
  const relTargetStyle = {
    color: '#2563eb',
    fontWeight: 500,
    cursor: 'pointer'
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={gridStyle}>
        {parsedYaml.nodes.map((node) => {
          const isActive = activeNode === node.id;
          return (
            <div
              key={node.id}
              style={cardStyle(isActive)}
              id={node.id}
              tabIndex={0}
              onClick={() => {
                window.location.hash = `#${node.id}`;
                document.getElementById(node.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              <h2 style={sectionTitleStyle}>{node.id}</h2>
              <pre style={preStyle}>{node.description}</pre>
              {node.attributes?.length > 0 && (
                <div style={{ marginTop: '0.5em' }}>
                  <div style={labelStyle}>Attributes:</div>
                  <ul style={ulStyle}>
                    {node.attributes.map((attr, i) => (
                      <li key={i} style={liStyle}>
                        <span style={{ fontWeight: 600 }}>{attr.name}</span>: {attr.value} {attr.unit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {node.relations?.length > 0 && (
                <div style={{ marginTop: '0.5em' }}>
                  <div style={labelStyle}>Relations:</div>
                  <ul style={ulStyle}>
                    {node.relations.map((rel, i) => (
                      <li key={i} style={liStyle}>
                        <span style={{ fontWeight: 600 }}>{rel.name}</span> ➝{' '}
                        <span
                          style={relTargetStyle}
                          onClick={() => {
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
