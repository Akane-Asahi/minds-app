# F1 Plan Workspace (Screen 1) and direction generation (call 5.1)

**Problem it solves:** people with dyslexia are unsure what to search for and favour familiar
angles. Before searching, the participant states the task and chooses from LLM-proposed
directions, about half of them angles they had not thought of. Choosing is an active
decision: that is the planning step of metacognition.
**Challenges it answers:** unsure what to search; favouring familiar sources; spelling and
query formulation (via F2).
**Load with:** 01-core.md, 03-api.md (generate + create workspace), accessibility.md.
**Depends on:** LLM key only. Can be built end to end first, with no Primo needed.
**Status:** not started. Route: `/workspace/new` (align with Baseline router).

## Layout (top to bottom)

Header (the institution logo, as in Baseline; the "MINDS" wordmark is dropped), page title
"Plan Your New Workspace" (the mockup still says "Project"; update the mockup text), helper
line ("Auto-generate Search Direction after filling Search goal, what you already know and
what you want to find out."), a four-row form, then a full-width **Explore** button.

| Row | Control | Notes |
|---|---|---|
| Search goal | text input | e.g. "Explore academic literature on how green spaces affect human well-being" |
| What I already know | multi-line text area | feeds the "do not restate what they know" rule in 5.1 |
| What I want to find | text input | e.g. "How do green spaces affect different aspects of human well-being?" |
| Search directions | two-column checkbox list + **Add Search directions** | AI items carry a sparkle icon (accessible name "Suggested by AI"); custom items have none and are also marked by label text or a tag. **Column 1:** `familiar` AI suggestions, then custom directions as added. **Column 2:** `new` AI suggestions, faded decoration plus a visible "New" tag. All selectable and deselectable. Columns stack on narrow screens (column 1 then column 2). |

## Generation trigger (blur)

1. Listen for `blur` on each of the three fields; any order.
2. On every blur, if any of the three is empty after trimming: do nothing (no request, no error).
3. If all filled, hash the three normalized texts (trimmed, whitespace collapsed). If equal to the
   hash of the last successful or in-flight generation, do nothing.
4. Otherwise call `POST /api/search-directions/generate`. Abort any in-flight request
   (`AbortController`) and ignore stale responses (request counter).

**Regeneration when inputs change:** generate again, but keep every selected and every custom
direction; replace only AI suggestions that are still unselected. Send kept labels as
`keepLabels` so the model does not duplicate them.

## Picking and creating directions

- AI suggestions start **unselected**. Each can show its `rationale` via tap-to-expand.
- **Add Search directions** opens an inline field: Enter confirms, Escape cancels. A custom
  direction is `source: "custom"`, no sparkle, starts **selected**, can be edited or removed in
  one tap, and can be added any time (including before generation or if it fails).
- New directions (column 2) look different from familiar ones but are fully selectable. Fading
  applies to **the unselected state and only to decoration** (border, checkbox, sparkle); **label text
  stays at full contrast**.
  When selected they take normal styling and keep the "New" tag. After Explore, a selected `new`
  direction is an ordinary direction (`source: "ai"`, `suggestionKind: "new"`).

## States

| State | Behaviour |
|---|---|
| Idle (fewer than 3 fields filled) | empty-state hint in the directions area; Add button still works |
| Loading | skeleton placeholders; fields stay editable; announce "Generating search directions" |
| Ready | suggestions shown; announce "Search directions ready" |
| Error / timeout | non-blocking inline message with Retry; participant can continue with custom directions only |

## Explore button

- Enabled only when all three fields are non-empty **and** at least one direction is selected.
  Otherwise disabled with a visible reason.
- On press: `POST /api/workspaces`; disable the button while running (no double submit); on
  success route to the SERP. If a field was still focused, its blur runs first; the click
  proceeds with the current selection and any late generation result is discarded after routing.
- `orderIndex` follows Screen 1 list order: column 1 top to bottom (familiar, then custom), then
  column 2 (new). The first **selected** direction in that order is the SERP default.
- **Workspace name:** there is no name field. It comes from `projectName` of the latest 5.1
  response, else the first 60 characters of the Search goal. Must be unique per user (see
  02-data-model.md). The participant can rename it later with Baseline's existing Edit dialog.
- Nothing is saved before Explore.

## Call 5.1: search direction generation

Stateless: reads the three fields, returns suggestions, writes nothing (the workspace is created
only on Explore). May run many times per draft.

**Input:** `goalText`, `knownText`, `wantText` (all required, non-empty); on regeneration also the
labels already selected or created.

**Prompt requirements:**
- About `DIRECTION_COUNT` (8) directions, two kinds: `familiar` (follow from the goal, what they
  want to find, what they know; e.g. "Mental / emotional well-being", "Social engagement") and
  `new` (not mentioned and not covered by `knownText` but helpful; e.g. "Mechanisms &
  Environmental Pathways", "Accessibility, Equity & Environmental Justice"). Aim for roughly half
  `new`. Never fill `new` slots with restatements of what the participant knows.
- Also return `project_name` (3 to 8 words, plain language, no trailing period).
- Each direction is a distinct angle. Labels are short plain-language noun phrases (2 to 5 words).

**Output schema (validate with Zod):**
```json
{
  "project_name": "string, 3-8 words",
  "sub_goals": [
    { "label": "string, 2-5 words", "kind": "familiar | new",
      "rationale": "one sentence: why searching this direction helps the goal" }
  ]
}
```
Server rate limits this endpoint per user. Target a few seconds; never block typing.

## Acceptance criteria

- Blur with fewer than 3 fields filled sends no request; unchanged hash sends no request.
- A stale or aborted response never overwrites a newer one.
- Regeneration keeps selected and custom directions and replaces only unselected AI ones.
- AI suggestions start unselected; custom start selected; Explore is disabled until all three
  fields are filled and one direction is selected, and shows why when disabled.
- Double-clicking Explore creates one workspace. Nothing is persisted before Explore.
- Only selected directions are persisted, with `orderIndex` in list order.
- Generated name collisions per user do not make Explore fail.
- Live-region messages are announced and focus never moves when suggestions appear.
- Generation failure still allows custom directions and Explore.

## Out of scope

Editing directions after Explore; a name field; the 👍/😐/👎 clarity control.

*Source: old spec 1, 1.1, 5.1, 7 (generate, create), 8.1.*
