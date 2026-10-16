# F7 Interaction logging and study data (NEW, DRAFT: Telot to confirm)

**This feature is not in the original spec.** It was added on 2026-10-16 because the study measures
search behaviour, and Baseline's handoff copy had its logging removed ("If you're setting this up as
a new study build... you'll need to reintroduce logging from the original deployed branch"). The
event list below is a proposal to review against the ethics protocol and the original Baseline
study build before any code is written.

**Problem it solves:** without a log, the study cannot compare search behaviour, saves, direction
switching and use of the AI outputs between MINDS and Baseline.
**Load with:** 01-core.md, 02-data-model.md (`interactionevents`), 03-api.md (`POST /api/events`).
**Status:** not started; blocked on the open items at the end.

## Requirements (proposed)

- **Identity:** only the existing study participant id (`userId`), plus `workspaceId` and `sessionId`.
  No names or emails. The public repo never contains data or database URIs.
- **Event record:** `eventType`, `clientEventId` (idempotency), `clientTimestamp`, server-assigned
  `serverTimestamp` (authoritative), `userId`, `workspaceId`, `sessionId`, `screen`, `payload` (JSON).
- **Client events (initial list):**
  - Plan Workspace: field blur (field name only), directions generated (count, latency), direction
    selected / deselected / custom added, Explore pressed.
  - SERP: search submitted (`source` ai or user, direction, query id), direction switched, results
    displayed (pool size, ranks), result opened, chip saved / unsaved (direction, shown score, rank),
    `?` opened, `>>` opened, New pill clicked, suggestion promoted / dismissed, load more, Saved
    Results toggle.
  - Your sessions: tile / card / circle / segment clicked, check-out reason set, Start New Workspace.
  - Saved results view: opened (filters set), chip undo.
  - Page view and visibility (for time on screen), errors shown to the participant.
- **Server events (written by the server, not the browser):** every LLM call (type 5.1, 5.2, 5.3, 5.6,
  reasoning; model; latency; status; token counts) and every Primo call (latency, status, cache hit).
- **Free text:** queries and Plan Workspace field text are research data, stored in the study
  database under the ethics protocol, never in application logs (Baseline `utils/logger.js` must not
  print them).
- **Delivery:** the client batches events every few seconds and on page hide (`sendBeacon`), retries,
  never blocks the UI, and a logging failure never breaks the app.
- **Storage:** an append-only collection `interactionevents`; no update or delete endpoint; indexed
  on `{userId, serverTimestamp}`.
- **Export:** a script that exports one participant's events (CSV and JSON).
- **Not logged:** keystrokes, screen recording, mouse movement, unless the ethics protocol adds them.

## Open items (Telot to resolve)

1. What the ethics (REB) application says will be collected; log only what it covers.
2. Baseline's original event names. [VERIFY: obtain the event list from the original deployed study
   branch, since it was removed from this repo.] Shared interactions (search, save, click, page view)
   should use the same names so the two conditions can be compared.
3. Retention and who can export.
4. Whether LLM prompts and raw outputs are stored for analysis (useful for the scoring validation;
   larger privacy footprint).

## Acceptance criteria (once confirmed)

- Every listed event arrives once (idempotent on `clientEventId`) with a server timestamp.
- Turning the network off does not break any screen; queued events are sent when it returns.
- No event contains a name or email; no log line prints participant free text.
- The export reproduces a participant's session in order.
