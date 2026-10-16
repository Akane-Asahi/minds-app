import apiClient from "../../../api/apiClient";

/** Fetches the saved-documents query list (grouped by query) for Saved Results. */
export async function fetchSavedDocumentsQueryList({ searchTopic = "", workspaceId, signal }) {
  const payload = {};
  if (workspaceId) payload.workspaceId = workspaceId;
  if (searchTopic?.trim()) payload.searchTopic = searchTopic.trim();

  const { data } = await apiClient.post(
    `/api/saveddocs/querylist`,
    payload,
    { signal }
  );

  return Array.isArray(data?.list) ? data.list : [];
}
