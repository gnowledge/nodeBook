// src/api.ts
// WORKAROUND: A persistent environmental caching issue is preventing imports from './types.ts'.
// All necessary types are temporarily inlined here to unblock development.

// --- Inlined Types ---
export interface User { id: string; username: string; email?: string; isAdmin?: boolean; }
export interface Graph { id: string; name: string; description: string; author: string; email: string; createdAt: string; updatedAt: string; }
export interface Node { id: string; base_name: string; name: string; adjective: string | null; quantifier: string | null; role: string; description: string | null; parent_types: string[]; }
export interface Edge { id: string; source_id: string; target_id: string; name: string; }
export interface Attribute { id: string; source_id: string; name: string; value: string | number | boolean; }
export interface GraphData { nodes: Node[]; relations: Edge[]; attributes: Attribute[]; }
export interface CnlDiffResult { message?: string; errors?: { line: number; message: string }[]; }


// --- Auth API ---
// Note: Authentication is now handled by Keycloak
// These functions are kept for backward compatibility but redirect to Keycloak

import { keycloakAuth, type AuthResult } from './services/keycloakAuth';

export async function register(username: string, password: string, email: string): Promise<{ token: string; user: User }> {
  // Redirect to Keycloak registration
  await keycloakAuth.register();
  throw new Error('Redirecting to registration...');
}

export async function login(username: string, password: string): Promise<{ token: string; user: User }> {
  const result: AuthResult = await keycloakAuth.login(username, password);
  keycloakAuth.storeAuth(result.token, result.user);
  return result;
}

export async function logout(): Promise<void> {
  keycloakAuth.logout();
}

export async function getCurrentUser(): Promise<User | null> {
  const token = keycloakAuth.getToken();
  if (!token) {
    return null;
  }
  
  // Validate token with backend
  return await keycloakAuth.validateToken(token);
}

// --- Graph API ---

export async function getGraphs(): Promise<Graph[]> {
    const response = await fetch('/api/graphs');
    if (!response.ok) throw new Error('Failed to fetch graphs');
    return response.json();
}

export async function createGraph(name: string): Promise<Graph> {
    const response = await fetch('/api/graphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create graph');
    }
    return response.json();
}

export async function getGraphData(graphId: string): Promise<GraphData> {
    const response = await fetch(`/api/graphs/${graphId}/graph`);
    if (!response.ok) throw new Error('Failed to fetch graph data');
    return response.json();
}

export async function getGraphCnl(graphId: string): Promise<{ cnl: string }> {
    const response = await fetch(`/api/graphs/${graphId}/cnl`);
    if (!response.ok) throw new Error('Failed to fetch CNL');
    return response.json();
}

export async function updateGraphCnl(graphId: string, cnlText: string): Promise<CnlDiffResult> {
    const response = await fetch(`/api/graphs/${graphId}/cnl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnlText }),
    });
    return response.json();
}