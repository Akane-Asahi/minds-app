/**
 * localStorage Utilities
 * 
 * Helper functions for safely accessing and managing localStorage values
 */

/**
 * Get workspace title from localStorage safely
 * @returns {string} Workspace title or empty string
 */
export const getWorkspaceTitle = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("workspaceTitle") || "";
};

/**
 * Get search query from localStorage safely
 * @returns {string} Search query or empty string
 */
export const getSearchQuery = () => {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem("searchTerm") || "").trim();
};