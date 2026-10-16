# 03 API endpoints

All routes require the participant JWT (Baseline `authMiddleware`; identity always from
`req.user.id`, never from the body). Existing Baseline routes (`/api/users/participant-login`,
workspaces CRUD, `libraryRoutes` Primo proxy, `saveddocs`) stay as they are. The rows below
are the MINDS additions. Paths use `workspace`; align exact route names with Baseline's router
when building.

| Endpoint | Purpose | Detail in |
|---|---|---|
| `POST /api/search-directions/generate` | **Stateless.** Body: `goalText`, `knownText`, `wantText`, optional `keepLabels`. Calls 5.1, returns `projectName` and the suggested directions (each `familiar` or `new`). Writes nothing. Per-user rate limit. | F1 |
| `POST /api/workspaces` | Explore pressed. Body: the three texts, optional `name` (the `projectName` from the latest 5.1 response), selected directions `{label, source, kind?, rationale?}`. Creates workspace, `subgoals` and first session in one transaction. Returns `workspaceId`, `sessionId`. Rejects an empty selection. | F1 |
| `PATCH /api/workspaces/:id/subgoals` | Add, edit or remove directions after creation. No current screen uses it except promotion. | F5 |
| `POST /api/workspaces/:id/sessions` | **Get or create the current session.** If the newest session's `lastActivityAt` is **not more than** `SESSION_GAP` (1 hour) ago, return it; otherwise create a new one. (The first session is created by `POST /api/workspaces`.) | F5 |
| `POST /api/sessions/:id/search` | Body: `subGoalId` (default first selected), optional `regenerateQuery: true` (entering from Your sessions: always run 5.2 with history inputs), optional `queryText` (user-typed: skip 5.2, send as typed, store `source: 'user'`), optional `cursor`. Otherwise get or generate the direction's query (5.2), call Primo, dedupe, score the pool (5.3, one batched call, skipping stored pairs), rank by the active direction. Returns `queryText`, `totalHits`, ranked results with chips (score, reasoning where already known, New pill) and each result's saved directions, per-direction saved counts, current "What you might explore" suggestions, next `cursor`. | F2, F3 |
| `POST /api/workspaces/:id/results/:resultId/reasoning` | Body: `subGoalId` or `emergingDirectionId`. Returns the one-sentence reason for that score; generates it if `reasoning` is null, then stores it. Used when `?` is tapped on a chip that has none. | F2 |
| `POST /api/results/:id/save` | Body: `subGoalId`, or `emergingDirectionId` for a faded chip (server promotes first, same transaction, then saves; response includes the new `subGoal`). Idempotent. Returns updated per-direction counts. Triggers background call 5.6. | F3, F4 |
| `DELETE /api/results/:id/save?subGoalId=` | Undo a save. Returns updated counts. | F3 |
| `POST /api/results/:id/open` | Marks opened (logging/coverage only; no detail page in scope). | F3 |
| `POST /api/emerging-directions/:id/promote` | Adds a suggested new direction to the plan: creates a `subgoal` (`source: 'ai'`, next `orderIndex`), marks it `promoted`, re-points its `resultscores`. Returns the new `subGoal`. | F4 |
| `POST /api/emerging-directions/:id/dismiss` | Marks `dismissed`; never suggested again. | F4 |
| `POST /api/sessions/:id/checkout` | Records the check-out reason (tag on the Your sessions tile). | F5 |
| `GET /api/workspaces/:id/overview` | Your sessions data: `workspaceName`, `sessions` (newest first: number, `startedAt`, `activeSeconds`, `checkoutReason`, snapshot blocks), `directions` (by `orderIndex`: id, label, `source`, saved total, reviewed total, `segments` = `{sessionId, sessionNumber, savedCount}` per session with at least one save, oldest first). | F5 |
| `GET /api/workspaces/:id/saved?subGoalId=&sessionId=` | Saved results view data; both filters optional and independent. Same card shape as the SERP. **No Primo calls; no LLM calls** (the only exception is the on-demand reasoning endpoint when `?` is tapped on a null reason). | F6 |
| `POST /api/events` | Batched interaction events from the client (study log). | F7 |

Not used by the current design (kept in deferred.md): `GET /api/workspaces/:id/history`,
`GET /api/sessions/:id/detail`, `PATCH /api/subgoals/:id/clarity`.
