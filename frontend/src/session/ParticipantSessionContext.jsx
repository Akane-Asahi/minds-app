/**
 * Participant Session Context
 * Holds participantId and session; reads/writes localStorage.
 * Replaces auth/user concept with simple participant session.
 */

import React, { createContext, useState, useEffect, useCallback, useContext } from "react";

const STORAGE_KEY = "participantSession";
const PARTICIPANT_ID_KEY = "participantId";

function readSession() {
  try {
    let s = localStorage.getItem(STORAGE_KEY);
    if (!s) {
      // Migrate from legacy "user" key
      const legacy = localStorage.getItem("user");
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed?.participantId || parsed?.username) {
          const migrated = {
            participantId: parsed.participantId ?? parsed.username,
            _id: parsed._id ?? parsed.id,
            token: parsed.token,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
          localStorage.setItem(PARTICIPANT_ID_KEY, migrated.participantId);
          return migrated;
        }
      }
      return null;
    }
    const parsed = JSON.parse(s);
    return parsed?.participantId ? parsed : null;
  } catch {
    return null;
  }
}

export const ParticipantSessionContext = createContext({
  participant: null,
  setParticipant: () => {},
  clearParticipant: () => {},
});

export function ParticipantSessionProvider({ children }) {
  const [participant, setParticipantState] = useState(() => readSession());

  const setParticipant = useCallback((session) => {
    if (!session || !session.participantId) {
      setParticipantState(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PARTICIPANT_ID_KEY);
      return;
    }
    const toStore = {
      participantId: session.participantId,
      _id: session._id ?? session.userId,
      token: session.token,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    localStorage.setItem(PARTICIPANT_ID_KEY, session.participantId);
    setParticipantState(toStore);
  }, []);

  const clearParticipant = useCallback(() => {
    setParticipantState(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PARTICIPANT_ID_KEY);
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY || e.key === PARTICIPANT_ID_KEY) {
        setParticipantState(readSession());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <ParticipantSessionContext.Provider
      value={{ participant, setParticipant, clearParticipant }}
    >
      {children}
    </ParticipantSessionContext.Provider>
  );
}

export function useParticipantSession() {
  const ctx = useContext(ParticipantSessionContext);
  if (!ctx) {
    throw new Error("useParticipantSession must be used within ParticipantSessionProvider");
  }
  return ctx;
}
