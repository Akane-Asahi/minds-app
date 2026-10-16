/**
 * Central API client - single axios instance for all API calls.
 * Attaches participantId and JWT token to every request.
 */

import axios from "axios";
import { getParticipantSession } from "../utils/userScopedStorage";

// Use env for API base; empty string = same origin (dev proxy or same-host in production).
const RAW_API_BASE = process.env.REACT_APP_BACKEND_URL || "";

const API_ORIGIN = RAW_API_BASE ? RAW_API_BASE.replace(/\/+$/, "").replace(/\/api\/?$/, "") : "";

export const apiClient = axios.create({
  baseURL: API_ORIGIN,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

function hasAuthHeader(headers) {
  const h = headers || {};
  return Object.keys(h).some((k) => k.toLowerCase() === "authorization");
}


function toLatin1HeaderValue(str) {
  if (str == null || typeof str !== "string") return "";
  // Avoid control-character regexes (eslint no-control-regex) by doing a simple codepoint pass.
  // HTTP header values should be ASCII/Latin-1 friendly; replace anything outside 0..255.
  let out = "";
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    out += code >= 0 && code <= 255 ? str[i] : "?";
  }
  return out;
}

const getDebugPerfFlag = () => {
  const raw = typeof process !== "undefined" && process.env ? process.env.REACT_APP_DEBUG_PERF : undefined;
  return raw === true || raw === "true" || raw === "1";
};

const DEBUG_PERF = getDebugPerfFlag();
const SLOW_MS = 1200;

function logPerf(config, status, durationMs) {
  if (!DEBUG_PERF || !config || process.env.NODE_ENV === 'production') return;
  const method = (config.method || "GET").toUpperCase();
  const route = config.url || config._perfRoute || "";
  const line = `[PERF] ${method} ${route} ${status} ${durationMs}ms`;
  if (durationMs > SLOW_MS) {
    console.warn(line + " (slow request)");
  } else {
    console.warn(line);
  }
}

apiClient.interceptors.request.use((config) => {
  const session = getParticipantSession();
  const token = session?.token || session?.accessToken || null;
  const participantId = session?.participantId ?? null;

  if (token && !config.skipAuth && !hasAuthHeader(config.headers)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (participantId && !config.skipParticipant) {
    config.headers["x-participant-id"] = toLatin1HeaderValue(participantId);
  }

  if (config.method?.toLowerCase() === "get") {
    config.headers["Cache-Control"] = config.headers["Cache-Control"] || "no-cache";
    config.headers["Pragma"] = config.headers["Pragma"] || "no-cache";
  }

  if (DEBUG_PERF) {
    config._perfStart = performance.now();
    config._perfRoute = config.url || "";
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (DEBUG_PERF && response.config) {
      const durationMs = Math.round(performance.now() - (response.config._perfStart || 0));
      logPerf(response.config, response.status || 200, durationMs);
    }
    return response;
  },
  (error) => {
    if (DEBUG_PERF && error?.config) {
      const durationMs = Math.round(performance.now() - (error.config._perfStart || 0));
      logPerf(error.config, error?.response?.status || 0, durationMs);
    }
    const status = error?.response?.status;
    const skipRedirect = error?.config?.skipAuthRedirect === true;
    if ((status === 401 || status === 403) && !skipRedirect) {
      localStorage.removeItem("participantSession");
      try {
        sessionStorage.setItem("sessionExpiredMessage", "Session expired—please sign in again.");
      } catch (_) {}
      const returnPath = window.location.pathname + window.location.search;
      if (returnPath && returnPath !== "/start") {
        localStorage.setItem("returnPath", returnPath);
      }
      window.location.href = "/start";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
