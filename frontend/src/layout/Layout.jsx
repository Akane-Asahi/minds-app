import React, { useState, useContext, useEffect, useCallback } from 'react';
import { Box, Breadcrumbs, Typography } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import WorkspaceHeader from '../features/workspace/layout/WorkspaceHeader';
import MainHeader from './MainHeader';
import { WorkspaceContext } from '../features/workspace/context/WorkspaceContext';
import { PAGE_CONTAINER } from '../theme/uiTokens';
import { useIsLikelyDesktopDevice } from '../hooks/useIsLikelyDesktopDevice';

const Layout = ({ participant, hasAnyWorkspace, children }) => {
  const [activeTab, setActiveTab] = useState("serp");
  const [totalResults, setTotalResults] = useState(null);
  const [workspaceChangeTick, setWorkspaceChangeTick] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedWorkspace } = useContext(WorkspaceContext);
  const isLargeDesktop = useIsLikelyDesktopDevice(1024);

  const resetTotalResults = useCallback(() => setTotalResults(null), []);

  // Sync tab state with URL hash
  useEffect(() => {
    const updateTabFromHash = () => {
      const hash = (window.location.hash || "").slice(1);
      setActiveTab(hash === "all" || hash === "saved-results" ? "saved-results" : "serp");
    };

    window.addEventListener("hashchange", updateTabFromHash);
    updateTabFromHash();

    return () => window.removeEventListener("hashchange", updateTabFromHash);
  }, []);

  // Clear total results when navigating to workspaces list
  useEffect(() => {
    if (location.pathname === "/workspaces") {
      resetTotalResults();
    }
  }, [location.pathname, resetTotalResults]);

  // Listen for total results updates
  useEffect(() => {
    const handleTotalResultsUpdate = (event) => {
      const { totalResults: newTotalResults } = event.detail || {};
      if (newTotalResults !== undefined) {
        setTotalResults(newTotalResults);
      }
    };

    window.addEventListener("totalResultsUpdated", handleTotalResultsUpdate);
    return () => window.removeEventListener("totalResultsUpdated", handleTotalResultsUpdate);
  }, []);

  // React to workspace changes (breadcrumb + clear total results)
  useEffect(() => {
    const handleWorkspaceChange = () => {
      setWorkspaceChangeTick((t) => t + 1);
      resetTotalResults();
    };

    window.addEventListener('ws:workspace:changed', handleWorkspaceChange);
    return () => window.removeEventListener('ws:workspace:changed', handleWorkspaceChange);
  }, [resetTotalResults]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    window.location.hash = newTab === "saved-results" ? "all" : "serp";
  };

  return (
    <Box
      className="pagelayout"
      sx={{
        display: "grid",
        gridTemplateAreas: `"header" "content"`,
        gridTemplateColumns: "1fr",
        gridTemplateRows: "auto 1fr",
        minHeight: "100vh",
        width: "100%",
        margin: 0,
        padding: 0,
        bgcolor: "background.default",
      }}
    >
      {/* Header */}
      {location.pathname === "/workspaces" ? (
        <WorkspaceHeader participant={participant} />
      ) : (
        <MainHeader
          participant={participant}
          hasAnyWorkspace={hasAnyWorkspace}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          selectedWorkspace={selectedWorkspace}
        />
      )}

      {/* Breadcrumb for non-workspace pages */}
      {location.pathname !== "/workspaces" && isLargeDesktop && (
        <Box
          key={workspaceChangeTick}
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            pt: 1,
            pb: 0,
          }}
        >
          {/* Inner container — same PAGE_CONTAINER token as header and body grid */}
          <Box sx={PAGE_CONTAINER}>
            <Breadcrumbs separator="›" sx={{ lineHeight: 1 }}>
              <Typography
                variant="body1"
                sx={{
                  cursor: "pointer",
                  color: "primary.main",
                  fontWeight: 400,
                }}
                onClick={() => navigate('/workspaces')}
              >
                workspaces
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: "text.primary",
                  fontWeight: 500,
                }}
              >
                {selectedWorkspace?.ws_title || selectedWorkspace?.title || localStorage.getItem("workspaceTitle") || "Current Workspace"}
              </Typography>
            </Breadcrumbs>

            {/* Total results: hidden on saved-results view and when no search performed */}
            {!(location.pathname.endsWith("/all") || location.hash?.includes("all")) && totalResults && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ whiteSpace: "nowrap", mt: 0.25, fontSize: 16, fontFamily: "sans-serif" }}
                aria-label={`Total Results: ${totalResults.toLocaleString()}`}
              >
                total results: {Number(totalResults).toLocaleString()}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Content */}
      <Box
        component="main"
        sx={{
          width: "100%",
          padding: 0,
          margin: 0,
          bgcolor: "background.default",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        {!isLargeDesktop ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "calc(100vh - 64px)",
              width: "100%",
              padding: 4,
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                color: "text.secondary",
                fontWeight: 500,
                textAlign: "center",
              }}
            >
              Desktop only. Please use a larger screen.
            </Typography>
          </Box>
        ) : (
          children
        )}
      </Box>
    </Box>
  );
};

export default Layout;
