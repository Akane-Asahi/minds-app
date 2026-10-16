/**
 * Centralized participant login/logout and storage isolation for Baseline study sessions.
 */

import { authLog } from "../utils/debugLog";
import {
  cleanupUserStorage,
  clearAllUserScopedStorageForCurrentUser,
  clearWorkspaceCacheOnUserSwitch,
  cleanupOldWorkspaceKeys,
} from "../utils/userScopedStorage";

/** Keys cleared on every participant logout / before new login. */
export const PARTICIPANT_AUTH_STORAGE_KEYS = [
  "uid",
  "user",
  "participantSession",
  "participantId",
  "selectedWorkspaceId",
  "workspaceTitle",
  "selectedWorkspace",
  "searchTerm",
  "searchTopic",
  "token",
  "accessToken",
  "refreshToken",
  "viewOnly",
  "returnPath",
];

const SESSION_STORAGE_KEYS_ON_LOGOUT = [
  "sessionExpiredMessage",
];

/**
 * Remove participant auth and workspace globals from browser storage.
 */
export function clearParticipantBrowserStorage() {
  const cleared = [];
  try {
    PARTICIPANT_AUTH_STORAGE_KEYS.forEach((k) => {
      if (localStorage.getItem(k) != null) {
        localStorage.removeItem(k);
        cleared.push(k);
      }
    });
    SESSION_STORAGE_KEYS_ON_LOGOUT.forEach((k) => {
      if (sessionStorage.getItem(k) != null) {
        sessionStorage.removeItem(k);
        cleared.push(`session:${k}`);
      }
    });
    // Dynamic workspace/query keys
    const dynamic = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("currentQueryId_")) dynamic.push(key);
    }
    dynamic.forEach((k) => {
      localStorage.removeItem(k);
      cleared.push(k);
    });
  } catch (e) {
    authLog("clear storage error", e?.message);
  }
  return cleared;
}

/**
 * Run before a new participant logs in (clears previous participant globals).
 */
export function prepareParticipantLogin() {
  authLog("prepare login — clearing prior participant globals");
  clearWorkspaceCacheOnUserSwitch();
}

/**
 * After successful participant-login API and setParticipant.
 */
export function finalizeParticipantLogin() {
  cleanupOldWorkspaceKeys();
  return null;
}

/**
 * Full storage/context cleanup on logout. Never throws.
 * @returns {Promise<{ cleared: string[] }>}
 */
export async function performParticipantLogout({ clearParticipant } = {}) {
  authLog("logout clicked");

  try {
    clearAllUserScopedStorageForCurrentUser();
    cleanupUserStorage();
    clearWorkspaceCacheOnUserSwitch();
  } catch (e) {
    authLog("user storage cleanup error", e?.message);
  }

  const cleared = clearParticipantBrowserStorage();
  authLog(`cleared keys=${cleared.join(",") || "(none)"}`);

  if (typeof clearParticipant === "function") {
    clearParticipant();
  }

  authLog("navigate /start");
  return { cleared };
}
