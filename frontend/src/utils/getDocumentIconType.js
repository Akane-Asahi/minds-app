/**
 * getDocumentIconType — single, canonical entry point for icon classification.
 *
 * Returns { format, type, genre, displayLabel } for any document object.
 *   • format / type / genre  – raw classification inputs (passed to <IconMapper>)
 *   • displayLabel           – human-readable label shown under the icon, e.g. "E-book".
 *                              Always use THIS for the text so that label and icon match.
 *
 * Resolution priority (three paths, tried in order):
 *
 *   Path B  – stored label (HIGHEST priority)
 *             doc.docdata.displayLabel + doc.docdata.iconType
 *             Set at SERP save time (libraryService.js) from the full Primo PNX.
 *             Also backfilled by the backend normalizer (metadataNormalizer.js)
 *             on every /querylist fetch, so ALL saved docs have these fields even
 *             for legacy records that pre-date the save-time computation.
 *             Using stored values guarantees mini-timeline matches SERP exactly.
 *
 *   Path A  – live PNX classification (when stored label is absent)
 *             getResourceType(doc) → getDocumentType() → pickIcon()
 *             Handles SERP docs (pnx at root, no docdata) and any edge case where
 *             the stored label is missing despite pnx being present.
 *
 *   Path F  – last resort (no stored label AND no pnx)
 *             Runs getResourceType which falls back to whatever flat fields exist;
 *             may produce "Other" for truly unclassifiable docs — correct and safe.
 *
 * Works for all doc shapes:
 *   • SERP              – raw Primo pnx at doc.pnx (no docdata → Path A)
 *   • Mini Timeline /
 *     Saved Results     – stored docdata with displayLabel/iconType → Path B
 */
import { getResourceType, pickIcon } from '../shared/iconMapper';
import { getDocumentType } from './documentTypeUtils';

/**
 * @param {Object} doc  – raw doc from any context (SERP, timeline, saved)
 * @returns {{ format: string, type: string, genre: string, displayLabel: string }}
 */
export function getDocumentIconType(doc) {
  const pnx = doc?.pnx || doc?.docdata?.pnx;

  // ── Path B: stored label (HIGHEST priority) ──────────────────────────────────
  // Set at SERP save time; backfilled by backend normalizer on every fetch.
  // Guarantees that mini-timeline / saved-results match what SERP showed.
  const storedLabel = doc?.docdata?.displayLabel || null;
  const storedType  = doc?.docdata?.iconType      || null;

  if (storedLabel && storedType) {
    const rawPnx = pnx;
    const format = rawPnx?.display?.format?.[0] || 'other';
    const genre  = rawPnx?.addata?.genre?.[0]   || '';
    // Override stale stored label when live PNX classification is proceedings/conference
    // (fixes Saved Search Results showing "Ebook 02" for proceedings saved with wrong displayLabel).
    if (pnx) {
      const liveType = getDocumentType(doc);
      if (liveType === 'Proceedings' || liveType === 'Conference Proceeding') {
        const { label: displayLabel } = pickIcon({ format, type: liveType, genre });
        return { format, type: liveType, genre, displayLabel };
      }
    }
    return { format, type: storedType, genre, displayLabel: storedLabel };
  }

  // ── Path A: live PNX classification (stored label absent) ────────────────────
  // Handles SERP docs (no docdata) and docs with pnx but missing stored label.
  if (pnx) {
    const { format, type, genre } = getResourceType(doc);
    const { label: displayLabel }  = pickIcon({ format, type, genre });
    return { format, type, genre, displayLabel };
  }

  // ── Path F: last-resort fallback (no stored label AND no pnx) ────────────────
  const { format, type, genre } = getResourceType(doc);
  const { label: displayLabel }  = pickIcon({ format, type, genre });
  return { format, type, genre, displayLabel };
}
