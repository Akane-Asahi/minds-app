# Accessibility requirements (requirements, not polish)

They follow from the persona (Jamie Chen, 19, first-year, has dyslexia) and the study population.
Baseline already went through a WCAG 2.2 AA pass; reuse its tokens and patterns where they fit and
re-measure every new mockup.

## Global

- Typeface: Atkinson Hyperlegible or Lexend, generous line spacing. Baseline's theme already uses
  **Lexend Deca** (`frontend/src/theme/theme.js`); keep it.
- Status is never colour alone: colour plus icon plus text label. All chip emphasis tiers pass WCAG
  AA (4.5:1 text, 3:1 large text and meaningful non-text such as borders, icons, outlined circles).
- Never render a raw percentage as a headline coverage number; counts or categories only.
- Never lighten text to mean "quiet", "faded", "empty" or "disabled". Use the surface (lighter or
  dashed border, flatter fill, paler icon) **plus a text cue** ("New", "0 saved", "No Session
  Record"). Text stays at `--text-muted` or darker.
- Respect `prefers-reduced-motion` for any ring or transition animation.
- Save is a single control, operable by keyboard alone, no read or expand step first.
- State management: React Query (or equivalent) for server state; Context for local UI state.

## Required contrast fix (rule for the whole product)

1. One muted text token `--text-muted: #5c5647` for all secondary text. It measures 4.75:1 on the
   grey field `#d6d0c2`, 5.70:1 on page background `#e7e3da`, 6.47:1 on tile background `#f3f1ec`.
   No lighter colour for text that carries meaning.
2. Non-text parts that carry meaning (checkbox outlines, outlined zero-count circles, chip borders)
   reach 3:1 against their background.
3. Add a build test that computes the ratio for every text/background token pair and fails under
   4.5:1 (3:1 for large text and non-text).
4. Re-measure on the final designs.

Mockup failures measured in the original audit (fix in the designs): Screen 3 "No Session Record" and
"0 saved — N reviewed" (1.54), Screen 3 name line (1.85), Screen 3 duration and placeholder (3.38),
Screen 1 unselected "new" labels (2.08), SERP "What you might explore" labels (2.08), SERP description
text (2.97). Faded chips are the same grey family and are assumed to fail until re-measured.

## Per screen

- **Plan Workspace (F1):** directions list updates asynchronously, so announce in a `polite` live
  region ("Generating search directions", then "Search directions ready" or the error); **focus never
  moves on its own** when suggestions appear. Direction items are real checkboxes with labels. The
  sparkle has the accessible name "Suggested by AI" and is never the only cue (custom items are marked
  by label text or a tag). All text, including dimmed suggestion styling, meets AA.
- **SERP (F2, F3):** chips are native `<button>` with `aria-pressed` and an accessible name including
  direction and score as text, e.g. "Save under Mental / emotional well-being, score 4 out of 5" (never
  stars alone). `?` is its own button with `aria-expanded`. Saving announces in a polite live region
  ("Saved under Public parks. 3 results saved."). The New pill's name states it: "New direction, not in
  your plan: Children, score 5 out of 5. Adds it to your plan and saves this result". The search field
  is a labelled input; the icon is a real button; Enter submits; results replace the list **without
  moving focus**; the live region announces "Loading results" then the new count. Faded chips, grey
  chips, the "What you have explored" circles and "What you might explore" rows all meet AA.
- **Your sessions (F5):** each black segment is a native `<button>` named with session, date, count and
  direction ("Session 2, Aug 9, 2026: 4 saved under Green Space. Open these results"). `+N` is always
  visible; the grey track is `aria-hidden`. The card's main action is a link named "Search {direction}";
  segments are **not nested** inside it. Focus order: left column, then each card's link followed by its
  segments. **Session snapshot blocks carry text labels; nothing depends on colour alone.** Hover linking
  also works on keyboard focus, visibly without colour alone. Session list is
  newest first while bars run oldest first (intentional; badges and linking connect them). Grey text on
  grey fields and tile secondary text meet AA.
- **Saved results views (F6):** same as SERP cards; Back is the first focusable element; the scope
  heading is an `h1`.

## Deferred (do not build now)

Session Recap Capsule text in an ARIA live region (deferred with the recap feature).
