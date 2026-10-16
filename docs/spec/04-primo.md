# 04 External dependency: Primo Search API

University of Regina's Archer Library search ("Quick Find") runs on Ex Libris Primo. Access
works today (the Baseline app already calls it through `backend/routes/libraryRoutes.js` with
the key in server-side `.env`; reuse that proxy, do not rebuild it). Institution, base URL and view
scoping are already set there (`PRIMO_BASE_URL`, `PRIMO_INSTITUTION` in `.env`, read by
`backend/controllers/libraryController.js`); do not hard-code them elsewhere.

**Per-result fields MINDS needs:** title, author(s), venue ("Is Part Of"), keywords,
abstract/description, resource type, identifiers (DOI/ISSN/PMID). No full text anywhere.

**Still to measure or confirm** (affects scoring quality and quota):

- Whether records reliably include an abstract/description, or mostly citation-level metadata.
  This sets scoring quality (F2) and the "Description" line on every card.
- Daily/hourly call quota. MINDS makes one Primo query per direction the participant views
  (the active direction only; again the first time they switch to another direction), plus
  extra calls when they load more or when page 2 is prefetched. Budget for that multiplier.
- Whether the response includes the total hit count (shown as "Results: N") and the maximum
  page size per call.

**Caching:** cache raw Primo responses keyed by normalized query string, TTL about 24 hours, to
protect the quota in development and in the live study. This is the `primocache` collection (02-data-model.md)
and is separate from `resultscache`, which holds result metadata and **never expires**, because saved
cards, scores and the Saved results views depend on it.

**Test fixtures:** automated tests run against mocked Primo JSON shaped like a real response
(including records with no abstract, duplicates and a failing call), never against the live
service. Fixtures are built in the "mock Primo fixtures" task.
