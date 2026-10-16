# STATUS.md

Read this first in every session. Update it at the end of every session (done / next / blocked).
Last updated: 2026-10-16.

## Where we are

Planning and context setup are done. The repo started as the Baseline code (React 18 + MUI v5 +
Express + Mongoose); no MINDS feature code exists yet. The spec is split into `docs/spec/`.

## Done

- Decisions A1 to A4 settled; repo created; Primo access works (Baseline uses it).
- Context system: `CLAUDE.md`, `docs/spec/` (per-feature files), `DECISIONS.md`, `stack_changed.md`,
  `docs/templates/feature-brief.md`.

## Next (in order)

1. **Data contract:** Mongoose schemas for the new collections and Zod schemas for the LLM calls
   (02-data-model.md, F2, F4). First resolve `SavedDoc` vs `savedresults` (open-questions.md 3).
2. **Mock Primo fixtures** (04-primo.md): pools of 10 with missing abstracts, duplicates, a failing call.
3. **Invariant tests** for the 7 rules (01-core.md).
4. **Adapt the scaffold:** add test runners, `zod`, `express-rate-limit`, React Query (stack_changed.md);
   confirm the app still runs against a separate MongoDB database.
5. **Accessibility baseline:** tokens and the contrast-check test (accessibility.md).
6. **Subagents:** spec-reviewer and accessibility-checker in `.claude/agents/`.
7. **Build, in vertical slices:** F1 (Plan Workspace + 5.1) first, then F2 + F3, then F4, F5, F6, F7.
8. Scoring validation plan and a latency measurement (open-questions.md).

## Blocked or needs Telot

- LLM provider, key and budget (needed before F1 can call a model).
- Logging plan (F7): ethics coverage and Baseline's original event names.
- `SavedDoc` vs `savedresults` decision.

## Notes

- Never commit `.env`, keys, database URIs or participant data (public repo).
- Use a separate MongoDB database from Baseline's study database.
