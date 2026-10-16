import { useCallback, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Box } from "@mui/material";
import SearchResult from "../components/SearchResult";
import { getWorkspaceSearchBoxTerm } from "../../../utils/userScopedStorage";

export default function SerpView({
  participant,
  searchTerm = "",
  onSwitchToSaved,
  workspace,
  wsId,
  workspaceTitle,
  onResourceChange,
  viewKey,
}) {
  const [searchParams] = useSearchParams();
  const qFromUrl = searchParams.get("q") || "";
  const searchTermPropHasBeenSet = useRef(false);
  const lastResolvedWsIdRef = useRef(wsId);
  if (lastResolvedWsIdRef.current !== wsId) {
    lastResolvedWsIdRef.current = wsId;
    searchTermPropHasBeenSet.current = false;
  }

  const resolvedTerm = useMemo(() => {
    const fromProp = (searchTerm || "").trim();
    const fromUrl = (qFromUrl || "").trim();
    const workspaceCanonical = wsId ? (getWorkspaceSearchBoxTerm(wsId) || "").trim() : "";

    if (
      wsId &&
      workspaceCanonical &&
      fromProp &&
      workspaceCanonical !== fromProp &&
      (!fromUrl || fromUrl === workspaceCanonical)
    ) {
      return workspaceCanonical;
    }

    if (fromProp) searchTermPropHasBeenSet.current = true;
    if (searchTermPropHasBeenSet.current) {
      if (!fromProp && workspaceCanonical) {
        return workspaceCanonical;
      }
      return fromProp;
    }
    return fromProp || fromUrl || workspaceCanonical || "";
  }, [searchTerm, qFromUrl, wsId]);

  const safeWorkspaceTitle = useMemo(() => {
    try {
      return (
        workspaceTitle ||
        workspace?.ws_title ||
        localStorage.getItem("workspaceTitle") ||
        ""
      );
    } catch {
      return workspaceTitle || workspace?.ws_title || "";
    }
  }, [workspaceTitle, workspace]);

  useEffect(() => {
    try {
      const wsTitle =
        safeWorkspaceTitle ||
        localStorage.getItem("workspaceTitle") ||
        "";
      if (wsTitle) {
        localStorage.setItem("workspaceTitle", wsTitle);
        localStorage.setItem("searchTopic", wsTitle);
      }
    } catch {}
  }, [safeWorkspaceTitle]);

  useEffect(() => {
    const term = (resolvedTerm || "").trim();
    if (!term) return;

    if (typeof onResourceChange === "function") {
      onResourceChange({ type: "search", term, mode: "optimistic" });
    }

    const t = setTimeout(() => {
      if (typeof onResourceChange === "function") {
        onResourceChange({ type: "search", term, mode: "confirm" });
      }
    }, 250);

    return () => clearTimeout(t);
  }, [resolvedTerm, onResourceChange]);

  const mountedRef = useRef(false);

  const goSavedResults = useCallback(() => {
    try {
      window.location.hash = "all";
    } catch {}
    if (typeof onSwitchToSaved === "function") onSwitchToSaved();
  }, [onSwitchToSaved]);

  const setActiveTab = useCallback(
    (v) => {
      if (!mountedRef.current) {
        mountedRef.current = true;
      }
      if (v === "all" || v === "saved-results") goSavedResults();
    },
    [goSavedResults]
  );

  const navigateToAll = goSavedResults;

  const handleResourceChange = useCallback(
    (...args) => {
      if (typeof onResourceChange === "function") onResourceChange(...args);
    },
    [onResourceChange]
  );

  if (!resolvedTerm || !resolvedTerm.trim()) {
    if (wsId) {
      return (
        <Box
          className="serp-page"
          sx={{ width: "100%", display: "flex", alignItems: "flex-start", pt: 3, minHeight: 120 }}
        />
      );
    }
    return (
      <Box className="serp-page" sx={{ width: "100%", display: "flex", alignItems: "flex-start", pt: 3 }} />
    );
  }

  return (
    <SearchResult
      key={viewKey}
      participant={participant}
      searchTerm={resolvedTerm}
      activeTab="serp"
      setActiveTab={setActiveTab}
      navigateToAll={navigateToAll}
      setResourceChange={handleResourceChange}
      workspace={workspace}
      wsId={wsId ?? workspace?.ws_id}
      workspaceTitle={safeWorkspaceTitle}
    />
  );
}
