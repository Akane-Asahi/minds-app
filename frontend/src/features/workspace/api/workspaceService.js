/**
 * Workspace Service - Handles workspace API calls
 * 
 * Reads token fresh from localStorage at request time to prevent stale token
 * when switching participants (P1 -> P2).
 */

import apiClient from "../../../api/apiClient";
import { normalizeWorkspace } from "../utils/workspaceUtils";

const emptyOn404 = async (p, fallback = []) => {
  try {
    const { data } = await p;
    return data ?? fallback;
  } catch (e) {
    if (e?.response?.status === 404) return fallback;
    throw e;
  }
};

/** -------- Workspaces -------- */

/** 
 * Create a new workspace
 * @param {Object} payload - Must contain { title: string, color?: string }
 * Backend expects 'title' and optionally 'color'
 */
export async function createWorkspace(payload) {
  const title = (payload.title || "").trim();
  const color = payload.color;
  const requestBody = { title };
  if (color !== undefined) requestBody.color = color;
  const { data } = await apiClient.post("/api/workspaces", requestBody);
  return normalizeWorkspace(data) ?? data;
}

/** Get all workspaces for authenticated user */
export async function fetchAllWorkspaces(signal) {
  // Read token fresh at request time (never from module-level cache)
  const config = { headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } };
  if (signal) config.signal = signal;

  const raw = await emptyOn404(
    apiClient.get(`/api/workspaces/allworkspace?ts=${Date.now()}`, config),
    []
  );
  return Array.isArray(raw) ? raw.map(normalizeWorkspace) : raw;
}

/** Get a single workspace by ID */
export async function fetchWorkspaceById(workspaceId) {
  const data = await emptyOn404(apiClient.get(`/api/workspaces/${workspaceId}/workspace`), null);
  return data;
}

/** Update a workspace by ID */
export async function updateWorkspace(workspaceId, updates) {
  const u = typeof updates === "string" ? { title: updates } : updates || {};
  const payload = {};
  if (u.title !== undefined) payload.title = u.title;
  if (u.color !== undefined) payload.color = u.color;
  const { data } = await apiClient.put(`/api/workspaces/${workspaceId}/workspace`, payload);
  return normalizeWorkspace(data) ?? data;
}

/** Delete a workspace by ID (canonical route) */
export async function deleteWorkspace(workspaceId) {
  const res = await apiClient.delete(`/api/workspaces/${workspaceId}/workspace`);
  return res.data ?? { ok: res.status === 204 };
}

export default apiClient;
