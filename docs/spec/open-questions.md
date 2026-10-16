# Open questions and assumptions

Move an item to DECISIONS.md only when Telot confirms it. Telot's latest statement is the decision;
if a mockup or message conflicts with the spec, say so and update the spec.

## Needs a decision

1. **LLM provider and budget.** Not chosen (the original spec suggested Claude or GPT-4o-mini with a
   cheap, fast default). Isolate it behind one server module with provider and
   model in environment variables. The ethics application must name the provider (participant text
   goes to a third party).
2. **Logging and study data (F7).** Event list, ethics coverage, Baseline's original event names,
   retention, whether prompts/outputs are stored.
3. **`SavedDoc` vs `savedresults`.** Recommended: keep Baseline `SavedDoc` as the document record and
   add `savedresults` link rows for per-direction saves (02-data-model.md). Confirm before building F3.
4. **Non-colour cue for light-blue and solid-blue chips.** A second cue is required (accessibility); the
   exact one is **not chosen. Leave as is for now** (Telot, 2026-10-16).
5. **Check-out chip.** The old spec says it appears "on exit/idle", but when and where exactly was specified in an earlier document
   that is not in this repo (`thesis-scope-llm-metacognitive-serp.md`, Component 4). Define when building F5.
6. **Route names** for the new screens (`/workspace/:id/...`): align with Baseline's router.
7. **Hosting** for the study deployment. Baseline ships an nginx config; decide when deploying (stack_changed.md).

## Assumptions (defaults used; change if wrong)

- Scoring rubric anchors (5 main topic, 4 substantial, 3 partly, 2 in passing, 1 tangential, 0 unrelated)
  and temperature 0 are used as written; validate empirically (item below).
- A stored new direction stays after unsaves until dismissed or promoted.
- Detection may suggest at most 3 directions at a time; "page" means the batch of 10 scored together.
- Plan Workspace: AI suggestions start unselected; a selected `new` direction keeps its "New" tag;
  roughly half the suggestions are `new`; `DIRECTION_COUNT` about 8.
- First search runs automatically when the SERP loads; default direction = first selected in Screen 1 order.
- Session snapshot design (journey strip, totals line, check-out tag) is a proposal.
- Saved results view: the Back control, scope heading and score ordering are proposals.
- Primo: abstract availability, quota and maximum page size not yet confirmed.

## To measure or schedule

- **Latency** of scoring a page of 10 with a real Primo response and the chosen model (not yet measured).
- **Scoring validation:** compare LLM scores against an embedding baseline using two raters on about 60
  results (Phase 3 threshold validation; not scheduled). Expect Orland to challenge LLM-only scoring.
- **Re-measure contrast** on every new mockup.
- **Light-blue chips** and the **`>>` icon-only button**: test whether participants understand them.
- **Duplicate new-direction labels:** watch for near-duplicates in testing; add embedding matching only if they appear.
