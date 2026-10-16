# F4 New direction detection (call 5.6)

**Problem it solves:** the participant's own saved results reveal a topic they did not plan but
keep finding. Surfacing it lets them widen the plan without having to notice the pattern
themselves (working-memory load), while keeping them in control of whether to adopt it.
**Challenges it answers:** new facets missed; hard to refocus after a tangent.
**Load with:** 01-core.md, 02-data-model.md (`emergingdirections`), F3 (where it appears).
**Status:** not started.

## When it runs

In the background after a save (`POST /api/results/:id/save`), never in the search path, so it adds
no time to loading the SERP. Runs only when the workspace has at least `SUGGEST_MIN_COUNT` (3)
saved results. One run at a time per workspace; if more saves arrive meanwhile, run once more
afterward.

## Input

The Search goal, What I already know, What I want to find; the selected direction labels; every
existing new-direction label (including dismissed ones); and for each saved result: id, title,
keywords, abstract (Primo metadata only, no full text).

## What the model does

Finds topics that recur in **at least three different saved results** and are not covered by any
selected direction or existing new direction. For each it returns: a label (1 to 3 words, plain noun
phrase), the ids of the saved results it appears in, `goal_relevance` 0 to 5 (relevance to the
Search goal and What I want to find), and one sentence of reasoning.

**Label reuse (decided 2026-10-16):** the model is told to reuse an existing label **exactly**
where one fits. The server matches labels by **normalized text** (lowercase, trimmed, whitespace
collapsed). No embeddings. If testing shows near-duplicates (e.g. "green gentrification" vs
"gentrification near parks"), revisit then.

**Output schema (validate with Zod):**
```json
{ "new_directions": [ { "label": "string, 1-3 words",
                        "saved_result_ids": ["string"],
                        "goal_relevance": "integer, 0 to 5 (server floors and clamps)",
                        "reasoning": "one short sentence, about 20 words max" } ] }
```

## After the call (server code)

Keep a topic only if at least `SUGGEST_MIN_COUNT` (3) **distinct, valid** saved result ids support
it **and** `goal_relevance` is **strictly greater than** `EMERGING_GOAL_MIN` (2). Create an
`emergingdirections` row with status `suggested` (at most `SUGGESTION_LIMIT` (3) active at once)
and `timesSeen` = number of distinct saved results that mention it. Dismissed labels are never
created again. A stored topic stays until dismissed or promoted, even if results are later unsaved
(assumed; Telot to confirm). From the next search on, call 5.3 scores every suggested new direction
together with the selected ones, and F3 decides whether a card shows the New pill.

## Promote and dismiss

- **Promote** (row in "What you might explore", or clicking a New pill): create a `subgoal`
  (`source: 'ai'`, `suggestionKind: null`, next `orderIndex`), mark the emerging direction
  `promoted`, re-point its `resultscores` to the new `subGoalId`. It then appears in "What you have
  explored" and the dropdown and is scored as a normal direction.
- **Dismiss:** mark `dismissed`; never suggested again.
- Every suggestion is optional and dismissible in one tap, with its reasoning available (rule 4).

## Acceptance criteria

- No detection run with fewer than 3 saved results; never in the search request path.
- Concurrent saves cause at most one run at a time, plus one follow-up run.
- A topic supported by only 2 distinct saved results is discarded; relevance exactly 2 is discarded.
- At most 3 suggested directions active; dismissed labels never recreated; labels deduplicated by
  normalized text.
- Promote creates a `subgoal` and keeps earlier scores for that direction.
- New directions never influence ranking (rule 6).

## Out of scope

Embedding-based label matching; per-result emerging directions in the scoring call (removed).

*Source: old spec 5.6, 6 (emerging_directions), 8.2 (What you might explore), decisions in 11.*
