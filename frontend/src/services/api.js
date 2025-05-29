import yaml from "js-yaml";

const API_BASE = "/api/ndf";

export async function loadGraphCNL(userId, graphId) {
  const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/cnl`);
  if (!res.ok) throw new Error("Failed to load CNL");
  return await res.text();
}

export async function loadGraph(userId, graphId) {
  const res = await fetch(`${API_BASE}/users/${userId}/graphs/${graphId}`);
  const text = await res.text();
  try {
    const parsed = yaml.load(text);
    console.log("Parsed .ndf graph:", parsed);
    return parsed;
  } catch (e) {
    console.error("Failed to parse YAML:", e);
    throw new Error("Invalid NDF format");
  }
}

export async function listGraphs(userId = "user0") {
  const res = await fetch(`${API_BASE}/users/${userId}/graphs`);
  if (!res.ok) throw new Error("Failed to list graphs");
  return await res.json();  // Returns ["graph1", "graph2", ...]
}

export async function saveGraph(userId, graphId, rawMarkdown) {
  const res = await fetch(`${API_BASE}/users/${userId}/graphs/${graphId}`, {
    method: "PUT",
    headers: { "Content-Type": "text/plain" },
    body: rawMarkdown,
  });
  if (!res.ok) {
    throw new Error("Failed to save graph");
  }
}

export async function loadGraphNDF(userId, graphId) {
  const res = await fetch(`${API_BASE}/users/${userId}/graphs/${graphId}/raw`);
  if (!res.ok) throw new Error(`Failed to load graph ${graphId}`);
  return await res.text();  // Returns markdown
}


export async function parseMarkdown(markdown) {
  const res = await fetch(`${API_BASE}/parse-markdown`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw_markdown: markdown }),
  });
  if (!res.ok) {
    throw new Error("Failed to parse CNL");
  }
  return res.json();
}
