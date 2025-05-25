export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const userId = "user0";

export async function fetchNodes(userId = "user0", graphId = "graph1") {
  const res = await fetch(`${API_BASE}/api/users/${userId}/graphs/${graphId}/nodes`);
  return res.json();
}

export async function createNode(data) {
  const res = await fetch(`${API_BASE}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchRelationTypes(userId = "user0", graphId = "graph1") {
  const res = await fetch(`${API_BASE}/api/users/${userId}/graphs/${graphId}/relation-types`);
  return res.json();
}

export async function fetchAttributeTypes(userId = "user0", graphId = "graph1") {
  const res = await fetch(`${API_BASE}/api/users/${userId}/graphs/${graphId}/attribute-types`);
  return res.json();
}

export async function listGraphs(user = userId) {
  const res = await fetch(`${API_BASE}/api/users/${user}/graphs`);
  return res.json();
}

export async function createGraphFolder(graphId, user = userId) {
  const res = await fetch(`${API_BASE}/api/users/${user}/graphs/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ graph_id: graphId }),
  });
  return res.json();
}

