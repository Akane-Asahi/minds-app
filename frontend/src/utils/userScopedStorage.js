/**
 * User-Scoped LocalStorage Helper
 * 
 * Prevents data leakage between users by prefixing keys with userId.
 * If userId is not available, returns null/does nothing (no persistence).
 */

/**
 * Parse the raw participantSession blob from localStorage.
 * @returns {object|null} Parsed session, or null if absent/invalid
 */
export const getParticipantSession = () => {
  try {
    const s = localStorage.getItem("participantSession");
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};

/**
 * Get authenticated user _id (MongoDB User document id) for scoping.
 * Uses participantSession._id from login (data.userId), NOT participantId.
 * @returns {string|null} Authenticated user _id or null if no session
 */
export const getCurrentUserId = () => {
  const parsed = getParticipantSession();
  return parsed?._id || parsed?.id || null;
};

/**
 * Build user-scoped storage key
 * @param {string} userId - User ID
 * @param {string} workspaceId - Workspace ID (optional)
 * @param {string} field - Field name
 * @returns {string|null} Scoped key or null if userId not provided
 */
export const getWorkspaceKey = (userId, workspaceId, field) => {
  if (!userId) return null;
  
  if (workspaceId) {
    return `user_${userId}_workspace_${workspaceId}_${field}`;
  }
  return `user_${userId}_${field}`;
};

/**
 * Per-workspace SERP cache in localStorage (searchResults, lastSearchTerm, hasSearched).
 * Preserved across logout/login for the same user so the SERP can be restored without a new timeline query.
 */
const isUserScopedSerpCacheKey = (key) => {
  if (!key || typeof key !== "string") return false;
  if (!key.startsWith("user_") || !key.includes("_workspace_")) return false;
  return (
    key.endsWith("_searchResults") ||
    key.endsWith("_lastSearchTerm") ||
    key.endsWith("_hasSearched")
  );
};

/**
 * Get value from user-scoped storage (internal; use convenience helpers instead)
 * @param {string} workspaceId - Workspace ID (optional)
 * @param {string} field - Field name
 * @returns {string|null} Stored value or null
 */
const getWorkspaceStorage = (workspaceId, field) => {
  const userId = getCurrentUserId();
  if (!userId) return null;
  
  const key = getWorkspaceKey(userId, workspaceId, field);
  if (!key) return null;
  
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/**
 * Set value in user-scoped storage
 * @param {string} workspaceId - Workspace ID (optional)
 * @param {string} field - Field name
 * @param {string} value - Value to store
 * @returns {boolean} True if stored, false if userId not available
 */
export const setWorkspaceStorage = (workspaceId, field, value) => {
  const userId = getCurrentUserId();
  if (!userId) return false;
  
  const key = getWorkspaceKey(userId, workspaceId, field);
  if (!key) return false;
  
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Remove value from user-scoped storage
 * @param {string} workspaceId - Workspace ID (optional)
 * @param {string} field - Field name
 * @returns {boolean} True if removed, false if userId not available
 */
export const removeWorkspaceStorage = (workspaceId, field) => {
  const userId = getCurrentUserId();
  if (!userId) return false;
  
  const key = getWorkspaceKey(userId, workspaceId, field);
  if (!key) return false;
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

/**
 * Workspace keys that must be cleared on participant switch (study-critical).
 * workspaceNavigation.js and others persist these; P2 must never inherit P1's context.
 */
const WORKSPACE_KEYS_TO_CLEAR = [
  "selectedWorkspaceId",
  "workspaceTitle",
  "selectedWorkspace",
  "wsId",
  "currentWorkspace",
  "workspaces",
  "workspaceList",
  "searchTerm",
  "searchTopic",
  "lastWorkspace",
  "timelineCache",
];

/**
 * Clear all workspace-related cached values from localStorage and sessionStorage.
 * Called on login (user switch) and logout to prevent next participant inheriting previous context.
 */
export const clearWorkspaceCacheOnUserSwitch = () => {
  try {
    WORKSPACE_KEYS_TO_CLEAR.forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const lower = key.toLowerCase();
      if (isUserScopedSerpCacheKey(key)) {
        /* keep */
      } else if (
        lower.includes("workspace") ||
        lower.includes("wsid") ||
        lower.startsWith("ws_")
      ) {
        keysToRemove.push(key);
      }
      if (key.startsWith("currentQueryId_")) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    // Also clear sessionStorage workspace keys
    try {
      const ssKeys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (!key) continue;
        const lower = key.toLowerCase();
        if (lower.includes("workspace") || lower.includes("wsid") || lower.startsWith("ws_")) {
          ssKeys.push(key);
        }
      }
      ssKeys.forEach((k) => sessionStorage.removeItem(k));
    } catch (_) {}
  } catch (e) {
    console.error("[AUTH] clearWorkspaceCacheOnUserSwitch error:", e);
  }
};

/**
 * Clean up old workspace keys (without user prefix) for migration
 * Called on login to avoid confusion
 */
export const cleanupOldWorkspaceKeys = () => {
  try {
    const userId = getCurrentUserId();
    if (!userId) return;
    
    // Find all keys that start with "workspace_" (old format)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("workspace_")) {
        keysToRemove.push(key);
      }
    }
    
    // Remove old keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
  } catch (error) {
    console.error('[userScopedStorage] Error cleaning up old keys:', error);
  }
};

/**
 * Remove ALL localStorage keys for the current user (including SERP cache).
 * Use on participant logout for strict study isolation when the same browser is reused.
 */
export const clearAllUserScopedStorageForCurrentUser = () => {
  try {
    const userId = getCurrentUserId();
    if (!userId) return;

    const prefix = `user_${userId}_`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error("[userScopedStorage] clearAllUserScopedStorageForCurrentUser error:", error);
  }
};

/**
 * Clean up all user-scoped storage for current user
 * Called on logout
 */
export const cleanupUserStorage = () => {
  try {
    const userId = getCurrentUserId();
    if (!userId) return;
    
    const prefix = `user_${userId}_`;
    const keysToRemove = [];
    
    // Find all keys for this user
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove user-scoped keys (keep per-workspace SERP snapshot so the same user sees SERP after re-login)
    keysToRemove.forEach((key) => {
      if (isUserScopedSerpCacheKey(key)) return;
      localStorage.removeItem(key);
    });
    // Non-user-scoped workspace globals (selectedWorkspaceId, searchTerm, etc.) are cleared by
    // clearWorkspaceCacheOnUserSwitch(), which always runs immediately after this in the logout
    // sequence (see performParticipantLogout) — no need to duplicate that list here.
  } catch (error) {
    console.error('[userScopedStorage] Error cleaning up user storage:', error);
  }
};

export const getWorkspaceLastSearchTerm = (workspaceId) => {
  return getWorkspaceStorage(workspaceId, 'lastSearchTerm');
};

export const setWorkspaceLastSearchTerm = (workspaceId, value) => {
  return setWorkspaceStorage(workspaceId, 'lastSearchTerm', value);
};

export const removeWorkspaceLastSearchTerm = (workspaceId) => {
  return removeWorkspaceStorage(workspaceId, 'lastSearchTerm');
};

export const setWorkspaceHasSearched = (workspaceId, value) => {
  return setWorkspaceStorage(workspaceId, 'hasSearched', value);
};

export const removeWorkspaceHasSearched = (workspaceId) => {
  return removeWorkspaceStorage(workspaceId, 'hasSearched');
};

export const getWorkspaceSearchResults = (workspaceId) => {
  const value = getWorkspaceStorage(workspaceId, 'searchResults');
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const setWorkspaceSearchResults = (workspaceId, value) => {
  try {
    return setWorkspaceStorage(workspaceId, 'searchResults', JSON.stringify(value));
  } catch {
    return false;
  }
};

export const removeWorkspaceSearchResults = (workspaceId) => {
  return removeWorkspaceStorage(workspaceId, 'searchResults');
};

/**
 * Text to show in the header search box: last submitted term, or term from stored SERP snapshot.
 */
export const getWorkspaceSearchBoxTerm = (workspaceId) => {
  if (!workspaceId) return "";
  const last = getWorkspaceLastSearchTerm(workspaceId);
  if (last != null && String(last).trim()) return String(last).trim();
  try {
    const snap = getWorkspaceSearchResults(workspaceId);
    if (snap && typeof snap === "object" && typeof snap.term === "string" && snap.term.trim()) {
      return snap.term.trim();
    }
  } catch {
    /* ignore */
  }
  return "";
};

/** Falls back to the legacy unscoped "selectedWorkspaceId" key when no session exists yet. */
export const getSelectedWorkspaceId = () => {
  const scoped = getWorkspaceStorage(null, 'selectedWorkspaceId');
  if (scoped !== null) return scoped;
  return localStorage.getItem('selectedWorkspaceId');
};

/** Writes both the scoped and legacy keys, so pre-migration readers still see the value. */
export const setSelectedWorkspaceId = (value) => {
  const stored = setWorkspaceStorage(null, 'selectedWorkspaceId', value);
  if (value) localStorage.setItem('selectedWorkspaceId', value);
  else localStorage.removeItem('selectedWorkspaceId');
  return stored;
};

export const setSearchTerm = (value) => setWorkspaceStorage(null, 'searchTerm', value);

/** Kept so a stale workspace selection isn't shown once legacy keys are cleared. */
export const getWorkspaceTitle = () => getWorkspaceStorage(null, 'workspaceTitle');

export const setWorkspaceTitle = (value) => setWorkspaceStorage(null, 'workspaceTitle', value);

export const getSelectedWorkspaceObject = () => {
  const raw = getWorkspaceStorage(null, 'selectedWorkspace');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setSelectedWorkspaceObject = (value) => {
  if (value == null) return removeWorkspaceStorage(null, 'selectedWorkspace');
  try {
    return setWorkspaceStorage(null, 'selectedWorkspace', JSON.stringify(value));
  } catch {
    return false;
  }
};

/** Call on logout or when navigating away from a workspace, to avoid leaking it to the next user. */
export const clearSelectedWorkspaceStorage = () => {
  setSelectedWorkspaceId(null);
  removeWorkspaceStorage(null, 'workspaceTitle');
  removeWorkspaceStorage(null, 'selectedWorkspace');
};

