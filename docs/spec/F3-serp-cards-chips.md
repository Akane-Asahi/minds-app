# F3 SERP result cards, direction chips, and the right-hand panels

**Problem it solves:** with low working memory, a participant cannot hold in mind which direction
a result serves or what they have already filed. Each card shows, in low-text form (star plus
number, chips), why it may help; one click files it under a direction; a side panel shows what has
been explored.
**Challenges it answers:** dense text is slow to read; hard to tell relevant results; organizing
found information; losing the thread.
**Load with:** 01-core.md, accessibility.md, F2 (scores and reasons come from there).
**Status:** not started.

## Result card (top to bottom)

1. Title.
2. Meta line: resource type, year, authors, e.g. `Article · 2022 | Authors: Name01, Name02`. From Primo.
3. `Description:` abstract from Primo, clamped to about two lines. None: "No description available".
   Never generated.
4. Label "Why this may help your search".
5. Up to `CHIP_COUNT` (3) direction chips, plus an optional 4th **New pill**, then the `>>` button.

## Which pills a card shows by default

1. **Up to 3 chips from selected directions.** Sort the selected directions by their score for this
   result, highest first, show the first three. **No minimum score and nothing forced:** the active
   direction's chip appears only if it is in the top three. Ties: `orderIndex`. A direction scored 0
   gets no chip in the default view, so fewer than three show only when fewer than three score
   above 0.
2. **Optionally a 4th New pill.** Suggested new directions (F4) are scored with the selected ones.
   Show the pill of the card's highest-scoring suggested new direction when its score is **within
   the top three scores of all directions** (selected plus new); on a tie the selected direction
   ranks ahead. Example: scores a 4, b 2, c 2, d 1, e 0 and new x 3 give "4★ a", "3★ x New",
   "2★ b", "2★ c". If x scored 2 it ties b and c, ranks behind them, and no New pill shows. A new
   direction scored 0 is never shown. **At most one New pill per result.**
3. **Order:** all shown pills by score, highest first; on a tie a selected direction before a new
   one, then `orderIndex`.

## `>>` "Show other directions"

A small icon-only button after the last pill (accessible name "Show other directions",
`aria-expanded`), collapsed by default. Pressing it shows the remaining **selected** directions as
normal chips, highest score first (ties `orderIndex`), each with score, `?` and save, **including
directions scored 0** (a result whose scores are all 0 shows no default pill, only this button). It
opens and closes per card, keeps saved states, and never changes ranking. Icon only for now; test
whether participants understand it in Phase 3 testing.

## Chip anatomy and behaviour

Each chip shows a star, the score number, and the direction label, followed by a separate `?` button.

- **Clicking a chip saves the result under that direction.** It is the only way to save; no opening
  or reading first. One result can be saved under several directions. **Clicking a saved chip
  again undoes the save.**
- A saved chip shows a check icon and the text "Saved", a visual change, and `aria-pressed="true"`.
- `?` is its own button (`aria-expanded`), never nested in the chip. It toggles the one-sentence
  reason in place and never saves. If the reason is null, fetch it (F2 "Reasoning on demand").
- Save and unsave update the UI immediately (optimistic), call the endpoints, and roll back with a
  visible message on failure. Saving announces in a polite live region, e.g. "Saved under Public
  parks. 3 results saved."
- **Clicking the faded New pill** first adds that direction to the plan (promote, F4), then saves
  the result under it; afterwards it behaves as any chip.

## Chip colours (three states)

| State | Rule |
|---|---|
| **Solid blue = saved** | the participant saved the result under this direction. Saved results are found again on Your sessions via the circle or a bar segment. |
| **Light blue = suggested** | the chip is the top chip of its result (the first of the three after sorting; the New pill is never light blue) **and** its score equals the highest chip score of any result on the page (the batch of 10 scored together). A tie for the page maximum makes every tied result's top chip light blue. Computed once when the batch is scored; never changes after. A saved chip shows solid blue, not light blue. Considers selected-direction chips only. The stars still show the real score, so a weak page highlights its best chip without calling it strong. |
| **Neutral** | every other unsaved chip |

The score never decides colour; only "saved" and "best on this page" do. The New pill is faded
("not in your plan, but this result talks about it"), carries a visible "New" tag, and must still
meet contrast. Light blue and solid blue must not rely on colour alone: they need a non-colour cue
and an accessible name such as "best match on this page". The exact cue is **not chosen; leave as
is for now** (see open-questions.md).

## Right column: "What you have explored"

One row per selected direction in `orderIndex` order: a circle with the saved count, the label, a
sparkle if `source: "ai"`. Count = distinct results in `savedresults` for that direction: a plain
count, never a percentage or ratio. Count 0 = outlined circle, 1 or more = filled circle; the number
is always shown (never colour alone). Updates immediately on save or unsave. The circle opens the
Saved results view for that direction (F6).

## Right column: "What you might explore" (below the first panel)

Rows for `suggested` new directions (F4), most-seen first, up to `SUGGESTION_LIMIT` (3). The circle
shows the saved count (0 until something is saved under it), the label, a faded sparkle. If there
are none, **hide the panel** (no empty header).
- Activating a row promotes it (`POST /api/emerging-directions/:id/promote`): it moves into "What you
  have explored", joins the Search Direction dropdown, and is included in future scoring. Results
  already on screen keep their scores and gain chips for it only where a score already exists.
- Each row has a dismiss control (`.../dismiss`).
- Faded style: same contrast and text-cue treatment as faded chips; the panel heading already says
  what they are.

## Header: Saved Results toggle

A pill button, always visible, opening the Saved results view (F6) with **no filter** (everything
saved anywhere in the workspace). While that view is open it reads **Return to Search**.

## Acceptance criteria

- Default pills follow the top-3 rule with no minimum score and nothing forced; ties by `orderIndex`.
- The New pill appears only when its score is within the top three of all directions, never beats a
  tied selected direction, at most one per card, never when its score is 0.
- `>>` lists every other selected direction including 0-scored, per card only, no ranking change.
- Light blue computed once per batch; saved chips are solid blue; colour is never the only cue.
- Save and undo are optimistic with rollback and a visible failure message.
- Counts in "What you have explored" equal distinct `savedresults` per direction and update at once.
- "What you might explore" is absent when there are no suggestions.
- Chips are native buttons with `aria-pressed`; `?` is a separate button.

## Out of scope

Categorical badges, Plan Strip, Coverage Map, clarity control (deferred.md).

*Source: old spec 8.2 (header toggle, card, chips, panels) and the chip/`>>` decisions in 11.*
