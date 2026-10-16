# F5 Your sessions (Screen 3): resuming a workspace after a break

**Problem it solves:** returning after a break, a participant with low working memory has lost the
thread. This screen rebuilds context at a glance, with almost no reading: what happened in each
session, and how much was saved under each direction in each session. From it they resume the last
direction or choose another.
**Challenges it answers:** losing the thread; reacquainting after a break; deciding whether to
continue or change direction.
**Load with:** 01-core.md, 02-data-model.md (`sessions`, `savedresults`, `sessionresults`),
accessibility.md, F6 (where clicks lead).
**Status:** not started. Route: `/workspace/:id/overview`.

## What a session is

One stretch of work in a workspace. If the participant has been idle for more than **`SESSION_GAP`
= 1 hour**, the next search starts a **new session**. Activity within the gap continues the same session.
- The gap is measured from the previous session's `lastActivityAt`.
- A session is created when the participant first searches after the gap
  (`POST /api/workspaces/:id/sessions`), never when they merely view this screen. No empty sessions.
- The duration on a tile is **active time** (`activeSeconds`), rounded to whole minutes, or
  "<1 min". Idle stretches longer than `IDLE_CAP` (5 minutes) count as `IDLE_CAP`.

## When it is shown

Always shows one workspace, named at the top of the left column. The participant reaches it by
opening a workspace from the Workspaces list (Baseline, unchanged). Every other screen's breadcrumb
starts with a clickable `Workspaces` segment returning to that list. The header shows the
institution logo.

## Layout

Same header, two columns each with a heading and divider: left **Your previous sessions**, right
**What you have explored**.

### Left column

- **Workspace name line** at the top: `Workspace Name: {title}` (not interactive).
- One tile per session, **newest first** (S3 at top). Each tile: round badge `S{n}`, title
  `Session {n} — {date}` (e.g. "Session 3 — Aug 29, 2026"), duration ("15 min"), and the snapshot.
  The three tiles read `S3`, `S2`, `S1` (the mockup typo `S2, S2, S1` must be fixed in the design).
- **Clicking a tile** (outside its own pills) opens the Saved results view for that whole session
  across every direction (F6, breadcrumb `Workspaces › {name} › Session {n}`).
- A thin divider, then at the bottom **Start New Workspace** (plus icon): goes to Plan Workspace with
  empty fields. Nothing is created until Explore (F1). The existing workspace is left as it is.

**Session snapshot (no LLM call):** helps see what happened without reading a paragraph.
- A **journey strip**: small blocks in the order worked, one block per direction searched;
  consecutive visits to the same direction merge. Each block: short direction label plus a saved
  mark in the right column's style (`+3`, or "0 saved").
- Under the strip one totals line with icons, e.g. "24 reviewed · 5 saved".
- If the participant checked out with a reason, a small tag using exactly: *Done*, *Taking a break*,
  *Stuck*, *Need to ask someone*.
- Blocks carry text labels; nothing depends on colour alone.
- At most `MAX_SNAPSHOT_BLOCKS` (6) blocks, then "+N more". Long labels truncated; full label in the
  accessible name and a tooltip. Reuses the "+N" notation of the right column.
- Data from `queries` (order, directions), `sessionresults` (reviewed), `savedresults` (saved),
  filtered to that session, computed in `GET /api/workspaces/:id/overview`.
- **Snapshot design is a proposal** (the mockup has only a placeholder): Telot to confirm visually.

### Right column: What you have explored

One card per direction of the workspace in `orderIndex` order, including promoted directions and
never-searched ones. **White background = clickable.** Each card has a header row (circle with the
**total saved count**: filled dark if 1 or more, outlined if 0, number always shown; the label; a
sparkle if `source: "ai"`) and a content area in one of three states:

| State | Condition | Content area |
|---|---|---|
| Saved | 1 or more saved | the stacked session bar |
| Reviewed, none saved | 0 saved, 1 or more reviewed | grey field `0 saved — N reviewed` |
| No record | 0 saved, 0 reviewed | grey field `No Session Record` |

One string format only: `0 saved — N reviewed`. "Reviewed" = results shown while that direction was
active.

**The stacked session bar.**
- Each **black segment is one session**, left to right in time order (earliest session with saves
  leftmost). Label `+N` = results saved under this direction in that session; segments always add up
  to the circle number. Example: "Green Space" (total 7): `+1`, `+4`, `+2`.
- Only sessions with at least one save get a segment, so position does not identify the session. The
  session is given by the accessible name/tooltip ("Session 2, Aug 9, 2026: 4 saved under Green
  Space") and by **hover and focus linking**: hovering or focusing a segment highlights the matching
  session tile (highlight visible without colour alone, e.g. an outline).
- **Width proportional to N**, one shared unit for all bars: `unit = trackWidth / max(BAR_MIN_CAPACITY,
  largest saved total)`. If a bar would overflow, shrink the unit, but keep every segment at least
  `MIN_SEGMENT_PX` (32) wide so `+N` stays readable.
- The light grey track is only a ruler (`aria-hidden`): not labelled, not a target, not a percentage
  or "remaining". Segments separated by a thin light divider.

**Clicking (four targets):**
1. **White area of a card** (header, empty space, grey field): go to the SERP for that direction.
   Client calls `POST /api/workspaces/:id/sessions` (get or create current), routes to
   `/workspace/:id/serp?direction=<id>`, searches with `regenerateQuery: true`, so the dropdown shows
   that direction and a **new, better query is generated** (5.2 with `previousQueries` and
   `savedTitles`).
2. **Circle badge:** Saved results view for that direction, every session (F6).
3. **Black segment:** Saved results view for that direction and that session (F6). A segment click
   must not also trigger the card or the circle.
4. **Start New Workspace** (left column).

Build note: never nest a button inside a link. The card's main link is the header area (stretched-link
technique covers the white area); segments are separate buttons layered above it.

## Check-out

`POST /api/sessions/:id/checkout` records the reason (*Done*, *Taking a break*, *Stuck*, *Need to ask
someone*), shown as the tag on the tile. It does not call an LLM.

## States

| State | Behaviour |
|---|---|
| Loading | skeleton tiles left and cards right; `aria-busy="true"` |
| Error | inline message with Retry; Start New Workspace still works |

## Acceptance criteria

- A search more than 1 hour after the last activity creates a new session; within 1 hour it does not;
  viewing this screen never creates one.
- Duration uses `activeSeconds` with each idle stretch capped at 5 minutes; under a minute shows "<1 min".
- Segments sum to the circle; only sessions with saves get a segment; unsaving shrinks a segment.
- Bar widths share one unit; no segment is narrower than 32 px.
- Hover and keyboard focus on a segment highlight its session tile, visibly without colour alone.
- The three card states use the exact strings above; the track is never labelled.
- Clicking a card, circle, segment, or tile goes to exactly one destination (no double navigation).
- Tiles read `S3`, `S2`, `S1`, newest first; bars run oldest to newest (intentional).

## Out of scope

Clarity control, unopened leads, recommended next direction, recap text (5.4, 5.5), editing
directions (deferred.md).

*Source: old spec 6 (sessions), 7 (sessions/checkout/overview), 8.3, decision in 11. See DECISIONS.md
(2026-10-16) for the session gap.*
