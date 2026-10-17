# Build plan: UI first, then interaction

Decided 2026-10-16 (Telot): finish all the screens as UI first, then add the interaction.
The F1 to F7 files stay the **behaviour spec**; this file says in what order and how much of each
file a session builds. One session = one row.

## Phase 1: UI with mock data (no backend, no LLM, no real Primo)

Goal: every screen looks and reads right, in every state, and passes the accessibility checks,
before any model or database is wired in.

**Phase 1 rules**
- Data comes from typed fixtures in `frontend/src/mocks/` (shapes match `02-data-model.md` and the
  F-file schemas). No `fetch`/axios calls, no LLM, no Primo, no MongoDB.
- No navigation between screens. Each screen has its own dev route, `/ui/<screen>`, plus a small
  state switcher (empty, loading, error, long text, many items) so every state can be seen.
- Local visual state is fine (hover, focus, expand `>>`, open a panel). Anything that changes data or
  leaves the screen is Phase 2.
- Build what a participant **sees**: Layout, States, chip anatomy and colours, and the accessibility
  items. Skip Call/endpoint sections and the rules about scoring, sessions and saving.
- Use `utils/userScopedStorage.js`, React Query and React Router state only as far as Phase 2 needs
  them; do not add them yet.

Every U-session also opens its mockups in `docs/design/` (see `docs/design/README.md`).

| Session | Build | Load | Done when |
|---|---|---|---|
| U0 | Fixtures + dev route shell + token and contrast check | 01-core, accessibility, 02-data-model, 04-primo | fixtures typed; `/ui` index lists screens; contrast test passes |
| U1 | Plan Workspace (layout, direction list, all states) | F1 (Layout, States), accessibility, design: `01-*` | F1 layout and states match; a11y checklist passes |
| U2 | SERP: card, chips, `>>`, chip colours, right panels, header toggle | F3, F2 (controls and states only), accessibility, design: `02-*` | F3 card, chip, colour sections match |
| U3 | Your sessions: tiles, journey strip, bars, check-out | F5 (Layout, States), accessibility, design: `03-*` | F5 layout and states match |
| U4 | Saved results view + wayfinding + empty state | F6, F3 (card only), design: `04-*`, `05-*`, `06-*` | F6 layout and empty state match |

## Phase 2: interaction (real data, LLM, navigation)

Order matters: each row needs the one above. Each session starts with an `/ui` screen that already
exists and replaces its fixtures with real calls.

| Session | Build | Load |
|---|---|---|
| I0 | Data contract (Mongoose + Zod), resolve `SavedDoc` vs `savedresults`, scaffold (tests, zod, rate limit, React Query), LLM client module, provider and key | 02-data-model, 03-api, open-questions |
| I1 | F1 wiring: call 5.1, blur trigger, create workspace, Explore | F1, 03-api |
| I2 | F2 pipeline: Primo proxy and cache, call 5.2, batch scoring 5.3, ranking | F2, 04-primo, 03-api |
| I3 | F3 wiring: save and unsave, chips from real scores, `?` reasoning endpoint | F3, 03-api |
| I4 | F4: new-direction detection 5.6, promote, dismiss | F4, 02-data-model |
| I5 | F5 wiring: sessions, active time, check-out | F5, 02-data-model |
| I6 | F6 wiring: saved views with filters | F6 |
| I7 | Navigation between screens (Workspaces list, Plan Workspace, SERP, Your sessions, Saved results) | 00-index, all screens' routes |
| I8 | F7 logging | F7 (draft) |

## After each session

Tick the acceptance criteria that were met, update `STATUS.md`, add a line to `DECISIONS.md`, commit.
A feature's **Status** line says `UI done` after its U-session and `done` after its I-session.
