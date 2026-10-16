# 02 Data model (MongoDB / Mongoose)

Translated from the original Postgres design (see /stack_changed.md). Collection and field
names below are the logical model; match Baseline's camelCase Mongoose style when writing
schemas. Every screen is a different view over one `Workspace`; do not let directions,
coverage and saved items drift into separate structures.

Mongo has no foreign keys or multi-field CHECK constraints: enforce relations in code (ObjectId
refs + indexes), enforce "exactly one of" with a schema validator, and cover both with tests.
Use a Mongo transaction (Atlas replica set) for the two multi-document operations:
create workspace + directions + first session, and promote a new direction + save.

## Collections

| Collection | Fields (logical) | Notes |
|---|---|---|
| `users` | Baseline `User` (participant id login) | unchanged |
| `workspaces` | `userId`, `title`, `color`, `goalText`, `knownText`, `wantText`, timestamps | **Baseline `Workspace` extended** with the three texts. `title` = AI `project_name` (fallback: first 60 chars of goal). Baseline has a unique index on `{userId, title}`: the generated title must be made unique per user (for example append " (2)") or Explore fails. Editing the title, color and archive already exist in Baseline. Counts are computed at runtime, not stored (Baseline rule, keep it). |
| `subgoals` | `workspaceId`, `label`, `source` (`ai`\|`custom`), `suggestionKind` (`familiar`\|`new`\|null), `rationale` (null for custom), `orderIndex`, `clarity` (reserved, deferred) | Only directions selected on Plan Workspace are persisted; unselected AI suggestions are discarded. `suggestionKind` is null for custom and for promoted new directions; kept so the study can analyse how often participants pick `new` directions. **No stored counters** (saved/shown/opened are derived). |
| `emergingdirections` | `workspaceId`, `label`, `status` (`suggested`\|`promoted`\|`dismissed`), `timesSeen`, `goalRelevance` (integer 0 to 5, set once), `firstSeenAt`, `lastSeenAt` | Unique on `{workspaceId, normalized label}`. Created only by call 5.6. `candidate` status no longer used. |
| `sessions` | `workspaceId`, `startedAt`, `endedAt`, `lastActivityAt`, `activeSeconds`, `checkoutReason` (`done`\|`break`\|`stuck`\|`need_help`\|null) | Created lazily when the participant first searches after a gap (> `SESSION_GAP`), never by merely viewing Your sessions. Each API call belonging to a session does `activeSeconds += min(now - lastActivityAt, IDLE_CAP)`; then `lastActivityAt = now`. Session number ("Session 3") = rank of `startedAt` within the workspace, computed on read. |
| `queries` | **Baseline `Queries` extended**: `workspaceId`, `userId`, `query`, plus `sessionId`, `subGoalId`, `source` (`ai`\|`user`), `totalHits` | One row per query run. Newest row for a direction is shown when the participant switches back. `totalHits` is the Primo total shown as "Results: N". |
| `resultscache` | `primoRecordId` (unique), `title`, `authors`, `venue`, `keywords`, `abstract`, `resourceType`, `identifiers`, `raw`, `cachedAt` | Shared across users. Result metadata that scores, saves and sessions point to. **No expiry:** deleting it would break saved cards and the Saved results views (which make no Primo calls). |
| `primocache` | `queryKey` (normalized query string + paging, unique), `response` (raw Primo JSON), `totalHits`, `cachedAt` | Query-keyed response cache that protects the Primo quota. **TTL index on `cachedAt` (about 24 h).** Safe to expire. |
| `resultscores` | `workspaceId`, `resultId`, `subGoalId` **or** `emergingDirectionId` (exactly one), `score` (integer 0 to 5), `reasoning` (nullable), `lowConfidence` (bool), `scoredAt` | Output of call 5.3. Unique partial indexes on `{workspaceId, resultId, subGoalId}` and on `{workspaceId, resultId, emergingDirectionId}`. When a new direction is promoted, its rows are re-pointed to the new `subGoalId` so scores are kept. |
| `sessionresults` | `sessionId`, `queryId`, `resultId`, `subGoalId` (the active direction), `rank`, `opened`, `shownAt`, `openedAt` | Per-session log of what was shown. Source of "reviewed". |
| `savedresults` | `workspaceId`, `sessionId`, `resultId`, `subGoalId`, `savedAt` | One row per (result, direction). Unique on `{workspaceId, resultId, subGoalId}`. Unsave deletes the row (so a bar segment shrinks). **Source of truth for every saved count.** |
| `interactionevents` | see F7-logging.md | append-only study log |

## Derived values (always computed by aggregation, never stored)

- Saved count per direction = rows in `savedresults` grouped by `subGoalId`.
- Per-session bar segments = grouped by `{sessionId, subGoalId}`; only sessions with at least
  one save under that direction get a segment. Segments sum to the circle number.
- Reviewed per direction = distinct `resultId` in `sessionresults` with that `subGoalId`.

## To reconcile when writing the data contract (first item under "Next" in STATUS.md)

Baseline `SavedDoc` stores **one row per result per workspace** (unique on `externalId`,
soft delete via `isRemoved`, keeps full `docdata`). MINDS needs the same result saved under
**several directions**. Recommended: keep `SavedDoc` as the document record (metadata, dedupe,
reuse of Baseline saved-results code) and make `savedresults` the per-direction link rows that
drive all counts. Confirm this with Telot before building the save feature.
