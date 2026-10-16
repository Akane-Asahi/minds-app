/**
 * Metadata Normalization Module
 * 
 * This module standardizes heterogeneous document data (books, journals, magazines, conferences)
 * into consistent, clean metadata fields for frontend display.
 * 
 * Strategy:
 * 1. Determine authoritative document type
 * 2. Extract and clean standardized fields based on document type
 * 3. Generate unified display line
 */

/**
 * Step 0: standard_type → displayLabel mapping
 *
 * Maps the backend's canonical standard_type value to the human-readable label
 * that the frontend's pickIcon() would return for the same type.  Kept in sync
 * with the frontend TYPE_MAP / TOKEN_RULES in src/shared/iconMapper.js.
 *
 * This is used to backfill docdata.displayLabel / docdata.iconType on every
 * /querylist fetch so that saved-doc views always have a correct label even for
 * legacy documents that were saved before these fields were stored.
 */
const STANDARD_TYPE_TO_DISPLAY_LABEL = {
  'Article':               'Article',
  'Magazine Article':      'Journal',        // pickIcon: magazine → Journal
  'Newspaper Article':     'News',
  'Journal':               'Journal',
  'Book':                  'Book',
  'E-book':                'E-book',
  'Book Chapter':          'Chapter',
  'Conference Proceeding': 'Conference',
  'Conference Paper':      'Conference',
  'Proceedings':           'Proceedings',
  'Thesis':                'Thesis',
  'Report':                'Report',
  'Web Resource':          'Web Resource',
  'Library Guide':         'Library Guide',
  'Dataset':               'Dataset',
  'Microform':             'Microform',
  'Multiple Versions':     'Multiple Versions',
  'Map':                   'Map',
  'General Document':      'Other',  // Never show "Book" for unclassifiable/stale docs.
};
// Missing PNX falls back to "Other" to avoid stale labels.

/**
 * Converts a standard_type string to the display label shown under the icon.
 * Returns 'Other' for unknown / empty types (same as the frontend fallback).
 */
function standardTypeToDisplayLabel(standardType) {
  if (!standardType) return 'Other';
  return STANDARD_TYPE_TO_DISPLAY_LABEL[standardType] || standardType;
}

/**
 * Document type determination.
 *
 * Priority chain mirrors the frontend documentTypeUtils.js so that standard_type
 * set here matches exactly what the frontend would compute independently:
 *
 *   1. pnx.addata.ristype    — standardised RIS type codes
 *   2. pnx.search.recordtype — Primo's internal record-type string
 *   3. pnx.display.format    — e-book / format check before generic display.type
 *   4. pnx.display.type      — last-resort Primo display label
 *
 * Works for both doc shapes:
 *   A) Raw SERP doc  — pnx at root (doc.pnx)
 *   B) Saved docdata — pnx nested  (doc.pnx because docdata IS passed as doc here)
 */
function determineDocumentType(doc) {
  const pnx = doc.pnx; // works for both shapes (see callers)

  // ── Journal guard (must run BEFORE ristype) ───────────────────────────────
  // Primo uses ristype = "JOUR" for both standalone journals and journal articles.
  // display.type / genre are more specific: if Primo says "journal" with no article
  // signal, this IS a journal publication, not an article.
  const rawDispType = (pnx?.display?.type?.[0]  || '').toLowerCase();
  const rawGenre    = (pnx?.addata?.genre?.[0]   || '').toLowerCase();
  if (
    (rawDispType === 'journal' || rawDispType === 'periodical') &&
    !rawGenre.includes('article')
  ) {
    return 'Journal';
  }

  // 1. RIS type code — most standardised Primo signal
  const ris = (pnx?.addata?.ristype?.[0] || '').toUpperCase().trim();
  const risMap = {
    JOUR: 'Article', MGZN: 'Magazine Article', NEWS: 'Newspaper Article',
    BOOK: 'Book',    CHAP: 'Book Chapter',      CONF: 'Conference Paper',
    THES: 'Thesis',  RPRT: 'Report',
    ELEC: 'Web Resource', ICOMM: 'Web Resource',
  };
  if (ris && risMap[ris]) return risMap[ris];

  // 2. Primo search.recordtype substring match
  const rt = (pnx?.search?.recordtype?.[0] || '').toLowerCase().trim();
  if (rt) {
    if (rt.includes('conference') || rt.includes('proceeding')) return 'Conference Proceeding';
    if (rt.includes('ebook') || rt.includes('e-book') || rt.includes('electronic_book'))
      return 'E-book';
    if (rt.includes('article'))                                  return 'Article';
    if (rt.includes('journal'))                                  return 'Journal';
    if (rt.includes('chapter'))                                  return 'Book Chapter';
    if (rt.includes('thesis') || rt.includes('dissertation'))   return 'Thesis';
    if (rt.includes('report'))                                   return 'Report';
    if (rt.includes('book'))                                     return 'Book';
    if (rt.includes('website') || rt.includes('web_resource') ||
        rt.includes('online'))                                   return 'Web Resource';
    if (rt.includes('research_guide') || rt.includes('libguide') ||
        rt.includes('library_guide') || rt.includes('guide'))   return 'Library Guide';
    if (rt.includes('dataset') || rt.includes('data_set'))      return 'Dataset';
  }

  // 2.5 Conference/Proceedings from display.type (BEFORE format E-book check)
  //    So "Proceedings" with format "Electronic resource" is not misclassified as E-book.
  if (/\bproceedings\b/i.test(rawDispType)) return 'Proceedings';
  if (/\b(proceeding|conference)\b/i.test(rawDispType)) return 'Conference Proceeding';

  // 3. E-book / format check BEFORE generic display.type
  const format = (
    pnx?.display?.format?.[0] ||
    pnx?.addata?.format?.[0]  ||
    doc.Format || doc.format  ||
    ''
  ).toLowerCase();

  if (
    format.includes('e-book') || format.includes('ebook') ||
    format.includes('electronic book') || format.includes('electronic resource')
  ) return 'E-book';

  // 4. display.type last-resort
  const t = (pnx?.display?.type?.[0] || '').toLowerCase();
  if (t.includes('article'))                              return 'Article';
  if (t.includes('journal'))                              return 'Journal';
  if (t.includes('chapter'))                              return 'Book Chapter';
  if (t.includes('conference') || t.includes('proceeding')) return 'Conference Proceeding';
  if (t.includes('thesis') || t.includes('dissertation')) return 'Thesis';
  if (t.includes('report'))                               return 'Report';
  if (t.includes('book'))                                 return 'Book';
  if (t.includes('website') || t.includes('web'))        return 'Web Resource';
  if (t.includes('guide'))                                return 'Library Guide';

  // genre as weak fallback
  const genre = (pnx?.addata?.genre?.[0] || pnx?.display?.genre?.[0] || '').toLowerCase();
  if (genre.includes('article')) return 'Article';
  if (genre.includes('book'))    return 'Book';

  return 'General Document';
}

/**
 * Step 2A: Standardized Year Field
 * Resolves inconsistent year/range issues based on document type
 */
function extractStandardizedYear(doc, docType) {
  let rawYear = '';
  
  // Try different year sources - check both root level and pnx level
  if (doc.addata?.date?.[0]) {
    rawYear = doc.addata.date[0];
  } else if (doc.pnx?.addata?.date?.[0]) {
    rawYear = doc.pnx.addata.date[0];
  } else if (doc.pnx?.display?.creationdate?.[0]) {
    rawYear = doc.pnx.display.creationdate[0];
  }

  if (!rawYear) return '';

  // Clean and format based on document type
  if (docType === 'Magazine') {
    // For magazines, preserve the full range (e.g., 1971-1978)
    const cleanRange = rawYear.replace(/[^\d-]/g, '').trim();
    // Only return if it's a valid range (e.g., 1971-1978)
    if (cleanRange.includes('-') && cleanRange.match(/\d{4}-\d{4}/)) {
      return cleanRange;
    }
  }
  
  // For all other types, use only the first 4-digit year found
  const yearMatch = rawYear.match(/\d{4}/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    // Sanity check: year should be reasonable (between 1000 and current year + 5)
    const currentYear = new Date().getFullYear();
    if (year >= 1000 && year <= currentYear + 5) {
      return yearMatch[0];
    }
  }
  
  return '';
}

/**
 * Step 2B: Standardized Authors Field
 * Combines and cleans author lists with proper truncation
 */
function extractStandardizedAuthors(doc) {
  let allAuthors = [];

  // Combine primary and additional authors - check both root level and pnx level
  if (doc.addata?.au) {
    allAuthors = allAuthors.concat(doc.addata.au);
  } else if (doc.pnx?.addata?.au) {
    allAuthors = allAuthors.concat(doc.pnx.addata.au);
  }
  
  if (doc.addata?.addau) {
    allAuthors = allAuthors.concat(doc.addata.addau);
  } else if (doc.pnx?.addata?.addau) {
    allAuthors = allAuthors.concat(doc.pnx.addata.addau);
  }

  // Clean authors: remove internal delimiters and clean up
  const cleanAuthors = allAuthors
    .filter(Boolean)
    .map(author => {
      // Remove $$Q, $N and other internal delimiters
      return author
        .replace(/\$\$Q/g, '')
        .replace(/\$\$N/g, '')
        .replace(/\$\$/g, '')
        .replace(/\b\d{4}-\b/g, '') // Remove birth year patterns like "1970-"
        .replace(/author/gi, '') // Remove "author" text
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    })
    .filter(author => author.length > 0 && author.length > 2); // Filter out very short strings

  // Remove duplicates using a more sophisticated approach
  const uniqueAuthors = [];
  const seenNames = new Set();
  
  for (const author of cleanAuthors) {
    // Normalize name for comparison (remove extra spaces, convert to lowercase)
    const normalizedName = author.toLowerCase().replace(/\s+/g, ' ').trim();
    
    if (!seenNames.has(normalizedName)) {
      seenNames.add(normalizedName);
      uniqueAuthors.push(author);
    }
  }

  if (uniqueAuthors.length === 0) return '';

  // Truncate after 1-2 authors and append "et al."
  if (uniqueAuthors.length <= 2) {
    return uniqueAuthors.join(', ');
  } else {
    return uniqueAuthors.slice(0, 2).join(', ') + ', et al.';
  }
}

/**
 * Step 2C: Standardized Source Field
 * Resolves inconsistent subtitle/source line based on document type
 */
function extractStandardizedSource(doc, docType) {
  let source = '';

  switch (docType) {
    case 'Book':
      // For books, use publisher - check both root level and pnx level
      source = doc.addata?.pub?.[0] || doc.pnx?.addata?.pub?.[0] || '';
      // Fallback to series title if no publisher
      if (!source && (doc.addata?.seriestitle?.[0] || doc.pnx?.addata?.seriestitle?.[0])) {
        source = doc.addata?.seriestitle?.[0] || doc.pnx?.addata?.seriestitle?.[0];
      }
      break;

    case 'Journal':
    case 'Article':
      // For journals/articles, use journal name
      source = doc.facets?.jtitle?.[0] || '';
      // Fallback to pnx.display.source if no journal title
      if (!source && doc.pnx?.display?.source?.[0]) {
        source = doc.pnx.display.source[0];
      }
      break;

    case 'Conference':
      // For conferences, use clearest contributor name
      if (doc.pnx?.display?.contributor?.[0]) {
        source = doc.pnx.display.contributor[0];
      } else if (doc.addata?.pub?.[0]) {
        source = doc.addata.pub[0];
      }
      break;

    case 'Magazine':
      // For magazines, use publisher or source
      source = doc.addata?.pub?.[0] || doc.pnx?.display?.source?.[0] || '';
      break;

    default:
      // For other types, try multiple sources
      source = doc.addata?.pub?.[0] || 
               doc.facets?.jtitle?.[0] || 
               doc.pnx?.display?.source?.[0] || '';
  }

  // Clean and truncate source name (max 40 characters)
  const trimmed = source.trim();
  if (trimmed.length > 40) {
    return trimmed.substring(0, 40) + "…";
  }
  return trimmed;
}

/** Creates the final metadata_line for frontend consumption. */
function generateUnifiedDisplayLine(docType, displayYear, displayAuthors, displaySource) {
  const parts = [];

  if (displayYear) parts.push(displayYear);
  if (displayAuthors) parts.push(displayAuthors);
  if (displaySource) parts.push(displaySource);

  return parts.join(' · ');
}

/**
 * Main Normalization Function
 * Applies all normalization steps to a document
 */
function normalizeDocumentMetadata(doc) {
  try {
    const standardType = determineDocumentType(doc);
    const displayYear = extractStandardizedYear(doc, standardType);
    const displayAuthors = extractStandardizedAuthors(doc);
    const displaySource = extractStandardizedSource(doc, standardType);
    const metadataLine = generateUnifiedDisplayLine(standardType, displayYear, displayAuthors, displaySource);
    
    // Backfill displayLabel / iconType for mini-timeline and saved-results views.
    // Stored values set at SERP save time (libraryService.js) take priority;
    // we only fill in what's missing so legacy saves without these fields get
    // a correct label on every /querylist fetch without a DB write.
    const computedLabel = standardTypeToDisplayLabel(standardType);

    return {
      ...doc,
      standard_type:   standardType,
      display_year:    displayYear,
      display_authors: displayAuthors,
      display_source:  displaySource,
      metadata_line:   metadataLine,
      // Backfill: preserve stored value; compute from standard_type when absent.
      displayLabel: doc.displayLabel || computedLabel,
      iconType:     doc.iconType     || standardType || null,
    };
    
  } catch (error) {
    console.error('Error normalizing document metadata:', error);
    
    return {
      ...doc,
      standard_type:   'General Document',
      display_year:    '',
      display_authors: '',
      display_source:  '',
      metadata_line:   '',
      displayLabel: doc.displayLabel || 'Other',
      iconType:     doc.iconType     || null,
    };
  }
}

/**
 * Batch Normalization Function
 * Normalizes an array of documents
 */
function normalizeDocumentArray(documents) {
  if (!Array.isArray(documents)) {
    return documents;
  }

  return documents.map(doc => normalizeDocumentMetadata(doc));
}

module.exports = {
  determineDocumentType,
  standardTypeToDisplayLabel,
  extractStandardizedYear,
  extractStandardizedAuthors,
  extractStandardizedSource,
  generateUnifiedDisplayLine,
  normalizeDocumentMetadata,
  normalizeDocumentArray
};