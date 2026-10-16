import { useEffect, useLayoutEffect, useRef, useState, useContext, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { SavedBookmarksProvider } from "../context/SavedBookmarksContext";
import SavedSearchResultsView from "../../search/pages/SavedSearchResultsView";
import SerpView from "../../search/pages/SerpView";
import { LAYOUT, SERP_GRID_COL_RIGHT } from "../../../theme/uiTokens";
import {
  setSearchTerm,
  getSelectedWorkspaceId,
  getWorkspaceSearchBoxTerm,
  getWorkspaceTitle,
} from "../../../utils/userScopedStorage";
import useWorkspaceScrollRouting from "../../../hooks/useWorkspaceScrollRouting";
import { useIsLikelyDesktopDevice } from "../../../hooks/useIsLikelyDesktopDevice";

export default function WorkspaceView({ participant, searchTerm }) {
  const { selectedWorkspace } = useContext(WorkspaceContext);
  useWorkspaceScrollRouting();

  const isDesktop = useIsLikelyDesktopDevice(900);

  const wsId = useMemo(
    () => selectedWorkspace?._id || getSelectedWorkspaceId() || null,
    [selectedWorkspace?._id]
  );

  const workspaceTitle = useMemo(
    () => selectedWorkspace?.title || getWorkspaceTitle() || "",
    [selectedWorkspace?.title]
  );

  const [view, setView] = useState("serp"); // "serp" | "saved-results"

  const [currentSearchTerm, setCurrentSearchTerm] = useState("");
  const first = useRef(true);

  // On workspace load or switch: restore that workspace's last search term if one exists.
  const prevWsIdRef = useRef(null);
  useLayoutEffect(() => {
    if (!wsId) {
      prevWsIdRef.current = wsId;
      return;
    }
    const isSwitch = prevWsIdRef.current !== null && prevWsIdRef.current !== wsId;
    const isInitial = prevWsIdRef.current === null;
    if (isSwitch || isInitial) {
      const restoredTerm = getWorkspaceSearchBoxTerm(wsId) || "";
      setCurrentSearchTerm(restoredTerm);
      setSearchTerm(restoredTerm);
      if (restoredTerm.trim()) {
        window.dispatchEvent(new CustomEvent("searchTermChanged", { detail: restoredTerm }));
      }
    }
    prevWsIdRef.current = wsId;
  }, [wsId]);

  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail;
      const q =
        typeof detail === "string"
          ? detail
          : detail && typeof detail === "object" && detail.term != null
            ? String(detail.term)
            : detail != null
              ? String(detail)
              : "";
      setCurrentSearchTerm(q.trim());
      try {
        setSearchTerm(q);
      } catch (err) {
        console.error('[WorkspaceView] sync search term:', err?.message || err);
      }
    };

    window.addEventListener("searchTermChanged", handler);
    return () => window.removeEventListener("searchTermChanged", handler);
  }, []);

  useEffect(() => {
    const apply = () => {
      const h = (window.location.hash || "").slice(1);
      const newView = h === "all" || h === "saved-results" ? "saved-results" : "serp";
      setView(newView);
    };
    window.addEventListener("hashchange", apply);
    apply();
    return () => window.removeEventListener("hashchange", apply);
  }, [wsId, currentSearchTerm, workspaceTitle]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.location.hash = view === "saved-results" ? "all" : "serp";
  }, [view]);

  if (!isDesktop) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          px: 3,
        }}
      >
        <Typography variant="body1" color="text.secondary" textAlign="center">
          Desktop only. Please use a larger screen.
        </Typography>
      </Box>
    );
  }

  return (
    <SavedBookmarksProvider workspaceId={wsId}>
      <Box sx={LAYOUT.mainGridOuterStyles}>
        <Box
          sx={{
            ...LAYOUT.mainGridStyles,
            gridTemplateColumns:
              view === "serp"
                ? `minmax(0, 1fr) ${SERP_GRID_COL_RIGHT}`
                : "1fr",
          }}
        >
          {view === "serp" ? (
            <>
              {/* Left results column (1fr) */}
              <Box sx={{ minWidth: 0, width: "100%", height: "100%", overflow: "hidden", display: "flex" }}>
                <SerpView
                  key={`serp-${wsId}`}
                  viewKey={`serp-${wsId}`}
                  participant={participant}
                  searchTerm={currentSearchTerm || searchTerm}
                  onSwitchToSaved={() => setView("saved-results")}
                  workspace={selectedWorkspace}
                  wsId={wsId}
                  workspaceTitle={workspaceTitle}
                />
              </Box>

              {/* Right rail (clamped width): intentionally empty (no timeline), but preserves SearchPath sizing */}
              <Box sx={LAYOUT.rightColumnStyles} />
            </>
          ) : null}

          {view === "saved-results" ? (
            <Box sx={{ display: "contents" }}>
              <SavedSearchResultsView key={`saved-results-${wsId}`} participant={participant} />
            </Box>
          ) : null}
        </Box>
      </Box>
    </SavedBookmarksProvider>
  );
}
