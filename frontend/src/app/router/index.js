// frontend/src/app/router/index.js
import React, { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import Layout from "../../layout/Layout";
import {
  ParticipantSessionProvider,
  StartPage,
  useParticipantSession,
} from "../../session";
import WorkspaceList from "../../features/workspace/pages/WorkspaceList";
import WorkspaceView from "../../features/workspace/pages/WorkspaceView";
import { WorkspaceProvider } from "../../features/workspace/context/WorkspaceContext";
/**
 * Route helper: pass searchTerm from URL only (no persistence/restore).
 */
function WorkspaceRoute() {
  const { search } = useLocation();
  const { participant } = useParticipantSession();

  const searchTerm = (new URLSearchParams(search).get("q") || "").trim();

  return <WorkspaceView participant={participant} searchTerm={searchTerm} />;
}

/** Single layout layer: auth guard + Layout with Outlet. Prevents duplicate .pagelayout tree. */
function LayoutOutlet({ hasAnyWorkspace }) {
  const location = useLocation();
  const { participant } = useParticipantSession();

  if (!participant?.participantId) {
    return <Navigate to="/start" replace state={{ from: location }} />;
  }

  return (
    <Layout participant={participant} hasAnyWorkspace={hasAnyWorkspace}>
      <Outlet />
    </Layout>
  );
}

export default function AppRouter() {
  const [hasAnyWorkspace, setHasAnyWorkspace] = useState(null);

  const BASENAME = process.env.PUBLIC_URL || "/"; 

  return (
    <BrowserRouter basename={BASENAME}>
      <ParticipantSessionProvider>
        <WorkspaceProvider>
          <Routes>
            {/* Entry gate - participant enters ID */}
            <Route path="/start" element={<StartPage />} />

            {/* Protected group: single layout (auth + Layout) so .pagelayout renders once */}
            <Route element={<LayoutOutlet hasAnyWorkspace={hasAnyWorkspace} />}>
              <Route
                path="/workspaces"
                element={
                  <WorkspaceList
                    setHasAnyWorkspace={setHasAnyWorkspace}
                  />
                }
              />
              <Route
                path="/workspace"
                element={<WorkspaceRoute />}
              />
            </Route>

            {/* Root and unknown paths: redirect to start page */}
            <Route path="/" element={<Navigate to="/start" replace />} />
            <Route path="*" element={<Navigate to="/start" replace />} />
          </Routes>
        </WorkspaceProvider>
      </ParticipantSessionProvider>
    </BrowserRouter>
  );
}
