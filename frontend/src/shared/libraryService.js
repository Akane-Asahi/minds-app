import apiClient from "../api/apiClient";
import { getSelectedWorkspaceId, getParticipantSession } from "../utils/userScopedStorage";

import { getQueryList, saveQueryOnSearch } from "../features/search/api/queryService";
import { getWorkspaceTitle, getSearchQuery } from "../utils/localStorageUtils";
import { extractExternalId } from "../utils/documentMetadata";
// Computes and persists the canonical icon type + label at save time, so saved docs
// render with the same label as the SERP card even when the saved copy's doc shape
// differs (docdata.pnx vs doc.pnx at root).
import { getDocumentIconType } from "../utils/getDocumentIconType";
import { getHasMultipleVersions, getVersionGroupId } from "../utils/documentTypeUtils";

const PAGE_SIZE = 10;

/** Timeout for library search (ms). Primo can be slow under load; longer than default apiClient timeout to reduce "no results" on transient slowness. */
const SEARCH_REQUEST_TIMEOUT_MS = 30000;

export { getWorkspaceTitle, getSearchQuery };

/**
 * Search library catalog via backend proxy (Primo API key kept server-side).
 * Backend returns info.maxValidPage (single source of truth for fetchable pages).
 */
const searchLibraryCatalog = async (
  page,
  searchTerm,
  setSearchResults,
  setTotalRecords,
  setResultsPage,
  setPageLoading,
  opts = {},
  setMaxValidPage = null
) => {
  const { signal } = opts || {};

  setPageLoading?.(true);
  const limit = PAGE_SIZE;
  const apiPage = Math.max(0, Number(page) || 0);
  const offset = apiPage * limit;
  const config = {
    params: { q: searchTerm, offset, limit },
    timeout: SEARCH_REQUEST_TIMEOUT_MS,
  };
  if (signal) config.signal = signal;

  try {
    const response = await apiClient.get("/api/library/search", config);
    if (response.status === 200) {
      const docs = response.data?.docs ?? [];
      const info = response.data?.info ?? {};
      const total = Number(info.total ?? 0);
      const maxValidPage = Number(info.maxValidPage) || null;
      setSearchResults?.(docs);
      setTotalRecords?.(total);
      if (typeof setMaxValidPage === "function" && maxValidPage != null) setMaxValidPage(maxValidPage);
    } else {
      setSearchResults?.([]);
      setTotalRecords?.(0);
    }
  } catch (err) {
    if (err?.name === 'AbortError' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
    const isTimeout = err?.code === "ECONNABORTED" || /timeout/i.test(String(err?.message ?? ""));
    if (isTimeout) {
      console.warn("🔍 getSearchResult: Request timed out (Primo/backend slow). Keeping current results.", { searchTerm, page });
      // Do not clear results/total so the user keeps the current page instead of seeing "no results"
    } else {
      let trackingId = null;
      try {
        trackingId = err?.response?.data?.errorList?.error?.[0]?.trackingId || err?.response?.data?.trackingId || null;
      } catch {}
      console.error("🔍 getSearchResult: Search failed:", { searchTerm, page, status: err?.response?.status, trackingId, message: err?.message });
      setSearchResults?.([]);
      setTotalRecords?.(0);
    }
  } finally {
    setPageLoading?.(false);
  }
};

/**
 * Get detailed information for a specific document (via backend proxy)
 */
const getDocumentDetails = async (bibId, setPageLoading, setShowDetails, setDetails) => {
  if (!bibId) return;
  setPageLoading?.(true);
  try {
    const response = await apiClient.get(`/api/library/details/${encodeURIComponent(bibId)}`);
    if (response.data?.content?.details) {
      setShowDetails?.(true);
      setDetails?.(response.data.content.details);
    }
  } catch (error) {
    console.error("Error fetching document details:", error);
  } finally {
    setPageLoading?.(false);
  }
};

/**
 * Unsave a document by SavedDoc id. Dispatches window events so SERP and workspace state stay in sync.
 */
export async function unsaveSavedDocument(savedocId, meta = {}) {
  if (!savedocId) return;
  const workspaceId = getSelectedWorkspaceId();
  const { controlNumber, externalId } = meta;
  await apiClient.post("/api/saveddocs/remove", { savedocId });
  if (typeof window === "undefined") return;
  const ext = externalId ?? controlNumber;
  window.dispatchEvent(
    new CustomEvent("ws:document:removed", {
      detail: { savedId: savedocId, savedocId, workspaceId },
    })
  );
  window.dispatchEvent(
    new CustomEvent("ws:unsaved", {
      detail: {
        workspaceId,
        controlNumber,
        externalId: ext,
        savedId: savedocId,
        savedocId,
      },
    })
  );
}

const getExternalId = (doc) => extractExternalId(doc) || null;

const inflightSaves = new Map();

/**
 * Get saved doc by externalId. Uses GET /byExternalId/:externalId.
 */
async function getSavedDocByExternalId(externalId, workspaceId) {
  if (!externalId || !workspaceId) return null;
  const id = String(externalId).trim();
  const wsId = workspaceId || getSelectedWorkspaceId();
  if (!wsId) return null;
  try {
    const r = await apiClient.get("/api/saveddocs/byExternalId/" + encodeURIComponent(id), {
      params: { workspaceId: wsId },
      validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
    });
    if (r?.status === 404) return null;
    const savedId = r?.data?._id || r?.data?.savedDocId;
    return savedId ? { _id: savedId } : null;
  } catch (e) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
}

/**
 * Ensure a document is saved, returning its SavedDoc _id.
 * options.emitSavedEvent: if false, do not dispatch ws:saved.
 */
async function ensureSavedDoc(doc, workspaceId, queryText, queryId = null, userId = null, options = {}) {
  const emitSavedEvent = options.emitSavedEvent !== false;
  if (!doc || !workspaceId || !queryText) return null;

  const session = getParticipantSession();
  const uid = userId || session?._id || session?.userId || null;
  if (!uid) return null;

  const externalId = getExternalId(doc);
  const ControlNumber = externalId;
  if (!ControlNumber) return null;

  const key = `${uid}::${workspaceId}::${ControlNumber}`;
  if (inflightSaves.has(key)) return inflightSaves.get(key);

  const task = (async () => {
    try {
      const trimmedQueryText = queryText?.trim() || "Manual Tagging";

      // doc_type = Primo pnx.display.type[0], the source of truth for saved views.
      const pnxAtSave = doc?.pnx || doc?.docdata?.pnx || null;
      const doc_type = pnxAtSave?.display?.type?.[0] ?? doc?.docdata?.Type ?? doc?.Type ?? '';

      // Optional: iconType from same classification SERP uses (for consistent icon in saved views).
      const { type: computedIconType, displayLabel: computedDisplayLabel } = getDocumentIconType(doc);

      const computedHasMultipleVersions = getHasMultipleVersions(pnxAtSave);
      const computedVersionGroupId      = getVersionGroupId(pnxAtSave);

      const pnxToStore = doc?.pnx || doc?.docdata?.pnx || null;
      const payload = {
        workspaceId,
        ControlNumber,
        externalId: externalId || ControlNumber,
        doc_type,
        iconType: computedIconType || null,
        docdata: {
          Title: doc?.Title || doc?.docdata?.Title || doc?.pnx?.display?.title?.[0] || "",
          Author: doc?.Author || doc?.docdata?.Author || "",
          PublicationDate: doc?.PublicationDate || doc?.docdata?.PublicationDate || "",
          Format: doc?.Format || doc?.docdata?.Format || "",
          Kind: doc?.Kind || doc?.docdata?.Kind || "",
          Genre: doc?.Genre || doc?.docdata?.Genre || "",
          Type: doc?.Type || doc?.docdata?.Type || "",
          ThumbnailURL: doc?.ThumbnailURL || doc?.docdata?.ThumbnailURL || null,
          // Full Primo PNX for classification in saved views (minimal: display.type, display.format,
          // addata.ristype, addata.genre, search.recordtype, search.frbrgroupid/frbrtype).
          pnx: pnxToStore,
          // Store SERP-computed classification so saved-doc views don't need to
          // re-classify from pnx, which may be absent on old saves.
          iconType: computedIconType || null,
          displayLabel: computedDisplayLabel || null,
          // FRBR grouping — persisted so timeline/saved-results can show the badge
          // without re-reading pnx (old saves may lack pnx in docdata).
          hasMultipleVersions: computedHasMultipleVersions,
          versionGroupId: computedVersionGroupId,
        },
        queryText: trimmedQueryText,
        searchTopic: trimmedQueryText,
        query: trimmedQueryText,
        queryId: queryId || null,
      };

      const response = await apiClient.post("/api/saveddocs/add", payload, {
        validateStatus: (s) => (s >= 200 && s < 300) || s === 404 || s === 409,
      });

      let savedDocId = response?.data?._id || response?.data?.savedDocId || null;
      if (response?.status === 409 && !savedDocId) {
        const existing = await getSavedDocByExternalId(externalId || ControlNumber, workspaceId);
        savedDocId = existing?._id || null;
        if (!savedDocId) throw new Error("Document already exists but could not fetch existing _id");
      }

      if (!savedDocId) throw new Error("Backend did not return savedDocId");

      if (emitSavedEvent && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("ws:saved", {
            detail: {
              savedocId: savedDocId,
              savedId: savedDocId,
              controlNumber: ControlNumber,
              externalId: externalId || ControlNumber,
              searchTopic: queryText,
              workspaceId,
            },
          })
        );
      }

      return savedDocId;
    } catch (error) {
      if (error?.response?.status === 400) throw new Error(error?.response?.data?.error || "Validation error");
      if (error?.response?.status === 409) {
        const existingId = error?.response?.data?._id || error?.response?.data?.savedDocId;
        if (existingId) return existingId;
        throw new Error("Document already exists but backend did not return _id");
      }
      throw error;
    }
  })()
    .catch(() => null)
    .finally(() => inflightSaves.delete(key));

  inflightSaves.set(key, task);
  return task;
}

/**
 * Ensure a doc is saved, returning its SavedDoc _id.
 */
export async function ensureSavedThenGetId(doc, { userId, query, searchTopic, queryId, emitSavedEvent } = {}) {
  const workspaceId = getSelectedWorkspaceId();
  if (!workspaceId) return null;

  const session = getParticipantSession();
  const uid = userId || session?._id || session?.userId || null;
  if (!uid) return null;

  const queryText = query || searchTopic || "Manual Tagging";
  return ensureSavedDoc(doc, workspaceId, queryText, queryId, uid, { emitSavedEvent });
}

export { getQueryList, saveQueryOnSearch };

export const getSearchResult = searchLibraryCatalog;
export const getDetails = getDocumentDetails;