/**
 * Utility functions for extracting abstract text from document data
 */

/**
 * Decodes raw abstract input to a displayable string.
 * Handles plain strings, inverted-index objects { token: [positions...] }, and empty values.
 * @param {string|Object|null|undefined} input - Raw abstract (string, inverted index, or empty)
 * @returns {string} - Displayable string (empty if nothing to show)
 */
export function decodeAbstractInvertedIndex(input) {
  if (input == null) return "";
  if (typeof input === "string") return input.trim() || "";

  if (typeof input === "object" && !Array.isArray(input)) {
    // Inverted index: { token: [positions...] }
    let maxPos = -1;
    const entries = [];
    for (const [token, positions] of Object.entries(input)) {
      if (!Array.isArray(positions)) continue;
      for (const p of positions) {
        const pos = Number(p);
        if (!Number.isNaN(pos) && pos >= 0) {
          maxPos = Math.max(maxPos, pos);
          entries.push({ token: String(token), pos });
        }
      }
    }
    if (maxPos < 0) return "";
    const arr = new Array(maxPos + 1).fill(null);
    for (const { token, pos } of entries) {
      arr[pos] = token;
    }
    return arr.filter(Boolean).join(" ").trim();
  }

  return "";
}

const FALLBACK_KEYS = ["abstract", "description", "text", "value"];

/**
 * Normalizes abstract content to a plain string.
 * Handles: plain strings, arrays of strings, OpenAlex-style abstract_inverted_index objects.
 * @param {string|Object|Array|null|undefined} input - Raw abstract
 * @returns {string} - Displayable string (empty if nothing to show)
 */
export function normalizeAbstract(input) {
  if (input == null) return "";

  if (typeof input === "string") {
    const s = String(input).trim();
    return s || "";
  }

  if (Array.isArray(input)) {
    const parts = input
      .map((x) => normalizeAbstract(x))
      .filter((s) => s && s.length > 0);
    return parts.join(" ").trim();
  }

  if (typeof input === "object") {
    // OpenAlex-style inverted index: { token: [positions...] }
    const decoded = decodeAbstractInvertedIndex(input);
    if (decoded) return decoded;
    // Fallback keys
    for (const k of FALLBACK_KEYS) {
      if (input[k] != null) {
        const v = normalizeAbstract(input[k]);
        if (v.trim()) return v;
      }
    }
  }

  return "";
}

/**
 * Gets raw abstract value(s) from document for normalization.
 * @param {Object} doc - Document object with pnx or docdata.pnx
 * @returns {string|Object|Array|null} - Raw abstract value(s) or null
 */
export function getRawAbstract(doc) {
  const pnx = doc?.pnx || doc?.docdata?.pnx || {};
  const items = [
    ...(pnx?.display?.description || []),
    ...(pnx?.addata?.abstract || []),
  ].filter((x) => x != null);
  if (items.length > 0) return items.length === 1 ? items[0] : items;
  for (const k of FALLBACK_KEYS) {
    if (doc?.[k] != null) return doc[k];
  }
  return null;
}

