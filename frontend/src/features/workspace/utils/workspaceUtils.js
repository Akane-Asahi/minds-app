/**
 * Shared workspace utilities.
 * Ensures _id and title are always present (ws_id/ws_title for backward compat).
 */

/**
 * Normalize workspace to always have _id and title.
 * @param {Object} w - Raw workspace from API or legacy shape
 * @returns {Object} Normalized workspace
 */
export function normalizeWorkspace(w) {
  if (!w) return w;
  const id = w._id || w.ws_id;
  const title = w.title || w.ws_title;
  return { ...w, _id: id, title, ws_id: id, ws_title: title };
}
