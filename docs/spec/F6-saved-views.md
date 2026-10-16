# F6 Saved results views (by workspace, direction, or session)

**Problem it solves:** a participant must be able to get back to what they saved, narrowed the way
they think about it (everything; one direction; one session; one direction in one session), without
re-searching and without extra reading.
**Challenges it answers:** reacquainting after a break; organizing found information.
**Load with:** 01-core.md, F3 (same card component and chip rules), 02-data-model.md.
**Status:** not started. Route: `/workspace/:id/saved?direction=<id>&session=<id>`.

## One view, two optional independent filters

`direction` and `session` are each optional. Omitting a filter widens the scope; omitting both shows
every result saved anywhere in the workspace. The view **looks the same as the SERP** (F3 cards) but
without the search field, the dropdown, and the right-hand panels. It makes **no Primo calls** in any
state and **no LLM calls except one**: tapping `?` on a chip whose stored reason is null calls the
on-demand reasoning endpoint (F2), which reads stored metadata only and stores the result. Scores and
reasons otherwise come from the stored values.

| Entry point | Filters set |
|---|---|
| SERP header **Saved Results** toggle (F3) | neither (whole workspace; same as Baseline's saved list) |
| Circle badge (SERP panel or Your sessions) | `direction` only |
| Black bar segment (Your sessions) | `direction` and `session` |
| Session tile (Your sessions) | `session` only (see "One session" below) |

## Cards and order

- Same card component and chip rules as the SERP, including the faded New pill.
- With `direction` set, that direction is the "active" one, so its chip is always shown. With no
  `direction`, a card shows every chip it was actually saved under (can be more than one).
- **Order:** with `direction` set, by that direction's score highest first, ties by save time. With no
  `direction`, by save time, most recent first.
- **Session tag per card** shown whenever results can span more than one session (`session` not set);
  dropped when `session` is set.
- **Chips work as on the SERP.** Clicking a saved chip undoes the save; an unsaved card stays visible
  with its chip back to unsaved until the participant leaves the view, so a mis-click can be reversed.
  Your sessions counts and bars refresh when they go back.

## One session, all directions (`?session=<id>`, `direction` omitted)

Everything saved in that session across every direction it touched. The count matches that session's
tile total ("6 saved"). A card carries chips only for directions it was saved under in that session
(filled/saved state); no chip is forced. **Order:** by save time within the session, earliest first;
each card shows a timestamp instead of the session tag. **Breadcrumb:** `Workspaces › {workspace name}
› Session {n}`; `Workspaces` links to the Workspaces list, the name links to Your sessions,
`Session {n}` is the current page, not a link.

## Wayfinding (added; not on the SERP)

A **Back** control (to the SERP when opened from its toggle, otherwise to Your sessions) and a short
scope heading (an `h1`): "All saved results" (no filter); "Saved under Green Space" (`direction`);
"Saved under Green Space · Session 2 — Aug 9, 2026 · 4 results" (both). Without the query and dropdown
the participant has no other cue where they are, which costs working memory. Back is the first
focusable element. Back control, heading and ordering are Telot-to-confirm proposals.

## Empty state

"Nothing saved here now" plus the Back control (when nothing matches, or everything shown was unsaved).

## Acceptance criteria

- Each of the four filter combinations returns exactly the matching `savedresults` rows.
- No Primo call is made by this view; the only LLM call is the on-demand reasoning on a `?` tap with a null stored reason.
- Undoing a save leaves the card visible, with the chip reset, until the participant leaves.
- Counts on Your sessions match this view after returning.
- Scope heading is an `h1` and is correct for each combination; Back is first in focus order.

*Source: old spec 8.4, 8.5, 7 (saved endpoint), 9 (saved view accessibility), decisions in 11.*
