# STATUS.md

Read this first in every session. Update it at the end of every session (done / next / blocked).
Last updated: 2026-10-16 (build order changed to UI first).

## Where we are

Planning and context setup are done. The repo started as the Baseline code (React 18 + MUI v5 +
Express + Mongoose); no MINDS feature code exists yet. The spec is split into `docs/spec/`.

## Done

- Decisions A1 to A4 settled; repo created; Primo access works (Baseline uses it).
- Context system: `CLAUDE.md`, `docs/spec/` (per-feature files), `DECISIONS.md`, `stack_changed.md`,
  `docs/templates/feature-brief.md`.

## Next (in order; details in docs/spec/build-plan.md)

**Phase 1, UI with mock data:** U0 fixtures + dev routes + contrast check; U1 Plan Workspace;
U2 SERP; U3 Your sessions; U4 Saved results view.
**Phase 2, interaction:** I0 data contract + scaffold + LLM client; I1 F1 wiring; I2 F2 pipeline;
I3 F3 wiring; I4 F4; I5 F5; I6 F6; I7 navigation between screens; I8 F7 logging.

Also before or alongside:
- Subagents: spec-reviewer and a11y-checker in `.claude/agents/`.
- Invariant tests for the 7 rules (01-core.md), starting in I0.
- Scoring validation plan and a latency measurement (open-questions.md).

## Blocked or needs Telot

- LLM provider, key and budget (needed at I0/I1, not for the UI phase).
- Logging plan (F7): ethics coverage and Baseline's original event names.
- `SavedDoc` vs `savedresults` decision (needed at I0, not for the UI phase).

## Notes

- Never commit `.env`, keys, database URIs or participant data (public repo).
- Use a separate MongoDB database from Baseline's study database.
