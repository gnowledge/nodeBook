export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function fetchNodes() {
  const res = await fetch(`${API_BASE}/api/nodes`);
  return res.json();
}

export async function createNode(data) {
  const res = await fetch(`${API_BASE}/api/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}


