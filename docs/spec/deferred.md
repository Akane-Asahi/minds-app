# Deferred features (do not implement; do not design the data model to prevent them)

Kept open for a possible future version. Nothing here is in the current build.

- **Session recap text (call 5.4).** When a session ends, an LLM writes a 2 to 3 sentence recap shown
  at the start of the next one. Input: the workspace's shared state at session end plus the check-out
  reason. Output `{ "recap_text": "..." }`. Replaced by the visual snapshot on Your sessions. Would use a
  `sessionrecaps` collection (`sessionId`, `recapText`, `generatedAt`).
- **Cross-session history recap (call 5.5).** For 2 or more sessions: `{ "overall_recap": "...",
  "per_session_recaps": [ { "session_id": "...", "recap": "..." } ] }` from past recaps and per-direction
  saved-count deltas. Replaced by the stacked bars on Your sessions.
- **Clarity control** (👍/😐/👎 per direction, set only by the participant, never inferred). If it
  returns: it is set in exactly two places (the Your sessions direction card and the matching Plan
  Strip chip), which always show the same value; before the participant sets it, render it as
  **unrated**, never a fabricated default. Field `clarity` is reserved on `subgoals`. Endpoint
  `PATCH /api/subgoals/:id/clarity` (the only writer).
- **Unopened leads count** and **recommended next direction**.
- **Categorical evaluation badges**: *New*, *Seen before*, *Similar to something you saved*, *Fills a gap
  in [search direction]*, *Possible duplicate*. The per-direction score chips took over their job.
- **Plan Strip** and **Coverage Map** components.
- **Session Recap Capsule** (earlier Component 5) and its ARIA live-region announcement.
- **Editing directions after Plan Workspace** (other than promoting new directions).
- Unused endpoints: `GET /api/workspaces/:id/history`, `GET /api/sessions/:id/detail`.
- Earlier components replaced by Your sessions and the Saved results view: Component 0 (Session
  Overview cards with coverage ring), Component 6 (Session History), Component 7 (Session Detail).
