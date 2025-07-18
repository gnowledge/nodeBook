import yaml from "js-yaml";
import { getApiBase } from "../config";

// Utility function for all API calls
export async function apiCall(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${getApiBase()}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }
  
  return response;
}

// Utility function for authenticated API calls
export async function authenticatedApiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return apiCall(endpoint, {
    ...options,
    headers,
  });
}

// Utility function for loading documentation files
export async function loadDocFile(filename) {
  try {
    // Try to load from the public directory (relative path)
    const response = await fetch(`./doc/${filename}`);
    if (response.ok) {
      return await response.text();
    }
  } catch (error) {
    console.warn(`Failed to load doc file: ${filename}`, error);
  }
  
  // Fallback: return a default message
  return `# ${filename}\n\nDocumentation file not found.`;
}

export async function loadGraphCNL(userId, graphId) {
  const res = await apiCall(`${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/cnl`);
  return await res.text();
}

export async function loadGraph(userId, graphId) {
  const res = await apiCall(`${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/composed`);
  const data = await res.json();
  console.log("Loaded composed.json:", data);
  return data;
}

export async function listGraphsWithTitles(userId) {
  const res = await apiCall(`${getApiBase()}/api/ndf/users/${userId}/graphs`);
  const ids = await res.json();

  // Ensure ids is an array
  if (!Array.isArray(ids)) {
    console.warn("Expected array of graph IDs, got:", ids);
    return [];
  }

  const graphList = await Promise.all(ids.map(async (id) => {
    try {
      const metaRes = await apiCall(`${getApiBase()}/api/ndf/users/${userId}/graphs/${id}/metadata.yaml`);
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
  const res = await apiCall(`${getApiBase()}/api/ndf/users/${userId}/graphs`);
  return await res.json();  // Returns ["graph1", "graph2", ...]
}

export async function saveGraph(userId, graphId, rawMarkdown) {
  const res = await apiCall(`${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}`, {
    method: "PUT",
    headers: { "Content-Type": "text/plain" },
    body: rawMarkdown,
  });
  
  if (!res.ok) {
    throw new Error("Failed to save graph");
  }
}

export async function loadGraphNDF(userId, graphId) {
  const res = await apiCall(`${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/raw`);
  return await res.text();  // Returns markdown
}

export async function parseMarkdown(markdown) {
  const res = await apiCall(`${getApiBase()}/api/ndf/parse-markdown`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw_markdown: markdown }),
  });
  
  if (!res.ok) {
    throw new Error("Failed to parse CNL");
  }
  return res.json();
}
