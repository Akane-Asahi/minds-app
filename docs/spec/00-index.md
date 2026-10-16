# Spec index: what to load for which job

Always load `01-core.md` first. Then load only what the job needs. Read the feature file's
"Problem it solves" before writing code, and if a decision changes, update the feature file and
add a dated line to `/DECISIONS.md` in the same session.

| Job | Load |
|---|---|
| Plan Workspace screen, direction generation (5.1) | F1-plan-workspace.md, 03-api.md, accessibility.md |
| Search, query generation (5.2), scoring (5.3), ranking | F2-serp-pipeline.md, 04-primo.md, 03-api.md |
| Result cards, chips, `>>`, right-hand panels | F3-serp-cards-chips.md, accessibility.md |
| New direction detection (5.6), promote / dismiss | F4-new-direction-detection.md, 02-data-model.md |
| Your sessions screen, session rules, check-out | F5-your-sessions.md, 02-data-model.md, accessibility.md |
| Saved results views | F6-saved-views.md, F3-serp-cards-chips.md |
| Interaction logging for the study | F7-logging.md (draft) |
| Schemas, indexes, derived counts | 02-data-model.md |
| Endpoints | 03-api.md |
| Anything accessibility or contrast | accessibility.md |
| What is not being built | deferred.md |
| What is undecided | open-questions.md |

The Workspaces list (cards, counts, Edit Name, Select Color, Archive) is Baseline code and is
**not specified here**; reuse it unchanged.

## Traceability to the original spec

The original single file is `technical-specification-1.md` (1,326 lines, 2026-09-30, in the thesis
papers repo, `Claude outputs/`). It is frozen; this folder replaces it for building.

| Old section | Now in |
|---|---|
| 1, 1.1, 2, 3, 10 | 01-core.md (architecture now MERN) |
| 4 | 04-primo.md |
| 5.1 | F1 |
| 5.2, 5.3 | F2 |
| 5.4, 5.5 | deferred.md |
| 5.6 | F4 |
| 6 | 02-data-model.md |
| 7 | 03-api.md |
| 8 (screen table, check-out labels, badges) | F5, deferred.md |
| 8.1 | F1 |
| 8.2 | F2 (controls, ranking, latency, states), F3 (cards, chips, panels) |
| 8.3 | F5 |
| 8.4, 8.5 | F6 |
| 8.6 | not specified (Baseline Workspaces list) |
| 9, 9.1 | accessibility.md |
| 11 | open-questions.md and /DECISIONS.md |
