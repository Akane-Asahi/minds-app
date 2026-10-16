import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchSavedDocumentsQueryList } from "../api/savedDocsQueryService";
import { extractExternalId } from "../../../utils/documentMetadata";

const SavedBookmarksContext = createContext(null);

function norm(k) {
  if (k == null || k === "") return "";
  return String(k).trim();
}

/** externalId / controlNumber -> saved Mongo _id */
function buildSavedocIndex(queries) {
  const map = new Map();
  for (const q of queries || []) {
    for (const d of q?.documents || []) {
      if (d?.isRemoved === true || d?.status === "removed") continue;
      const id = d?._id || d?.id;
      if (!id) continue;
      const ext = extractExternalId(d);
      if (ext) map.set(norm(ext), id);
      const cn =
        d?.ControlNumber ??
        d?.controlNumber ??
        d?.docdata?.ControlNumber;
      if (cn != null && String(cn).trim() !== "") map.set(norm(cn), id);
    }
  }
  return map;
}

function mergePreservedDocdata(prev, next) {
  if (!Array.isArray(next)) return [];
  if (!Array.isArray(prev) || prev.length === 0) return next;
  const prevDocMap = new Map();
  prev.forEach((q) =>
    (q.documents || []).forEach((d) => {
      const key = String(d._id || d.id || "");
      if (key) prevDocMap.set(key, d);
    })
  );
  return next.map((q) => ({
    ...q,
    documents: (q.documents || []).map((doc) => {
      const key = String(doc._id || doc.id || "");
      const existing = key ? prevDocMap.get(key) : undefined;
      if (!existing) return doc;
      return {
        ...doc,
        docdata: doc.docdata || existing.docdata,
        pnx: doc.pnx || existing.pnx,
      };
    }),
  }));
}

function removeDocFromQueryList(prev, detail, wsId) {
  const { savedId, savedocId, externalId, controlNumber, workspaceId: eventWs } = detail || {};
  if (eventWs && wsId && String(eventWs) !== String(wsId)) return prev;
  const targetId =
    savedocId != null ? String(savedocId) : savedId != null ? String(savedId) : null;
  const ext = externalId != null ? norm(externalId) : "";
  const cn = controlNumber != null ? norm(controlNumber) : "";

  if (!Array.isArray(prev) || prev.length === 0) return prev;
  return prev.map((q) => ({
    ...q,
    documents: (q.documents || []).filter((d) => {
      const id = String(d._id || d.id || "");
      if (targetId && id === targetId) return false;
      const dExt = extractExternalId(d);
      if (ext && dExt && norm(dExt) === ext) return false;
      const dCn = d?.ControlNumber ?? d?.controlNumber ?? d?.docdata?.ControlNumber;
      if (cn && dCn != null && norm(dCn) === cn) return false;
      return true;
    }),
  }));
}

/**
 * Workspace saved-documents store (SERP bookmarks + Saved Search Results list).
 * Data: POST /api/saveddocs/querylist (active saves only; soft-removed excluded server-side).
 */
export function SavedBookmarksProvider({ workspaceId, children }) {
  const [queries, setQueries] = useState([]);
  /** Until server list returns, remember ids from ws:saved so bookmarks fill immediately */
  const [optimisticByKey, setOptimisticByKey] = useState(() => new Map());
  const fetchSeqRef = useRef(0);
  const abortRef = useRef(null);

  const fetchSavedResults = useCallback(async () => {
    if (!workspaceId) {
      setQueries([]);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++fetchSeqRef.current;

    try {
      const newQueries = await fetchSavedDocumentsQueryList({
        searchTopic: "",
        workspaceId,
        signal: controller.signal,
      });
      if (seq !== fetchSeqRef.current) return;
      if (!Array.isArray(newQueries)) {
        setQueries([]);
        return;
      }
      setQueries((prev) => mergePreservedDocdata(prev, newQueries));
      setOptimisticByKey(new Map());
    } catch (e) {
      if (e?.name === "AbortError" || e?.name === "CanceledError" || e?.code === "ERR_CANCELED") {
        return;
      }
      console.error("[SavedBookmarks] fetch failed:", e?.message || e);
      if (seq === fetchSeqRef.current) setQueries([]);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchSavedResults();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchSavedResults]);

  const patchRemoveOptimistic = useCallback(
    (detail) => {
      setQueries((prev) => removeDocFromQueryList(prev, detail, workspaceId));
      const { externalId, controlNumber, savedocId, savedId } = detail || {};
      const key = norm(externalId || controlNumber);
      setOptimisticByKey((m) => {
        const next = new Map(m);
        if (key) next.delete(key);
        const id = savedocId || savedId;
        if (id) {
          for (const [k, v] of next.entries()) {
            if (String(v) === String(id)) next.delete(k);
          }
        }
        return next;
      });
    },
    [workspaceId]
  );

  const patchSavedOptimistic = useCallback((detail) => {
    const { savedocId, savedId, externalId, controlNumber, workspaceId: wid } = detail || {};
    if (wid && workspaceId && String(wid) !== String(workspaceId)) return;
    const id = savedocId || savedId;
    const key = norm(externalId || controlNumber);
    if (key && id) {
      setOptimisticByKey((m) => new Map(m).set(key, String(id)));
    }
  }, [workspaceId]);

  useEffect(() => {
    let debounceTimer = null;
    const scheduleRefetch = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        fetchSavedResults();
      }, 120);
    };

    const onSaved = (e) => {
      patchSavedOptimistic(e.detail || {});
      scheduleRefetch();
    };
    const onUnsaved = (e) => {
      patchRemoveOptimistic(e.detail || {});
      scheduleRefetch();
    };

    window.addEventListener("ws:saved", onSaved);
    window.addEventListener("ws:unsaved", onUnsaved);
    window.addEventListener("ws:document:removed", onUnsaved);

    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener("ws:saved", onSaved);
      window.removeEventListener("ws:unsaved", onUnsaved);
      window.removeEventListener("ws:document:removed", onUnsaved);
    };
  }, [fetchSavedResults, patchRemoveOptimistic, patchSavedOptimistic]);

  const serverIndex = useMemo(() => buildSavedocIndex(queries), [queries]);

  const getSavedocIdForSerpHit = useCallback(
    (controlNumber, externalId) => {
      const ex = norm(externalId);
      const cn = norm(controlNumber);
      if (ex && optimisticByKey.has(ex)) return optimisticByKey.get(ex);
      if (cn && optimisticByKey.has(cn)) return optimisticByKey.get(cn);
      if (ex && serverIndex.has(ex)) return serverIndex.get(ex);
      if (cn && serverIndex.has(cn)) return serverIndex.get(cn);
      return undefined;
    },
    [serverIndex, optimisticByKey]
  );

  const value = useMemo(
    () => ({
      workspaceId,
      queries,
      refreshSavedDocuments: fetchSavedResults,
      getSavedocIdForSerpHit,
    }),
    [workspaceId, queries, fetchSavedResults, getSavedocIdForSerpHit]
  );

  return (
    <SavedBookmarksContext.Provider value={value}>
      {children}
    </SavedBookmarksContext.Provider>
  );
}

export function useSavedBookmarks() {
  const ctx = useContext(SavedBookmarksContext);
  if (!ctx) {
    throw new Error("useSavedBookmarks must be used under SavedBookmarksProvider");
  }
  return ctx;
}
