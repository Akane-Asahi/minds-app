/**
 * Document Utilities
 *
 * Canonical doc identifier = externalId (extractExternalId from documentMetadata).
 * These are compatibility wrappers; prefer extractExternalId for new code.
 */

import { extractExternalId } from "./documentMetadata";

/**
 * Get a stable identifier for a document. Uses extractExternalId; falls back to hash if empty.
 * @param {Object} doc - Document object
 * @returns {string} Non-empty string identifier
 */
export const getControlNumber = (doc) => {
  const id = extractExternalId(doc);
  if (id) return id;

  const pnx = doc?.pnx;
  if (pnx?.control?.recordid?.[0]) return String(pnx.control.recordid[0]).trim();
  if (pnx?.control?.recordid && typeof pnx.control.recordid === "string") return String(pnx.control.recordid).trim();
  if (pnx?.control?.sourceid && pnx?.control?.sourcerecordid) {
    return `${String(pnx.control.sourceid).trim()}::${String(pnx.control.sourcerecordid).trim()}`;
  }
  if (pnx?.display?.mms?.[0]) return String(pnx.display.mms[0]).trim();

  const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  };
  const controlObj = pnx?.control || doc;
  const title = doc?.Title || pnx?.display?.title?.[0] || "";
  const hashInput = JSON.stringify(controlObj) + (title ? String(title).slice(0, 80) : "");
  return `hash-${hashString(hashInput)}`;
};
