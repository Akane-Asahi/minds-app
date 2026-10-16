/**
 * Participant session service - calls backend participant-login.
 * Backend returns JWT; we store session for apiClient to use.
 */

import apiClient from "../api/apiClient";

/**
 * Start participant session: POST /api/users/participant-login
 * @param {string} participantId - Participant ID
 * @returns {Promise<Object>} Session { participantId, _id, token }
 */
export async function startParticipantSession(participantId) {
  const pid = String(participantId ?? "").trim();
  if (!pid) throw new Error("Participant ID is required");

  const { data } = await apiClient.post(
    "/api/users/participant-login",
    {
      username: pid,
      participantId: pid,
    },
    { skipAuth: true, skipParticipant: true }
  );

  if (!data?.token) {
    throw new Error(data?.message || "Login failed");
  }

  const session = {
    participantId: data.participantId ?? pid,
    _id: data.userId,
    token: data.token,
  };

  return session;
}
