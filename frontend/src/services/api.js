export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';



export async function fetchNodes() {
  const res = await fetch(`${API_BASE}/api/nodes`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("❌ Failed to parse /api/nodes response:", err);
    throw err;
  }
}



export async function createNode(data) {
  const res = await fetch(`${API_BASE}/api/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}


export async function fetchRelationTypes() {
  const res = await fetch(`${API_BASE}/api/relation-types`);
  return res.json();
}

export async function fetchAttributeTypes() {
  const res = await fetch(`${API_BASE}/api/attribute-types`);
  return res.json();
}

export async function assignAttribute(payload) {
  const res = await fetch(`${API_BASE}/api/attribute/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}
