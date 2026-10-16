# stack_changed.md: what differs from Baseline and from the original spec, and why

Decided 2026-10-16. Rule for this file: any time the stack changes, add a line here with the reason.

## Kept: MERN (Orland's standing expectation)

MongoDB + Mongoose 8, Express 4, React 18, Node. Also kept from Baseline: MUI v5 and its design
tokens (`frontend/src/theme/`), react-router-dom 6, JWT participant-id login, the Primo proxy
(`backend/routes/libraryRoutes.js`), the Workspace list screen, the existing accessibility pass.
**Why:** Orland asks for MERN; this repo already runs on it (Baseline code was pushed as the starting
point); the MINDS and Baseline interfaces then share look, header and plumbing, so the study compares
the intervention and not unrelated interface differences.

## Changed from the original spec's plan (the spec predates the Baseline code)

| Original spec | Now | Why |
|---|---|---|
| Postgres via Supabase | **MongoDB via Mongoose** | MERN; Baseline models already exist (`Workspace`, `Queries`, `SavedDoc`) and already compute counts at runtime from saved rows, which is the same "derive, never store twice" rule. The per-session and per-direction counts are grouping queries (Mongo aggregation). **Cost:** no foreign keys or CHECK constraints (enforce in code and tests), and the SQL schema had to be rewritten as collections (02-data-model.md). |
| Next.js API routes | **Express API** (existing `backend/`) | MERN; the orchestration layer (Primo + LLM) is plain server code and does not need a framework. |
| Next.js + Tailwind CSS | **React 18 + MUI v5** | Baseline UI is MUI with tuned tokens and an accessibility pass; reusing it avoids redoing that work and keeps the two conditions visually consistent. |
| TypeScript | **JavaScript** (+ JSDoc, `jsconfig.json`) with **Zod** at the boundaries | Baseline is JavaScript; converting it would add risk without helping the study. Zod gives the type-safety that matters here: LLM JSON is validated (and scores floored and clamped), and API inputs are validated. |
| Vercel hosting | **Not decided; server host** | Express is a long-running server. Baseline ships an nginx config and its `.env.example` mentions an AWS deployment IP, so keep that deployment model. Decide at deployment time. |
| Zustand for UI state | **React Context** | Baseline already uses Context; no extra library. |

## Added to Baseline

| Addition | Why |
|---|---|
| `zod` (backend) | validate LLM structured output, clamp scores, validate request bodies |
| One LLM client module (backend), provider and model in env | keeps API keys server-side, makes the provider swappable; provider not yet chosen (open-questions.md) |
| `express-rate-limit` | spec requires a per-user rate limit on direction generation (cost control) |
| `jest` + `supertest` (backend) | Baseline has no backend tests; the 7 rules in 01-core.md become automated tests |
| Frontend tests with the existing CRA Jest + Testing Library | already installed; used for chip rules, bar widths, session rules |
| `@tanstack/react-query` (frontend, new screens only) | the spec already calls for React Query for server state; replaces the window event bus for save/unsave/count updates |
| Contrast-check test | spec requirement (accessibility.md) |
| `interactionevents` collection and `POST /api/events` | Baseline's logging was removed in the handoff; the study needs it (F7, draft) |

## Changed in how new code is written (Baseline code left alone)

- **No new window `CustomEvent` signals** on MINDS screens; use React Query invalidation and Context.
- **Tabs and views from React Router state**, not the `#serp`/`#all` URL hash with the 100 ms synthetic
  `hashchange` workaround (Baseline README "known rough edges").
- **One storage module only** (`utils/userScopedStorage.js`); do not add code to
  `utils/localStorageUtils.js`.
- The MINDS app uses **its own MongoDB database**, never the Baseline study database (Baseline
  README warns its `.env` may point at the real one).

## Considered and not changed

| Idea | Decision | Why not now |
|---|---|---|
| Migrate Create React App (craco) to Vite | **Not now** | CRA is no longer maintained, but it works with React 18 and the code is in place; a migration risks regressions with no study benefit. Revisit before deployment if build or `npm audit` problems appear. |
| Convert to TypeScript | **No** | see above (Zod at the boundaries instead) |
| Upgrade MUI beyond v5 | **No** | the design tokens are built on v5; upgrading is a separate project |
| Keep Postgres and add a second database server | **No** | two databases and ORMs for one small app; MERN is what Orland expects |
