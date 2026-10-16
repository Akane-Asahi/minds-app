/**
 * Query Service
 *
 * Search query and topic management. Backend identity from JWT only.
 */

import apiClient from "../../../api/apiClient";
import { getWorkspaceTitle } from "../../../utils/localStorageUtils";
import { getSelectedWorkspaceId } from "../../../utils/userScopedStorage";

/**
 * Get queries for current workspace.
 * @param {Function} setQueries - Queries callback
 * @param {string} searchTopic - Search topic (workspace title)
 */
export const getQueryList = async (setQueries, searchTopic) => {
  try {
    const workspaceId = getSelectedWorkspaceId();
    if (!workspaceId) {
      setQueries?.([]);
      return;
    }
    const payload = {
      searchTopic: searchTopic || getWorkspaceTitle(),
      workspaceId,
    };
    const response = await apiClient.post("/api/saveddocs/querylist", payload);
    setQueries?.(Array.isArray(response.data?.list) ? response.data.list : []);
  } catch (error) {
    setQueries?.([]);
  }
};

/**
 * Save a search query for history tracking (Queries collection).
 * Server sets searchTopic from the workspace title; client only sends the typed search string as `query`.
 * @param {string} query - Search string (workspace title for the first run after creation; user text afterward)
 * @param {string} workspaceId - Optional workspace ID
 * @returns {Promise<string|null>} queryId or null
 */
export const saveQueryOnSearch = async (query, workspaceId = null) => {
  if (!query?.trim()) return null;

  try {
    const wsId = workspaceId || getSelectedWorkspaceId();
    const response = await apiClient.post("/api/saveddocs/saveQueryOnSearch", {
      query: query.trim(),
      os: "web",
      workspaceId: wsId,
    });
    const queryId = response.data?.queryId || null;
    if (queryId && wsId && typeof window !== "undefined") {
      localStorage.setItem(`currentQueryId_${wsId}`, queryId);
    }
    return queryId;
  } catch (error) {
    return null;
  }
};

