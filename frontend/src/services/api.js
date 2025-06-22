import yaml from "js-yaml";

export const API_BASE = "/api/ndf";
export const AUTH_BASE = "/api/auth";

export async function loadGraphCNL(userId, graphId) {
  const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/cnl`);
  if (!res.ok) throw new Error("Failed to load CNL");
  return await res.text();
}

export async function loadGraph(userId, graphId) {
  const res = await fetch(`${API_BASE}/users/${userId}/graphs/${graphId}/composed`);
  if (!res.ok) {
    throw new Error(`Failed to load composed graph for ${graphId}`);
  }
  const data = await res.json();
  console.log("Loaded composed.json:", data);
  return data;
}

export async function listGraphsWithTitles(userId) {
  const res = await fetch(`${API_BASE}/users/${userId}/graphs`);
  const ids = await res.json();

  // Ensure ids is an array
  if (!Array.isArray(ids)) {
    console.warn("Expected array of graph IDs, got:", ids);
    return [];
  }

  const graphList = await Promise.all(ids.map(async (id) => {
    try {
      const metaRes = await fetch(`${API_BASE}/users/${userId}/graphs/${id}/metadata.yaml`);
      const meta = await metaRes.text();
      const parsed = yaml.load(meta);
      return { id, title: parsed?.title || id };
    } catch (e) {
      return { id, title: id };
    }
  }));

  return graphList;
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
