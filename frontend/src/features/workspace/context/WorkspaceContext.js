import { createContext, useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { normalizeWorkspace } from "../utils/workspaceUtils";
import {
  getSelectedWorkspaceId,
  setSelectedWorkspaceId,
  getWorkspaceTitle,
  setWorkspaceTitle,
  getSelectedWorkspaceObject,
  setSelectedWorkspaceObject,
  clearSelectedWorkspaceStorage,
} from "../../../utils/userScopedStorage";

const LS_KEYS = {
  selectedWorkspaceId: "selectedWorkspaceId",
  workspaceTitle: "workspaceTitle",
  selectedWorkspace: "selectedWorkspace",
};

// Normalized shape: { _id, title, color } | null (ws_id/ws_title kept for backward compat)
export const WorkspaceContext = createContext({
  selectedWorkspace: null,
  setSelectedWorkspace: () => {},
});

function readStoredWorkspace() {
  const id = getSelectedWorkspaceId();
  const title = getWorkspaceTitle() || localStorage.getItem(LS_KEYS.workspaceTitle);
  const storedObj = getSelectedWorkspaceObject();
  const legacyStored = localStorage.getItem(LS_KEYS.selectedWorkspace);
  let color = null;
  const parsed = storedObj || (legacyStored ? (() => { try { return JSON.parse(legacyStored); } catch { return null; } })() : null);
  if (parsed) color = parsed.color ?? null;
  if (!id || !title) return null;
  const ws = { _id: id, title, ws_id: id, ws_title: title, color };
  return ws;
}

export function WorkspaceProvider({ children }) {
  const [selectedWorkspace, setSelectedWorkspaceState] = useState(() => readStoredWorkspace());

  const location = useLocation();

  // Clear workspace when on workspace list page
  useEffect(() => {
    if (location.pathname === "/workspaces") {
      clearSelectedWorkspaceStorage();
      localStorage.removeItem(LS_KEYS.workspaceTitle);
      localStorage.removeItem(LS_KEYS.selectedWorkspace);
      setSelectedWorkspaceState(null);
      localStorage.removeItem('searchTerm');
      localStorage.removeItem('searchTopic');
      window.dispatchEvent(new CustomEvent('searchTermChanged', { detail: '' }));
      window.dispatchEvent(new CustomEvent('ws:workspace:changed', { detail: { workspaceId: null } }));
    }
  }, [location.pathname]);

  // setter: updates state and localStorage; normalizes workspace to { _id, title, color }
  const setSelectedWorkspace = useCallback(async (ws) => {
    const norm = ws ? normalizeWorkspace(ws) : null;
    const id = norm?._id || norm?.ws_id;
    const title = norm?.title || norm?.ws_title;
    const previousWorkspaceId = selectedWorkspace?._id || selectedWorkspace?.ws_id || null;

    if (norm && id && title) {
      const isDifferentWorkspace =
        previousWorkspaceId !== null && previousWorkspaceId !== id;

      const newState = {
        _id: id,
        title,
        ws_id: id,
        ws_title: title,
        color: norm.color ?? null,
      };
      setSelectedWorkspaceId(id);
      setWorkspaceTitle(title);
      setSelectedWorkspaceObject(newState);
      localStorage.setItem(LS_KEYS.workspaceTitle, title);
      localStorage.setItem(LS_KEYS.selectedWorkspace, JSON.stringify(newState));
      setSelectedWorkspaceState(newState);

      window.dispatchEvent(new CustomEvent("ws:workspace:changed", { detail: { workspaceId: id } }));

      if (isDifferentWorkspace) {
        localStorage.removeItem("searchTerm");
        window.dispatchEvent(new CustomEvent("searchTermChanged", { detail: "" }));
      }
    } else {
      clearSelectedWorkspaceStorage();
      localStorage.removeItem(LS_KEYS.workspaceTitle);
      localStorage.removeItem(LS_KEYS.selectedWorkspace);
      setSelectedWorkspaceState(null);
      window.dispatchEvent(new CustomEvent("ws:workspace:changed", { detail: { workspaceId: null } }));
    }
  }, [selectedWorkspace?._id, selectedWorkspace?.ws_id]);

  // Reset selection when user switches (e.g. P1 -> P02) - no selection leak
  useEffect(() => {
    const onUserSwitched = () => {
      clearSelectedWorkspaceStorage();
      localStorage.removeItem(LS_KEYS.workspaceTitle);
      localStorage.removeItem(LS_KEYS.selectedWorkspace);
      setSelectedWorkspaceState(null);
    };
    window.addEventListener("auth:user:switched", onUserSwitched);
    return () => window.removeEventListener("auth:user:switched", onUserSwitched);
  }, []);

  // Listen for workspace:open (from openWorkspace in workspaceNavigation)
  useEffect(() => {
    const onOpen = (e) => setSelectedWorkspace(e.detail);
    window.addEventListener("workspace:open", onOpen);
    return () => window.removeEventListener("workspace:open", onOpen);
  }, [setSelectedWorkspace]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e) => {
      if (
        e.key === LS_KEYS.selectedWorkspaceId ||
        e.key === LS_KEYS.workspaceTitle ||
        e.key === LS_KEYS.selectedWorkspace
      ) {
        setSelectedWorkspaceState(readStoredWorkspace());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{ selectedWorkspace, setSelectedWorkspace }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}