/**
 * Document Type Utilities
 *
 * Single source of truth for document-type classification used by every view:
 * SERP and Saved Search Results (both via ResultCardShell's getDocumentIconType),
 * and ResultRow.jsx (imports helpers directly).
 *
 * Priority chain (mirrors Primo's own classification):
 *   1. pre-computed standard_type (set by backend normalizer on /api/search docs)
 *   2. pnx.addata.ristype     — standardised RIS type codes (JOUR, BOOK, THES …)
 *   3. pnx.search.recordtype  — Primo's internal record-type string
 *   4. pnx.display.type + pnx.display.format — last-resort Primo display fields
 *
 * Works for both doc shapes:
 *   A) SERP docs    — pnx at root: doc.pnx.display.type
 *   B) Saved docs   — pnx nested:  doc.docdata.pnx.display.type
 */

// Raw Primo doc_type (pnx.display.type[0]) → display label for saved views.
const DOC_TYPE_TO_DISPLAY_LABEL = {
  guides: 'Library Guide',
  guide: 'Library Guide',
  library_guide: 'Library Guide',
  research_guide: 'Library Guide',
  e_book: 'E-book',
  ebook: 'E-book',
  book: 'Book',
  journal: 'Journal',
  periodical: 'Journal',
  article: 'Article',
  web_resource: 'Web Resource',
  website: 'Web Resource',
  conference: 'Conference',
  proceeding: 'Conference',
  proceedings: 'Proceedings',
  thesis: 'Thesis',
  report: 'Report',
  chapter: 'Chapter',
  dataset: 'Dataset',
};
/** Raw Primo doc_type (e.g. "guides", "library_guide") → human-readable label for display under icon. */
export function getDisplayLabelFromDocType(docType) {
  if (!docType || typeof docType !== 'string') return '';
  const key = docType.toLowerCase().trim().replace(/\s+/g, '_');

  // Workspace/saved docs sometimes store internal Primo codes like "Ebook 02".
  // Normalize these to the same human label shown on the SERP.
  // Examples: "Ebook 02" → "E-book", "e_book_02" → "E-book", "ebook02" → "E-book".
  if (/^(e_?book)[_-]?\d+$/.test(key) || /^ebook[_-]?\d+$/.test(key)) return 'E-book';

  return (
    DOC_TYPE_TO_DISPLAY_LABEL[key] ||
    docType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  );
}

// Labels that may wrap to 2 lines under the icon; all others stay single-line with ellipsis (avoids wrapping "E-book", "Journal", etc.).
const ALLOW_WRAP_LABELS = new Set([
  'web resource',
  'library guide',
  'research guide',
  'conference proceeding',
  'book chapter',
  'magazine article',
  'newspaper article',
  'multiple versions',
]);

/**
 * Returns the className for the document type label so wrapping is consistent:
 * - Labels in ALLOW_WRAP_LABELS get docTypeLabelWrap (max 2 lines).
 * - All others get docTypeLabelNowrap (single line, ellipsis).
 */
export function getDocTypeLabelClassName(displayLabel) {
  if (!displayLabel || typeof displayLabel !== 'string') return 'docTypeLabel docTypeLabelNowrap';
  const normalized = displayLabel.trim().toLowerCase();
  const allowWrap = ALLOW_WRAP_LABELS.has(normalized);
  return allowWrap ? 'docTypeLabel docTypeLabelWrap' : 'docTypeLabel docTypeLabelNowrap';
}

// Low-level field extractors, exported so ResultRow.jsx can reuse them.

/** @param {object} pnx */
export const getRisType = (pnx) =>
  (pnx?.addata?.ristype?.[0] || "").toUpperCase().trim();

/** @param {object} pnx */
export const getRecordType = (pnx) =>
  (pnx?.search?.recordtype?.[0] || "").toLowerCase().trim();

// RIS type code → canonical kind string. See https://en.wikipedia.org/wiki/RIS_(file_format)
export const mapRisToKind = (ris) => {
  switch (ris) {
    case "JOUR": return "Article";
    case "MGZN": return "Magazine Article";
    case "NEWS": return "Newspaper Article";
    case "BOOK": return "Book";
    case "CHAP": return "Book Chapter";
    case "CONF": return "Conference Paper";
    case "THES": return "Thesis";
    case "RPRT": return "Report";
    case "ELEC": return "Web Resource";   // Electronic resource
    case "ICOMM":return "Web Resource";   // Internet communication
    default:     return null;
  }
};

// Primo search.recordtype substring → canonical kind string.
export const mapRecordTypeToKind = (rt) => {
  if (!rt) return null;
  // E-book / electronic book must precede generic "book"
  if (rt.includes("ebook") || rt.includes("e-book") || rt.includes("electronic_book"))
    return "E-book";
  if (rt.includes("article"))                              return "Article";
  if (rt.includes("journal"))                              return "Journal";
  if (rt.includes("chapter"))                              return "Book Chapter";
  if (rt.includes("conference") || rt.includes("proceeding")) return "Conference Proceeding";
  if (rt.includes("thesis") || rt.includes("dissertation")) return "Thesis";
  if (rt.includes("report"))                               return "Report";
  if (rt.includes("book"))                                 return "Book";
  if (rt.includes("magazine") || rt.includes("newspaper")) return "Magazine Article";
  // Web / online resources
  if (
    rt.includes("website")     ||
    rt.includes("web_resource") ||
    rt.includes("web resource") ||
    rt.includes("online")
  ) return "Web Resource";
  // Library / research guides (Primo LibGuides)
  if (
    rt.includes("research_guide") ||
    rt.includes("libguide")        ||
    rt.includes("library_guide")   ||
    rt.includes("guide")
  ) return "Library Guide";
  // Datasets
  if (rt.includes("dataset") || rt.includes("data_set")) return "Dataset";
  return null;
};

// display.type + display.format last-resort normaliser.
export const normalizeFromDispType = (typeStr = "", formatStr = "") => {
  const t = String(typeStr  || "").toLowerCase();
  const f = String(formatStr || "").toLowerCase();

  // E-book first (before generic book)
  if (
    t.includes("e-book") || f.includes("e-book") ||
    t.includes("ebook")  || f.includes("ebook")  ||
    t.includes("electronic book") || f.includes("electronic book")
  ) return "E-book";

  if (t.includes("article")  || f.includes("article"))  return "Article";
  if (t.includes("journal")  || f.includes("journal"))  return "Journal";
  if (t.includes("chapter")  || f.includes("chapter"))  return "Book Chapter";
  if (
    t.includes("conference") || t.includes("proceeding") ||
    f.includes("conference") || f.includes("proceeding")
  ) return "Conference Proceeding";
  if (t.includes("thesis") || t.includes("dissertation")) return "Thesis";
  if (t.includes("report")   || f.includes("report"))   return "Report";
  if (t.includes("book")     || f.includes("book"))     return "Book";
  if (t.includes("magazine") || t.includes("newspaper")) return "Magazine Article";
  // Web / guide — catch display-level strings
  if (
    t.includes("website")     || t.includes("web_resource") ||
    t.includes("web resource") || f.includes("web resource") ||
    t.includes("online")
  ) return "Web Resource";
  // Library / research guides — handle all Primo variants:
  //   "guide"         — bare singular (Primo sometimes uses this)
  //   "guides"        — Primo's plural content-type string
  //   "library guide" / "library_guide"
  //   "research guide" / "research_guide"
  //   "libguide"
  // Checked AFTER "book" so "guidebook" doesn't trigger this (it matches "book" first).
  if (
    t === 'guide' || t === 'guides' ||
    t.includes("research guide") || t.includes("library guide") ||
    t.includes("library_guide")  || t.includes("research_guide") ||
    t.includes("libguide")
  ) return "Library Guide";

  // Return raw string so pickIcon's TOKEN_RULES can still try
  return typeStr || formatStr || "Resource";
};

// Conference-hint scan (title + subject keyword heuristic).
export const hasConferenceHints = (pnx) => {
  const title = [
    ...(pnx?.display?.title    || []),
    ...(pnx?.display?.subject  || []),
    ...(pnx?.display?.lds07    || []),
  ].join(" ; ").toLowerCase();
  return /(proceedings?|symposium|conference|workshop|colloquium|seminar|congress(es)?)/i.test(title);
};

// FRBR / multiple-versions detection.

/**
 * Returns true when Primo has grouped this record with other editions / manifestations.
 *
 * Primo sets `pnx.search.frbrgroupid` (an array) when a record belongs to a FRBR
 * group — i.e. Primo found multiple versions of the same work and collapsed them.
 * The presence of a non-empty frbrgroupid is the canonical signal.
 *
 * Works for both SERP docs (pnx at root) and saved docs (pnx inside docdata).
 *
 * @param {object|null} pnx  – already-resolved pnx object (call doc?.pnx || doc?.docdata?.pnx first)
 * @returns {boolean}
 */
export const getHasMultipleVersions = (pnx) => {
  const groupId = pnx?.search?.frbrgroupid;
  return Array.isArray(groupId) ? groupId.length > 0 : Boolean(groupId);
};

/**
 * Returns the FRBR group-id string when available, or null.
 * @param {object|null} pnx
 * @returns {string|null}
 */
export const getVersionGroupId = (pnx) => {
  const groupId = pnx?.search?.frbrgroupid;
  if (Array.isArray(groupId)) return groupId[0] || null;
  return groupId || null;
};

// Format + genre extractor, used by getResourceType in iconMapper.js.

/**
 * Extract format and genre from document data.
 * Always falls back to flat doc/docdata fields so stored documents
 * (timeline, saved docs) produce the same values as SERP cards (ResultCardShell).
 */
export const extractFormatAndGenre = (doc) => {
  const pnx = doc?.pnx || doc?.docdata?.pnx;
  return {
    format:
      pnx?.display?.format?.[0] ||
      pnx?.addata?.format?.[0]  ||
      doc?.Format || doc?.docdata?.Format ||
      doc?.format || doc?.docdata?.format ||
      "",
    genre:
      pnx?.addata?.genre?.[0] ||
      doc?.Genre  || doc?.docdata?.Genre  ||
      doc?.genre  || doc?.docdata?.genre  ||
      "",
  };
};

// Main exported classifier.

/**
 * Get document type from document data.
 *
 * Works for SERP docs (pnx at root) and saved docs (pnx inside docdata).
 * Returns a human-readable canonical kind string such as "Article", "E-book",
 * "Web Resource", "Library Guide", etc.
 *
 * @param {Object} doc
 * @returns {string}
 */
export const getDocumentType = (doc) => {
  // Resolve pnx for both doc shapes up front (needed by the journal guard below)
  const pnx = doc?.pnx || doc?.docdata?.pnx;

  // ── Journal guard (must run BEFORE standard_type and ristype) ───────────────
  // Primo uses addata.ristype = "JOUR" for BOTH standalone journals AND journal
  // articles, so the backend normalizer incorrectly sets standard_type = "Article"
  // for standalone journals.  We override that by checking display.type directly:
  //   display.type = "journal" + genre != "article"  →  "Journal"
  // Journal articles have display.type = "article" / "journal article", so they
  // will not match this guard and continue to be labelled "Article".
  const rawDispType = (pnx?.display?.type?.[0] || '').toLowerCase();
  const rawGenre    = (pnx?.addata?.genre?.[0]  || '').toLowerCase();
  if (
    (rawDispType === 'journal' || rawDispType === 'periodical') &&
    !rawGenre.includes('article')
  ) {
    return 'Journal';
  }

  // 1. Pre-computed by backend normalizer — trust it if present
  const standard = doc?.standard_type || doc?.docdata?.standard_type;
  if (standard) return standard;

  // 2. RIS type code — most standardised Primo signal
  const ris = getRisType(pnx);
  const k1  = mapRisToKind(ris);
  if (k1) return k1;

  // 3. Primo search.recordtype substring match
  const rt = getRecordType(pnx);
  const k2 = mapRecordTypeToKind(rt);
  if (k2) return k2;

  // 3.5 Conference/Proceedings from display.type (BEFORE format E-book check)
  //    So "Proceedings" with format "Electronic resource" is not misclassified as E-book.
  if (/\bproceedings\b/i.test(rawDispType)) return "Proceedings";
  if (/\b(proceeding|conference)\b/i.test(rawDispType)) return "Conference Proceeding";

  // 4. E-book / format check BEFORE generic display.type so "Electronic Book"
  //    in the format field isn't swallowed by the generic "book" branch
  const format = (
    pnx?.display?.format?.[0]      ||
    pnx?.addata?.format?.[0]       ||
    doc?.docdata?.pnx?.display?.format?.[0] ||
    doc?.Format || doc?.docdata?.Format      ||
    ""
  ).toLowerCase();

  if (
    format.includes("e-book")         ||
    format.includes("ebook")          ||
    format.includes("electronic book") ||
    format.includes("electronic resource")
  ) return "E-book";

  // 5. Conference hint scan
  if (hasConferenceHints(pnx)) return "Conference Proceeding";

  // 6. display.type + display.format last-resort normaliser
  const dispType = pnx?.display?.type?.[0] || "";
  return normalizeFromDispType(dispType, format);
};
