# CLAUDE.md: MINDS app (code repo)

Kept short on purpose. Details live in `docs/spec/`; load only what the job needs.

## What this is

MINDS (Metacognitive Interface for Navigating Directions & Scaffolding) is an LLM-assisted academic
search interface for people with dyslexia and/or low working memory, built on the University of
Regina library search (Ex Libris Primo, "Quick Find"). It is the **experimental condition** of a
within-subjects lab study for Telot's MSc thesis (University of Regina, HCI, supervisor Dr. Orland
Hoeber). The control condition is the Baseline app; this repo **started from the Baseline code**.

**The problem:** people with dyslexia are unsure what to search for and favour familiar angles; on
return after a break they have lost the thread; the scarce resource is working memory, not time. MINDS
has an LLM propose search directions (about half unfamiliar), scores each result against each
direction (so a result shows why it may help), files saves under directions, and keeps a low-text
record across sessions. The LLM is a first draft of the searcher's thinking, never an authority.

Thesis writing, Orland's rules, references and the planning documents live in a **different repo**
(`Akane-Asahi/minds-doc`). Do not apply thesis-writing rules to code.

## Start of every session

1. Read `STATUS.md` (done, next, blocked).
2. Read `docs/spec/00-index.md`, then `docs/spec/01-core.md`, then only the files the job needs.
3. One session = one row of `docs/spec/build-plan.md` (UI first: U0 to U4, then interaction: I0 to I8).
   In a UI session use mock fixtures only: no network, LLM or database calls.
   Open the screen's mockups in `docs/design/` first (see its README; the spec wins over the picture).
   Plan first and check the plan against the feature file's acceptance criteria before writing code.
4. If the user's request conflicts with the spec, say so, then update the spec. Telot's latest
   statement is the decision.
5. At the end: update the feature file if behaviour changed, add a dated line to `DECISIONS.md`,
   update `STATUS.md`, commit per feature.

## Rules that must not be broken (full text in 01-core.md)

1. Saved and coverage counts are plain counts, never percentages.
2. Per-direction and per-session numbers are derived from `savedresults` / `sessionresults`; never stored twice.
3. Clarity (thumbs) is never LLM-inferred.
4. Every LLM output is structured JSON validated with Zod, editable or dismissible in one tap, with a one-line "why".
5. Batch, do not loop: one scoring call per pool of 10; skip pairs already scored.
6. New directions never affect ranking.
7. Primo metadata only (no full text, no generated descriptions); Primo and LLM keys server-side only.

## Vocabulary

- **workspace** (never "project" or "task"); **search direction** in the UI = `subGoal` in code and API;
  **new direction** in the UI = `emergingDirection` in code.
- Sparkle icon = AI-generated; no sparkle = custom (never the only cue).
- **session**: a stretch of work; idle more than 1 hour (`SESSION_GAP`) starts a new one.
- Name screens, not numbers: Plan Workspace, SERP, Your sessions, Saved results view, Workspaces list.
- Constants (`CANDIDATE_POOL_SIZE` 10, `CHIP_COUNT` 3, ...) are named constants in code; table in 01-core.md.

## Stack (MERN; differences from Baseline in `stack_changed.md`)

React 18 (Create React App via craco) + MUI v5 · Express 4 · MongoDB via Mongoose 8 · JWT
participant-id login · JavaScript (JSDoc + Zod at boundaries) · Jest + Supertest (to be added).

Run locally (two terminals; Baseline README has the details):
```
cd backend && npm install && npm start    # http://localhost:5001
cd frontend && npm install && npm start   # http://localhost:3002
```
`backend/.env` and `frontend/.env` come from the `.env.example` files. No test command exists yet.

## Reuse Baseline, do not rebuild

Primo proxy (`backend/routes/libraryRoutes.js`), JWT/participant login, `Workspace` model and the
Workspaces list screen (Edit Name, Select Color, Archive), MUI theme and design tokens
(`frontend/src/theme/`, check `designTokens.js` first), the accessibility pass. `README.md` is
Baseline's original README and is still accurate for layout and running it.

## Code conventions

- Follow the neighbouring code. Backend: `routes -> controllers -> models`, `express-async-handler`,
  identity only from `req.user.id`, never from the request body.
- **Do not extend** Baseline's window `CustomEvent` bus, its `#serp`/`#all` hash tabs, or
  `utils/localStorageUtils.js` in new MINDS screens (use React Query, React Router state, and
  `utils/userScopedStorage.js`).
- LLM calls go through one backend client module; provider and model come from environment variables.
- Every LLM call: structured output, Zod validation, server-side clamp (scores are integers 0 to 5).
- Accessibility is a requirement: see `docs/spec/accessibility.md` (contrast tokens, native buttons,
  live regions, never colour alone).

## Safety (this repo is public)

- Never commit `.env`, API keys, database URIs or participant data. Never print them.
- MINDS uses its **own MongoDB database**. Never point it at the Baseline study database.
- Participant free text (queries, workspace fields) is research data: never in application logs.

## Subagents

Use them for exploration (return a summary, not file dumps) and for independent review of a diff
against the feature file and the 7 rules. They do not see this conversation: give them file paths.

## Where things are

`STATUS.md` · `DECISIONS.md` · `stack_changed.md` · `docs/spec/` (index in `00-index.md`) ·
`docs/templates/feature-brief.md` · `backend/` · `frontend/`.
The frozen original spec is `technical-specification-1.md` in the thesis repo; do not edit it.
