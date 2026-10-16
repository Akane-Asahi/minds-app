# DECISIONS.md

Dated log of decisions. Newest first. The feature files in `docs/spec/` hold the current behaviour;
this file holds when and why it changed. Add a line here in the same session as any spec change.
Telot's latest statement is the decision.

## 2026-10-16 (build order)

- **UI first, interaction second.** All screens are built as UI with mock fixtures (sessions U0 to U4)
  before any LLM, database or navigation is wired (sessions I0 to I8). F1 to F7 stay the behaviour
  spec; `docs/spec/build-plan.md` says what each session builds. LLM provider, key and the `SavedDoc`
  decision are therefore needed at I0, not before the UI phase.
- **Spec changes** go to the planning document (thesis repo, v27) and to `docs/spec/` together.

## 2026-10-16 (context setup; Telot answered Q1 to Q8)

- **Scoring reasons (Q1 B):** the 5.3 call writes a reasoning sentence only for the chips a card
  shows (each result's top 3 selected directions plus its highest-scoring new direction); others are
  null and generated when `?` is tapped, then stored. (F2)
- **Missing abstract (Q2):** score from title and subjects, flag `lowConfidence`; the `?` text starts
  "Based on title and subjects only". (F2)
- **New-direction label matching (Q3 A):** normalized text plus the LLM told to reuse existing labels
  exactly; no embeddings; revisit if near-duplicates appear in testing. (F4)
- **`SESSION_GAP` is 1 hour** (Q4; was 1 day). Idle longer than 1 hour starts a new session on the next
  search. `IDLE_CAP` stays 5 minutes. (F5)
- **Workspaces list:** Edit Name, Select Color (cosmetic: adds a border) and Archive already exist in
  Baseline; **not specified in this spec** (Q5, Q6). The workspace name is AI-generated at creation and
  editable through Baseline's Edit dialog (replaces "not editable").
- **"Project" and "task" are now "workspace"** everywhere (UI text, data entity `Workspace`, routes).
  The old mockups and screenshot filenames still say "Project"; update the mockup text.
- **Plan Workspace header:** the institution logo as in Baseline (replaces the MINDS wordmark).
- **Non-colour cue for light-blue and saved chips:** left as is for now.
- **Stack (Q7):** MERN kept; see `stack_changed.md`. Spec's Postgres/Supabase, Next.js, Tailwind and
  TypeScript replaced by MongoDB, Express, React + MUI and JavaScript + Zod.
- **Interaction logging added as a feature (Q8):** F7, draft. Baseline's logging had been removed.
- **Stored counters dropped:** `saved_count`, `shown_count`, `opened_count` on directions are derived by
  aggregation, never stored (rule 2; matches Baseline's runtime-computed workspace counts).
- **Scores are integers 0 to 5** everywhere; the old decimal examples (4.5, 4.2) and `numeric(2,1)` are
  gone.
- **Consequences found in review (same day):** `resultscache` (result metadata) never expires, and the
  24 h TTL lives on a separate `primocache`; the on-demand reasoning endpoint is the only LLM call a
  Saved results view may make; the 5.3 call receives `known_scores` so it can pick which new pairs need
  reasoning; reasoning is written only for pairs scoring above 0; `goal_relevance` is an integer; LLM JSON
  is snake_case and mapped to camelCase; `SESSION_GAP` means idle **more than** 1 hour.
- **Primo access works** (Baseline already uses it with the key in server-side `.env`).
- **Spec split:** the 1,326-line `technical-specification-1.md` (frozen, in the papers repo) is replaced
  for building by `docs/spec/`.

## 2026-10-15

- Scores are whole numbers 0 to 5: model returns integers; server floors decimals and clamps.
- Confirmed: one New pill per result; ties go to the selected direction; zero scores appear under
  `>>`; light blue considers selected-direction chips only; `>>` is icon-only (accessible name "Show
  other directions").

## 2026-10-14

- **Scoring by the LLM in one batched call per search** (5.3), not embeddings. Retrieve with Primo, judge
  with the LLM. Anchored rubric, temperature 0, stored scores.
- `CANDIDATE_POOL_SIZE` 30 to **10** (matches Baseline page size; keeps load time short).
- **Chips:** top 3 selected directions by score, **no minimum score, nothing forced**. `MIN_CHIP_SCORE`
  and `STRONG_MATCH_SCORE` removed. Ties by `orderIndex`. Scores of 0 appear only under `>>`.
- **Chip colours:** solid blue = saved; light blue = top chip of a result with the highest chip score
  on the page; neutral otherwise.
- **New directions come from saved results** (5.6): after at least 3 saves, a topic in at least 3
  different saved results, not in the plan, with goal relevance strictly above 2, becomes a suggested
  new direction, scored on later results and shown as a faded fourth "New" pill. `EMERGING_MIN_SCORE`,
  `SUGGEST_WINDOW`, `EMERGING_START_SAVES` removed.
- **`>>` button** reveals the other selected directions on a card.

## Earlier decisions (carried from the old spec section 11)

- Sparkle = AI-generated; no sparkle = custom. Screen 1's faded suggestions are `new` directions,
  selectable.
- Clicking a saved chip undoes the save. The SERP search field is editable. Clicking a faded chip
  adds the direction to the plan and saves under it; each "might explore" row can be dismissed.
- `?` stays on chips (every score has a "why").
- Categorical badges, Plan Strip, Coverage Map, clarity control and recap text are deferred.
- Session badges read `S3, S2, S1`; pale mockup text fixed to meet AA contrast.
- A workspaces landing screen opens a workspace's Your sessions; breadcrumbs start with a clickable
  Workspaces segment. Session tiles are clickable (saved results for that session).
- The saved results view is one view with two optional filters (`direction`, `session`).
