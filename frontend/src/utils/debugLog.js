const AUTH_DEBUG = String(process.env.REACT_APP_AUTH_DEBUG).toLowerCase() === "true";

function makeDebugLog(prefix) {
  return function log(message, detail) {
    if (!AUTH_DEBUG) return;
    if (detail !== undefined) {
      console.warn(`[${prefix}] ${message}`, detail);
    } else {
      console.warn(`[${prefix}] ${message}`);
    }
  };
}

export const authLog = makeDebugLog("Auth");
export const loginLog = makeDebugLog("Login");
