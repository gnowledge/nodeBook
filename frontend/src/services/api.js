import yaml from "js-yaml";

const API_BASE = "/api/ndf";

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

export async function listGraphs(userId) {
  const res = await fetch(`${API_BASE}/users/${userId}/graphs`);
  const json = await res.json();
  return json;
}

export async function saveGraph(userId, graphId, graph) {
  const res = await fetch(`${API_BASE}/users/${userId}/graphs/${graphId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(graph),
  });
  if (!res.ok) {
    throw new Error("Failed to save graph");
  }
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
