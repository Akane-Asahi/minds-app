# F2 SERP pipeline: search controls, query (5.2), scoring (5.3), ranking

**Problem it solves:** a participant with dyslexia cannot easily tell which results fit which
part of the task, and writing good queries (spelling, wording) is hard. The system writes a query
per direction, fetches results, and scores each result against every direction so ranking and
chips reflect the active direction.
**Challenges it answers:** query formulation; telling relevant from non-relevant; unsure results
are good enough.
**Load with:** 01-core.md, 03-api.md (search, reasoning), 04-primo.md. Card UI is in F3.
**Depends on:** F1 (workspace and directions exist). Primo proxy exists in Baseline.
**Status:** not started. Route: `/workspace/:id/serp` (optional `?direction=<id>`).

## Search controls (SERP main column)

**Search field.** Shows the active direction's query with a search icon (a real button). It is
**editable**.
- On arrival and on each direction change it shows that direction's query (the 5.2 query or the
  newest query the participant submitted for it).
- Submit (Enter or the icon) sends the text to Primo **exactly as typed**
  (`POST /api/sessions/:id/search` with `queryText`; 5.2 is not called), then scores and ranks the
  new pool for the active direction. Stored as a `queries` row with `source: 'user'`. The
  Results count updates.
- Empty submit does nothing. Blur does not search; only explicit submit does. A typed query
  applies to the active direction only.

**Meta bar.** Left: `Results: N` (Primo's total hit count, `totalHits`); informational only,
never a denominator for anything. Right: **Search Direction** dropdown.

**Search Direction dropdown.** Options = all selected directions in `orderIndex` order; the first
is selected on arrival. Choosing another generates its query (5.2) or reuses the stored one,
searches Primo, scores, and re-renders the field, count and list (skeleton cards while loading).
Lists already loaded this session are kept, so switching back is instant. Switching never changes
saved results or the right-panel counts. Keyboard-operable (native `<select>` or accessible
listbox).

## Ranking flow (per search)

**On arrival** the SERP automatically searches the **first selected direction only** and shows the
loading state until results return (first search runs without a click; assumed default, see
open-questions.md).

1. Generate the active direction's query (5.2).
2. Fetch a pool of `CANDIDATE_POOL_SIZE` (10) from Primo, merge, dedupe.
3. Score the whole pool in one batched call (5.3) against every selected direction and every
   suggested new direction (skipping pairs already in `resultscores`).
4. Sort by the **active direction's score**, highest first; ties by Primo's original order.
   New directions play no part in ranking.
5. Render. Cards already on screen never reorder.

Ranking orders a pool of 10, not all N hits (a better match at Primo position 11 is not pulled
up; the main value is the direction chips). **Load more:** when the participant reaches the end of
the list, fetch the next pool with `cursor`, score and rank it the same way, append below.
**Prefetch:** while the participant reads page 1, fetch and score page 2 in the background so it
appears instantly. Measure real time-to-first-ranked-list with a real Primo response and the chosen
model before changing the pool size (latency not yet measured).

## Call 5.2: query generation (one direction at a time)

Called for the first selected direction on arrival, and the first time the participant switches to
another direction. The query is stored and reused when they switch back.

**Input:** `goalText`, `knownText`, `wantText`, the active direction's label. When entering from
Your sessions (F5) also `previousQueries` (earlier queries for that direction) and `savedTitles`
(titles and keywords of results already saved under it); the prompt then asks for a **better,
different** query that reaches new material and does not repeat those queries or re-find saved
results.

**Output:** `{ "query_text": "string" }` sent to Primo as-is and shown in the search field.

## Call 5.3: result scoring (batched, one call per search)

Batching is a cost and latency requirement. Primo is the first-stage retriever; the LLM is the
second-stage judge. Scoring uses the LLM, **not embeddings** (embedding similarity measures topical
closeness, not whether a result helps a direction; short labels embed poorly; per-set calibration
forces a spread even on a weak page).

**Input:** selected directions (id + label, in `orderIndex` order), the active direction id,
stored suggested new directions (id + label), and for each result: title, authors, venue, keywords,
abstract/description, resource type, and `known_scores` (scores already stored for that result,
read-only context). Only pairs **without** a stored score are scored. Primo metadata only.

**Casing:** LLM JSON uses snake_case as shown in the schemas; the server maps it to camelCase for the
API and Mongo.

**The model:**
1. Scores every result against **each selected direction and each suggested new direction**, whole
   numbers 0 to 5, using an absolute anchored rubric: 5 = the result's main topic is this direction;
   4 = a substantial part of it; 3 = relevant but only partly; 2 = mentioned in passing; 1 =
   tangential; 0 = unrelated. Temperature 0.
2. Writes one reasoning sentence (about 20 words max) **only for the chips a card will show**. The
   model ranks each result's directions using the new scores **plus `known_scores`**, then writes
   reasoning for the newly scored pairs that fall in the result's top `CHIP_COUNT` selected directions
   **with a score above 0** (ties: earlier in the given order), or that are its highest-scoring suggested
   new direction (score above 0). Every other newly scored pair has `reasoning: null`. Pairs already
   stored keep their stored reasoning (text or null).
3. Each reasoning must rest on something actually in the record's metadata (a phrase from the
   abstract, subjects or title) and may not add claims the metadata does not support.
4. If a record has no abstract, scores from title and subjects, sets `low_confidence: true`, and begins
   each reasoning with "Based on title and subjects only".

**Output schema (validate with Zod):**
```json
{ "results": [ {
    "result_id": "string",
    "low_confidence": "boolean",
    "scores": [ { "sub_goal_id": "selected or suggested new direction id",
                  "score": "integer 0-5",
                  "reasoning": "one short sentence, or null" } ] } ] }
```

**Server after the call (plain code, not the LLM):** floor any decimal and clamp to 0 to 5 so a
malformed value never reaches the screen; store scores in `resultscores`; build each card's pills
(F3). Stored scores are reused if the same result appears under another direction's query, so a
result never gets two scores for the same direction. Only unscored pairs are sent.

**Reasoning on demand:** when `?` is tapped on a chip whose reasoning is null (for example one
revealed under `>>`), call `POST /api/workspaces/:id/results/:resultId/reasoning`; the server
generates one sentence from the stored score and the record's metadata, stores it and returns it.
If the result is `low_confidence`, the text shown starts "Based on title and subjects only".

## States

| State | Behaviour |
|---|---|
| Loading (first load, direction switch, load more) | skeleton cards with the same structure as a real card; container `aria-busy="true"`; live region "Loading results", then the new result count |
| No results | message that this direction returned nothing, hint to try another direction |
| Primo error | inline error with Retry; already-loaded lists and saved counts stay visible |
| Scoring error, Primo OK | show results in Primo's original order without chips, a message that they could not be ranked, and Retry |

## Acceptance criteria

- One Primo call and one scoring call per search; zero scoring calls when every pair is stored.
- Scores returned as 2.7 become 2; 9 becomes 5; -1 becomes 0 (server enforced).
- A user-typed query skips 5.2 and is stored with `source: 'user'`.
- Ranking uses the active direction's score only; ties keep Primo order; new directions never
  change order.
- A result with no abstract is flagged low confidence and its reason says so.
- Switching direction twice reuses the stored query and loaded list; no extra Primo call.
- Page 2 prefetch does not delay page 1; cards on screen never reorder on load more.
- Scoring failure degrades to Primo order with a Retry; Primo failure keeps saved counts visible.

## Out of scope

Embedding-based scoring; full-text fetching; categorical badges (deferred).

*Source: old spec 4 (use), 5.2, 5.3, 8.2 (search field, meta bar, dropdown, ranking, latency, states).*
