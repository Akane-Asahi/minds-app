/**
 * Document Metadata Utilities
 *
 * Centralized functions for extracting document metadata (title, authors, year, source)
 * Used across SERP, saved-results list, mini-timeline (SERP sidebar), and shared cards
 * to ensure consistent metadata extraction and avoid code duplication.
 */

/**
 * Extract canonical externalId from a document (deduplication, identity).
 * Handles legacy fields: ControlNumber, controlNumber, docdata.ControlNumber.
 */
export function extractExternalId(doc) {
  const val = doc?.externalId ?? doc?.ControlNumber ?? doc?.controlNumber ?? doc?.docdata?.ControlNumber;
  return val != null ? String(val).trim() : '';
}

/**
 * Normalize a raw saved document to canonical shape for Saved Search Results and shared cards.
 * Use at fetch time so downstream components only see canonical fields.
 *
 * @param {Object} doc - Raw document from API (may have _id, id, externalId, ControlNumber, etc.)
 * @returns {{ _id, externalId, title, authors, createdAt, ...rest }}
 */
export function normalizeSavedDoc(doc) {
  if (!doc) return null;
  const savedDocId = doc._id ?? doc.id ?? doc.savedDocId;
  if (!savedDocId) return null;

  const externalId = extractExternalId(doc);
  const title = getFullDocumentName(doc);
  const authors = extractAuthors(doc);
  const createdAt = doc.createdAt ?? doc.savedAt ?? doc.addedAt ?? null;

  return {
    ...doc,
    _id: String(savedDocId),
    externalId,
    title,
    authors,
    createdAt,
  };
}

/**
 * Extract and clean document title
 * Handles both PNX format and legacy document formats
 */
export function getFullDocumentName(doc) {
  if (doc.pnx && doc.pnx.display && doc.pnx.display.title) {
    let fullTitle = doc.pnx.display.title[0];
    // Clean up common trailing delimiters (e.g., from MARC records)
    fullTitle = fullTitle.replace(/[\s/:.]+$/, '').trim();
    // Remove surrounding quotes if they exist
    fullTitle = fullTitle.replace(/^"|"$/g, '');
    return fullTitle;
  }
  
  // Fallback to legacy title fields
  const docData = doc.docdata || doc;
  return docData.Title || docData.title || "Title Not Found";
}

/**
 * Extract clean four-digit year from document
 * Handles various date formats and locations in document structure
 */
export function extractYear(doc) {
  let rawDate = null;
  
  // Priority order: try PNX fields first, then legacy fields
  if (doc?.pnx?.display?.creationdate?.[0]) {
    rawDate = doc.pnx.display.creationdate[0];
  } else if (doc?.pnx?.addata?.date?.[0]) {
    rawDate = doc.pnx.addata.date[0];
  } else if (doc?.docdata?.pnx?.display?.creationdate?.[0]) {
    rawDate = doc.docdata.pnx.display.creationdate[0];
  } else if (doc?.docdata?.pnx?.addata?.date?.[0]) {
    rawDate = doc.docdata.pnx.addata.date[0];
  } else if (doc?.docdata?.PublicationDate) {
    rawDate = doc.docdata.PublicationDate;
  } else if (doc?.docdata?.Year) {
    rawDate = doc.docdata.Year;
  } else if (doc?.docdata?.year) {
    rawDate = doc.docdata.year;
  } else if (doc?.addata?.date?.[0]) {
    // Direct addata access (SERP format)
    rawDate = doc.addata.date[0];
  }
  
  // Extract 4-digit year using regex
  if (rawDate) {
    const match = String(rawDate).match(/(\d{4})/);
    if (match && match.length > 1) {
      return match[1];
    }
  }
  
  return "";
}

/**
 * Extract source/publisher from document
 * Handles both PNX format and legacy document formats
 * Returns empty string if not found
 */
export function extractSource(doc) {
  const docData = doc.docdata || {};
  
  // Priority order: PNX fields first, then legacy fields
  return doc?.pnx?.addata?.pub?.[0] || 
         doc?.pnx?.display?.publisher?.[0] || 
         docData.pnx?.addata?.pub?.[0] || 
         docData.pnx?.display?.publisher?.[0] || 
         docData.Publisher || 
         docData.publisher || 
         "";
}

/**
 * Extract and format authors from document
 * Comprehensive extraction matching SERP logic with priority-based fallbacks
 * Returns formatted string: "Author1, Author2" or "Author1, Author2, et al."
 */
export function extractAuthors(doc) {
  try {
    // Helper to split semicolon-separated author strings
    const splitAuthors = (authorList) => {
      if (!Array.isArray(authorList)) return [];
      return authorList.flatMap(author => {
        if (typeof author === 'string' && author.includes(';')) {
          return author.split(';').map(a => a.trim()).filter(a => a);
        }
        return author;
      });
    };
    
    let allAuthors = [];
    const docData = doc.docdata || {};
    
    // Priority 1: pnx.addata.au (Primary Authors) - most reliable
    if (doc?.pnx?.addata?.au && Array.isArray(doc.pnx.addata.au) && doc.pnx.addata.au.length > 0) {
      allAuthors = splitAuthors(doc.pnx.addata.au);
    }
    // Priority 2: pnx.display.creator (if Priority 1 is empty)
    else if (doc?.pnx?.display?.creator && Array.isArray(doc.pnx.display.creator) && doc.pnx.display.creator.length > 0) {
      allAuthors = splitAuthors(doc.pnx.display.creator).map(creator => {
        return creator.replace(/,\s*author\.\$\$.*$/, '').trim();
      });
    }
    // Priority 3: pnx.sort.author (if Priority 1 & 2 are empty)
    else if (doc?.pnx?.sort?.author && Array.isArray(doc.pnx.sort.author) && doc.pnx.sort.author.length > 0) {
      allAuthors = splitAuthors(doc.pnx.sort.author).map(author => {
        return author.replace(/,\s*author\.$/, '').trim();
      });
    }
    // Priority 4: Direct addata access (SERP format)
    else if (doc?.addata?.au) {
      const au = Array.isArray(doc.addata.au) ? doc.addata.au : [doc.addata.au];
      allAuthors = splitAuthors(au);
    } else if (doc?.addata?.addau) {
      const addau = Array.isArray(doc.addata.addau) ? doc.addata.addau : [doc.addata.addau];
      allAuthors = splitAuthors(addau);
    }
    // Priority 5: Legacy fallback
    else if (docData?.Author) {
      // Handle comma-separated author string from old saves
      const authorString = docData.Author;
      if (typeof authorString === 'string' && authorString.includes(',')) {
        allAuthors = authorString.split(',').map(a => a.trim()).filter(a => a);
      } else {
        allAuthors = [authorString];
      }
    } else if (docData?.Authors) {
      const authors = Array.isArray(docData.Authors) ? docData.Authors : [docData.Authors];
      allAuthors = splitAuthors(authors);
    } else if (docData?.authors) {
      const authors = Array.isArray(docData.authors) ? docData.authors : [docData.authors];
      allAuthors = splitAuthors(authors);
    }
    
    // Clean and deduplicate authors
    const cleanedAuthors = allAuthors
      .filter(author => author && typeof author === 'string' && author.trim())
      .map(author => {
        // First, split by $$ to get the main name part (better handling)
        const mainPart = author.split('$$')[0];
        
        // Clean up author names - comprehensive cleanup
        return mainPart
          .replace(/,\s*author\.\$\$.*$/, '') // Remove role info like "author.$$Q..."
          .replace(/,\s*author\.?$/i, '') // Remove simple role info like "author." or "author"
          .replace(/\s*author\.?$/i, '') // Remove trailing "author" or "author."
          .replace(/\$\$Q/g, '') // Remove $$Q markers
          .replace(/\$\$\./g, '') // Remove $$. markers
          .replace(/,\s*\d{4}-.*$/, '') // Remove dates like ", 1950-"
          .replace(/,\s*\d{4}$/g, '') // Remove trailing years like ", 1950"
          .replace(/\s+/g, ' ') // Normalize spaces
          .trim();
      })
      .filter(author => author.length > 0);
    
    // Remove duplicates while preserving order
    // Use aggressive normalization to catch similar names
    const uniqueAuthors = [];
    const seenNormalized = new Set();
    const seenExact = new Set();
    
    for (const author of cleanedAuthors) {
      // Normalize by removing all punctuation, extra spaces, and converting to lowercase
      const normalized = author
        .toLowerCase()
        .replace(/[-,;:.]/g, '') // Remove punctuation including hyphens (hyphen first to avoid range)
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
      
      // Also check exact match (case-insensitive) as safety net
      const exactCheck = author.toLowerCase().trim();
      
      if (!seenNormalized.has(normalized) && !seenExact.has(exactCheck)) {
        seenNormalized.add(normalized);
        seenExact.add(exactCheck);
        uniqueAuthors.push(author);
      }
    }
    
    // Format output
    if (uniqueAuthors.length === 0) return '';
    if (uniqueAuthors.length <= 2) {
      return uniqueAuthors.join(', ');
    }
    // Truncate to first two names and add 'et al.'
    return uniqueAuthors.slice(0, 2).join(', ') + ', et al.';
    
  } catch (error) {
    console.error('Error extracting authors:', error);
    // Fallback to simple extraction
    const docData = doc.docdata || doc;
    if (docData?.Author) {
      return docData.Author;
    }
    // Try direct addata access
    if (doc?.addata?.au) {
      const authors = Array.isArray(doc.addata.au) ? doc.addata.au : [doc.addata.au];
      return authors.slice(0, 2).join(', ') + (authors.length > 2 ? ', et al.' : '');
    }
    return '';
  }
}

