import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { ensureSavedThenGetId, unsaveSavedDocument } from "../../../shared/libraryService";
import { getSelectedWorkspaceId, getCurrentUserId } from "../../../utils/userScopedStorage";
import { getControlNumber as getControlNumberUtil } from "../../../utils/documentUtils";
import { buildUReginaPrimoFullDisplayUrl } from "../../../utils/primoUrl";
import {
  extractAuthors,
  extractYear,
  extractSource,
  getFullDocumentName,
  extractExternalId,
} from "../../../utils/documentMetadata";
import ResultCardShell from "../../../shared/components/ResultCardShell";
import BookmarkSaveButton from "../../../shared/components/BookmarkSaveButton";
// Shared type-classification helpers — single source of truth for all views
import {
  getRisType,
  getRecordType,
  mapRisToKind,
  mapRecordTypeToKind,
  hasConferenceHints,
  normalizeFromDispType,
  getDocumentType as getDocumentTypeShared,
} from "../../../utils/documentTypeUtils";

const cleanIsbnToken = (s) =>
  typeof s === "string" ? s.replace(/\$\$C?ISBN\$\$V/gi, "").replace(/[^0-9Xx]/g, "") : "";

const extractISBNs = (pnx, fb) => {
  const raw = [
    ...(pnx?.addata?.isbn || []),
    ...(pnx?.display?.identifier || []),
    ...(Array.isArray(fb?.ISBN) ? fb.ISBN : fb?.ISBN ? [fb.ISBN] : []),
  ];
  return raw.map(cleanIsbnToken).filter(Boolean);
};

const getFormat = (pnx, fb) => pnx?.display?.format?.[0] || pnx?.addata?.format?.[0] || fb?.Format || "";
const getLink = (data) => data?.["@id"] || data?.RecordURL || null;

const getControlNumber = getControlNumberUtil;

const getKind = (pnx, fb) => {
  const standard = fb?.standard_type || fb?.docdata?.standard_type;
  if (standard) return standard;
  const ris = getRisType(pnx);
  const rt = getRecordType(pnx);
  const dispType = pnx?.display?.type?.[0] || "";
  const format = pnx?.display?.format?.[0] || fb?.Format || "";
  const k1 = mapRisToKind(ris);
  if (k1) return k1;
  const k2 = mapRecordTypeToKind(rt);
  if (k2) return k2;
  if (hasConferenceHints(pnx)) return "Conference Proceeding";
  return normalizeFromDispType(dispType, format);
};

const getDocumentType = (doc) => getDocumentTypeShared(doc);

function normKey(k) {
  if (k == null || k === "") return "";
  return String(k).trim();
}

const ResultRow = ({
  data,
  getDetails: _getDetails,
  participant,
  query,
  searchTopic,
  enableAutoCover: _enableAutoCover = true,
  hideSaveButton = false,
  savedocId: savedocIdProp,
  currentQueryId = null,
  resultsPage = null,
  resultRank = null,
  savedDocsCount = 0,
}) => {
  const queryIdRef = useRef(currentQueryId);
  useEffect(() => {
    queryIdRef.current = currentQueryId;
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const pnx = useMemo(() => data?.pnx, [data]);

  const controlNumber = useMemo(() => getControlNumber(data), [data]);

  const externalId = useMemo(() => {
    return data?.externalId || data?.ControlNumber || controlNumber || null;
  }, [data, controlNumber]);

  const view = useMemo(() => {
    const Format = getFormat(pnx, data);
    const authorsStr = extractAuthors(data);
    const Authors = authorsStr
      ? authorsStr
          .replace(/, et al\.$/, "")
          .split(", ")
          .map((a) => a.trim())
          .filter(Boolean)
      : [];

    return {
      Title: getFullDocumentName(data),
      Authors,
      Year: extractYear(data),
      Publisher: extractSource(data),
      Format,
      TypeDisp: data?.standard_type || data?.docdata?.standard_type || "General Document",
      Kind: getKind(pnx, data),
      Genre: pnx?.addata?.genre?.[0] || "",
      ControlNumber: controlNumber,
      RecordLink: getLink(data),
      ThumbnailURL: data?.ThumbnailURL || null,
      ISBNs: extractISBNs(pnx, data),
      DocType: getDocumentType(data),
    };
  }, [data, pnx, controlNumber]);

  const uid = participant?._id || getCurrentUserId();

  /**
   * Workspace bookmark index (`savedocIdProp`) is the source of truth for cross-page sync.
   * `optimisticSavedId` only covers the gap after save on this row before context refetches.
   * Stale local id must NOT win over an empty prop when the doc was unsaved on Saved results.
   */
  const [optimisticSavedId, setOptimisticSavedId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const rowKey = useMemo(
    () => normKey(extractExternalId(data) || externalId || controlNumber),
    [data, externalId, controlNumber]
  );

  useEffect(() => {
    if (savedocIdProp && optimisticSavedId && String(savedocIdProp) === String(optimisticSavedId)) {
      setOptimisticSavedId(null);
    }
  }, [savedocIdProp, optimisticSavedId]);

  useEffect(() => {
    const onWorkspaceUnsave = (e) => {
      const d = e?.detail || {};
      const dExt = normKey(d.externalId ?? d.controlNumber);
      const dId = String(d.savedocId || d.savedId || "");
      const propId = savedocIdProp != null ? String(savedocIdProp) : "";
      const optId = optimisticSavedId != null ? String(optimisticSavedId) : "";

      if (rowKey && dExt && (dExt === rowKey || dExt === normKey(controlNumber))) {
        setOptimisticSavedId(null);
        return;
      }
      if (dId && ((propId && dId === propId) || (optId && dId === optId))) {
        setOptimisticSavedId(null);
      }
    };
    window.addEventListener("ws:unsaved", onWorkspaceUnsave);
    window.addEventListener("ws:document:removed", onWorkspaceUnsave);
    return () => {
      window.removeEventListener("ws:unsaved", onWorkspaceUnsave);
      window.removeEventListener("ws:document:removed", onWorkspaceUnsave);
    };
  }, [rowKey, controlNumber, savedocIdProp, optimisticSavedId]);

  const cardRef = useRef(null);

  const buildDocPayload = useCallback(() => {
    return {
      ControlNumber: view.ControlNumber,
      externalId: externalId || controlNumber,
      Title: view.Title,
      Author: view.Authors?.join(", "),
      PublicationDate: view.Year,
      Format: view.Format,
      Kind: view.Kind,
      Genre: view.Genre,
      Type: view.TypeDisp,
      ThumbnailURL: null,
      pnx: data?.pnx,
    };
  }, [view, externalId, controlNumber, data?.pnx]);

  const handleTitleClick = useCallback((e) => {
    // Do not preventDefault — allow external link navigation.
    if (e?.stopPropagation) e.stopPropagation();
  }, []);

  const handleBookmarkToggle = useCallback(async () => {
    if (isSaving) return;
    const id = savedocIdProp || optimisticSavedId;
    if (id) {
      setIsSaving(true);
      try {
        await unsaveSavedDocument(id, { controlNumber, externalId: externalId || controlNumber });
      } finally {
        setIsSaving(false);
      }
      setOptimisticSavedId(null);
      return;
    }
    if (!controlNumber || !String(controlNumber).trim()) {
      if (typeof window !== "undefined" && window.alert) {
        window.alert("Cannot save document: missing identifier. Please try again.");
      }
      return;
    }
    if (!getSelectedWorkspaceId()) {
      console.error("[ResultRow] Cannot save: no workspace selected");
      return;
    }
    setIsSaving(true);
    try {
      const validQuery = query && query.trim() ? query.trim() : "Saved from search";
      const docDataFull = buildDocPayload();
      const newId = await ensureSavedThenGetId(docDataFull, {
        userId: uid,
        query: validQuery,
        searchTopic: searchTopic || validQuery,
        queryId: queryIdRef.current || null,
      });
      setOptimisticSavedId(newId || null);
    } catch (e) {
      console.error("[ResultRow] Save failed:", e);
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    savedocIdProp,
    optimisticSavedId,
    controlNumber,
    externalId,
    query,
    searchTopic,
    uid,
    buildDocPayload,
  ]);

  const metadataLine = useMemo(() => {
    const year = extractYear(data);
    const authors = extractAuthors(data);
    const source = extractSource(data);
    return [year, authors, source].filter(Boolean).join(" · ");
  }, [data]);

  const resolvedId = savedocIdProp || optimisticSavedId;
  const serpRightColumn = !hideSaveButton && (
    <BookmarkSaveButton
      saved={!!resolvedId}
      disabled={isSaving}
      onToggle={handleBookmarkToggle}
    />
  );

  return (
    <ResultCardShell
      cardRef={cardRef}
      doc={data}
      title={view.Title}
      titleHref={buildUReginaPrimoFullDisplayUrl(data)}
      metadataLine={metadataLine}
      hideSaveButton={hideSaveButton}
      rightColumn={serpRightColumn}
      cardClassName="serp-result-card"
      cardSx={{ mb: 0 }}
      contentSx={{ paddingLeft: "12px !important" }}
      onTitleClick={handleTitleClick}
    />
  );
};

export default ResultRow;
