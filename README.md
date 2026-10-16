<!-- Title -->
# Baseline

## What this is

A React/Node web app used as the **control condition** in a within-subjects lab study comparing two search interfaces. Participants (undergraduate students with dyslexia) search an academic library catalog, organize results into workspaces, and save documents. A second interface ("SearchPath") is the experimental condition being compared against Baseline; it lives on a separate branch/repo and has no bearing on this codebase.

This copy is a standalone handoff — it has had its interaction-logging system fully removed (see "What's deliberately different from the study build" below) and has been through an accessibility and code-quality pass. It is not the deployed study build.

## Stack

- **Frontend:** React 18, Create React App via `craco`, MUI v5 (Material UI). No Redux — state lives in React Context, `localStorage`, and a small window-event bus (see below).
- **Backend:** Node/Express, MongoDB via Mongoose.
- **Auth:** JWT, participant-ID login (no passwords — this is a study app, not a public product).

## Running it locally

```bash
# from repo root, two terminals:
cd backend && npm install && npm start   # http://localhost:5001
cd frontend && npm install && npm start  # http://localhost:3002 (PORT in frontend/.env)
```

Both `backend/.env` and `frontend/.env` need to exist (copy from the adjacent `.env.example` and fill in `MONGO_URI`, `JWT_SECRET`, `PRIMO_API_KEY`). **`backend/.env` as checked in may point at the real study database — check `MONGO_URI` before running anything locally.**

Root `package.json` has a few convenience scripts (`npm run server`, `npm run client`, one-off `backend/scripts/*.js` migration/audit scripts) but nothing there is required for day-to-day dev — just run frontend and backend directly as above.

## Directory structure

Both `frontend/src/features/*` folders now follow the same flat shape:

```
frontend/src/
  features/
    workspace/          # workspace CRUD, the SERP/Saved-Results shell, session-scoped nav
      api/               # HTTP calls (workspaceService, workspaceNavigation, savedDocsQueryService)
      components/         # dialogs (create/edit/delete/color-picker)
      context/           # WorkspaceContext, SavedBookmarksContext
      layout/            # WorkspaceHeader
      pages/             # WorkspaceList, WorkspaceView (the SERP/Saved-Results tab shell)
      utils/
    search/              # search + saved-results UI, rendered inside WorkspaceView
      api/               # queryService
      components/         # SearchSection, SearchResult, ResultRow, VirtualizedSearchResults, SavedSearchResults
      pages/             # SerpView, SavedSearchResultsView (thin wrappers composed by WorkspaceView)
  shared/                # cross-feature components + libraryService (search/save API calls)
  session/               # participant login/session (StartPage, ParticipantSessionContext, lifecycle helpers)
  layout/                # MainHeader, Layout (the app shell + breadcrumb)
  theme/                 # colors.js, designTokens.js (primitives), uiTokens.js (palette+layout), theme.js (MUI assembly)
  utils/                 # document/metadata parsing, localStorage helpers, misc
  hooks/                 # useTruncatedText, useIsLikelyDesktopDevice, useWorkspaceScrollRouting
  api/                   # apiClient.js — the one axios instance, attaches JWT + participant-id headers
  app/                   # App.jsx (error boundary + shell), router/

backend/
  routes/     -> controllers/ -> models/   # standard thin-router pattern, all four route files follow it
  middleware/  # authMiddleware (JWT verify)
  utils/       # id coercion, metadata normalization, logger
  scripts/     # one-off migration/audit scripts, not part of the running app
```

`shared/` vs `utils/` isn't a hard boundary — `shared/` leans toward components + the one cross-cutting service (`libraryService.js`), `utils/` toward pure functions. When in doubt, follow the existing neighbor: document/metadata helpers go in `utils/`, anything rendering UI goes in `shared/components/`.

## Core flow

1. **Login** (`session/pages/StartPage.jsx`) — participant enters an ID, no password. `session/participantSessionLifecycle.js` centralizes the login/logout storage cleanup. `ParticipantSessionContext` holds the current participant in memory + `localStorage`.
2. **Workspaces** (`features/workspace/pages/WorkspaceList.jsx`) — a workspace is a named folder of searches + saved documents. `WorkspaceContext` owns the currently-selected workspace and is the single source of truth for "which workspace am I in."
3. **SERP / Saved Results** (`features/workspace/pages/WorkspaceView.jsx`) — one shell, two tabs, switched via a `#serp` / `#all` URL hash (see "known rough edges" below). Renders `features/search/pages/SerpView` or `SavedSearchResultsView`.
4. **Search** (`SearchSection` → `shared/libraryService.js` → `backend/routes/libraryRoutes.js` → Primo API) — the backend proxies Primo so the API key never reaches the browser.
5. **Save/unsave** (`BookmarkSaveButton` → `libraryService.ensureSavedThenGetId` / `unsaveSavedDocument` → `backend/routes/saveddocsRoutes.js`) — writes to the `SavedDoc` collection, uniqueness on `{ userId, workspaceId, externalId, isRemoved:false }`.

## State management: which tool for which job

Three mechanisms are in play, each for a different scope:

- **React Context** (`WorkspaceContext`, `SavedBookmarksContext`, `ParticipantSessionContext`) — in-memory state scoped to the component tree. Use this for anything a component can just read from a provider.
- **`utils/userScopedStorage.js`** — the real localStorage layer, keys prefixed `user_<id>_...` to prevent one participant's data leaking into the next session in the same browser. Always use this, not raw `localStorage.setItem`, for anything workspace- or participant-scoped. (`utils/localStorageUtils.js` also exists, reads *unscoped* keys for two legacy call sites — known duplication, see below, don't add new code here.)
- **A window `CustomEvent` bus** — for cross-tree signals where prop-drilling or Context would be awkward (e.g. "a document was just saved, three unrelated components need to react"). The full, current contract:

  | Event | Payload | Dispatched by | Heard by |
  |---|---|---|---|
  | `ws:workspace:changed` | `{ workspaceId }` | `WorkspaceContext` | `Layout`, `SearchSection`, `SearchResult` |
  | `ws:saved` | `{ savedocId, savedId, controlNumber, externalId, searchTopic, workspaceId }` | `libraryService.ensureSavedDoc` | `SavedBookmarksContext`, `WorkspaceList` |
  | `ws:unsaved` | `{ workspaceId, controlNumber, externalId, savedId, savedocId }` | `libraryService.unsaveSavedDocument` | `SavedBookmarksContext`, `WorkspaceList`, `ResultRow` |
  | `ws:document:removed` | `{ savedId, savedocId, workspaceId }` | `libraryService.unsaveSavedDocument` | `SavedBookmarksContext`, `WorkspaceList`, `ResultRow` |
  | `workspace:open` | normalized workspace object | `workspaceNavigation.openWorkspace` | `WorkspaceContext` |
  | `searchTermChanged` | term string (or `{term}`) | `WorkspaceContext`, `WorkspaceView`, `WorkspaceList`, `SearchSection`, `SearchResult` | `WorkspaceView`, `SearchSection` |
  | `serpSearchStart` | none | `SearchSection` | `SearchResult` |
  | `searchQueryCreated` | `{ query, queryId, workspaceId }` | `SearchSection` | `SearchResult` |
  | `totalResultsUpdated` | `{ totalResults }` | `SearchResult` | `Layout` |
  | `auth:user:switched` | `{ userId }` | `StartPage` | `WorkspaceContext`, `WorkspaceList` |

  This table is the source of truth — if you add or remove an event, update it here. (It used to be scattered and partly undocumented, including two event names dispatched redundantly on every workspace change and three events dispatched into the void with zero listeners; both were cleaned up in this handoff pass.)

## Backend

Four route files, each a thin layer over a same-named controller (`routes/X.js` → `controllers/XController.js`, all wrapped in `express-async-handler`). Four models: `User`, `Workspace`, `Queries`, `SavedDoc`. `middleware/authMiddleware.js` verifies the JWT on every request past `/api/users/participant-login`; identity always comes from `req.user.id`, never from the request body.

`backend/scripts/*.js` are one-off maintenance scripts (index audits, legacy-field cleanup, data migrations) — not run automatically, not part of the request path.

## What's deliberately different from the study build

- **No interaction logging.** The original study build logs every participant interaction (searches, saves, clicks) to MongoDB for analysis. That system was fully removed from this handoff copy at the repo owner's explicit request — there is no `LogUI`, no `data-logui` markers, no logging middleware. If you're setting this up as a new study build rather than reading the code, you'll need to reintroduce logging from the original deployed branch.
- **Accessibility pass.** This copy went through a WCAG 2.2 AA-targeted audit and remediation (semantic structure, focus indicators, contrast, text-spacing resilience, error messaging, and more). No separate audit document ships with this handoff — the fixes are in the code and commit history. One deliberate exception: there's no user-facing settings panel for text size/spacing/color (WCAG 1.4.8, AAA) — browser zoom is the supported mechanism, kept that way specifically to avoid giving Baseline participants a customization option SearchPath participants don't have.

## Known rough edges (not fixed, flagged for whoever picks this up)

- **`userScopedStorage.js` vs `localStorageUtils.js`** — two modules both claim to handle workspace-title storage; `WorkspaceContext` writes to both, but a couple of call sites (`queryService.js`, `libraryService.js`'s re-exports) only read the unscoped one. Works today, but it's a real dual-source-of-truth risk in an app whose whole storage design is built around preventing cross-participant data bleed. Worth consolidating into one module before it causes a real bug.
- **Tab state via URL hash.** `WorkspaceView.jsx` tracks which tab (SERP/Saved Results) is active by syncing a `view` state with `window.location.hash` through two separate effects (one reads hash→state, one writes state→hash), and `workspaceNavigation.js`'s `openWorkspace()` has to fire a synthetic `hashchange` event via a hardcoded 100ms `setTimeout` to make sure the read-side effect actually picks up a programmatic navigation. It works, but it's fragile — a cleaner version would derive the active tab from React Router state directly instead of a second, hand-synced source of truth. Left alone this pass because it's core to every tab switch and not worth the regression risk for a structural cleanup.
- **Design tokens span 5 files** (`colors.js`, `designTokens.js`, `uiTokens.js`, `theme.js`, plus MUI's own theme object) with a real but easy-to-miss layering: `designTokens.js` holds primitives, `uiTokens.js` attaches palette keys and layout values on top. If a value looks wrong, check `designTokens.js` first — it's almost always the single source of truth now (this used to also be duplicated in `style.css` with `!important` overrides; that duplication was removed this pass).
