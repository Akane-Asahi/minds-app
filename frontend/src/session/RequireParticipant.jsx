/**
 * Route guard: redirects to /start if participantId is missing.
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useContext } from "react";
import { ParticipantSessionContext } from "./ParticipantSessionContext";

export default function RequireParticipant({ children }) {
  const location = useLocation();
  const { participant } = useContext(ParticipantSessionContext);

  const hasParticipant = !!(participant?.participantId);

  if (!hasParticipant) {
    return <Navigate to="/start" replace state={{ from: location }} />;
  }

  return children ?? <Outlet />;
}
