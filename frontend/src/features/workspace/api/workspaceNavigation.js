import { normalizeWorkspace } from "../utils/workspaceUtils";

export const LS_KEYS = {
  selectedWorkspaceId: "selectedWorkspaceId",
  workspaceTitle: "workspaceTitle",
};

/**
 * Opens a workspace: navigates to /workspace#tab and dispatches workspace:open.
 * WorkspaceContext listens for workspace:open and owns selection + localStorage.
 * Always dispatches normalized workspace (has _id and title).
 * @param {Object} ws - Workspace (raw or legacy shape)
 * @param {Function} navigate - React Router navigate
 * @param {string} tab - Hash tab (default "saved-results")
 * @param {Object} navigateOptions - Optional react-router navigate options (state, replace)
 */
export function openWorkspace(ws, navigate, tab = "saved-results", navigateOptions = {}) {
  if (!ws) return;

  const normalized = normalizeWorkspace(ws);
  const targetUrl = `/workspace#${tab}`;

  try {
    navigate(targetUrl, navigateOptions);

    // Dispatch normalized workspace so WorkspaceContext always receives _id + title
    window.dispatchEvent(
      new CustomEvent("workspace:open", { detail: normalized })
    );

    // Force hash change event after a short delay to ensure it's processed
    setTimeout(() => {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }, 100);
  } catch (error) {
    console.error("❌ Navigation error:", error);
  }
}
