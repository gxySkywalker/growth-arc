# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**成长轨迹 (Growth Arc)** — a local-first, single-user Electron desktop app for focus timers, task/learning management, and gamified reflection. The UI is themed as a fantasy "hearth & expedition" world. All data lives in a local SQLite database; there is no server, no sync, and no accounts.

## Commands

```bash
npm run dev          # Vite dev server + Electron (with hot reload)
npm run build        # TypeScript check + Vite production build
npm start           # Build then launch Electron
npm test            # Run all tests (vitest)
npm run test:watch  # vitest in watch mode
npm run dist        # Build + electron-builder Windows NSIS installer
```

Tests live in `src/lib/*.test.ts`. The test command in `package.json` explicitly lists three files; when adding a new test file, add it there.

## Architecture

```
┌─ Electron main (electron/main.cjs) ─────────────────────────────┐
│  Window/tray management, IPC handlers, OpenAI API calls          │
│  IPC channels: dashboard:get, session:start, task:update, etc.   │
├─ Electron preload (electron/preload.cjs) ────────────────────────┤
│  contextBridge exposes window.growthArc (typed in src/types.ts)  │
├─ Database (electron/database.cjs) ───────────────────────────────┤
│  sql.js (WASM SQLite), all CRUD, migrations, achievements, stats │
├─ Domain logic (electron/domain.cjs) ─────────────────────────────┤
│  Pure functions: XP/level math, date bounds, achievements list   │
├─ Game logic (electron/game.cjs) ─────────────────────────────────┤
│  Companions, loot tables, expedition rolls (deterministic RNG)   │
├─ React frontend (src/) ──────────────────────────────────────────┤
│  Vite + React 19, page-based routing via useState<PageId>        │
└──────────────────────────────────────────────────────────────────┘
```

### Frontend layer

- **`src/App.tsx`** — top-level shell with sidebar nav and page switching via `useState<PageId>`. No router library; page is just a state variable.
- **`src/context/AppContext.tsx`** — single React context holding `dashboard`, `structure`, `activeSession`, `loading`. The `refresh()` function re-fetches both dashboard and structure from the Electron main process. Toast notifications are managed here.
- **`src/types.ts`** — all TypeScript types AND the `GrowthArcApi` interface that mirrors `window.growthArc`. This is the contract between renderer and main process. The `declare global { interface Window { growthArc: GrowthArcApi } }` block is how the preload API is typed.
- **Pages** (`src/pages/`) — `HomePage`, `PlanPage`, `HistoryPage`, `ReviewPage`, `GrowthPage`, `SettingsPage`. Each page calls `window.growthArc.*` directly for mutations and uses `useApp()` for shared state.
- **`src/components/FocusController.tsx`** — the most complex component. Manages the full focus session lifecycle: start modal, running timer with heartbeat (30s interval), pause/resume, stop-with-reflection modal, and the expedition reward reveal. Also exports `startFocus(taskId?)` which dispatches a custom DOM event so other components can trigger focus without prop drilling.
- **`src/components/PixelCompanion.tsx`** — renders companion sprites via CSS classes (`sprite-${speciesId} palette-${palette}`). The actual pixel art is defined in CSS.
- **`src/lib/format.ts`** — date/duration formatting and `friendlyError()` which strips Electron IPC error prefixes.

### Electron main process (`electron/main.cjs`)

- Creates `BrowserWindow` with `contextIsolation: true`, loads Vite dev server URL in dev or `dist/index.html` in production.
- Minimizes to system tray on close (not quit). System tray has "open" and "quit" options.
- `handle(channel, callback)` wraps every IPC handler in try/catch.
- `generateAiReport(type, date)` calls OpenAI Responses API with structured JSON output (`json_schema` format, not function calling). API key is stored via `safeStorage.encryptString` (Windows DPAPI) in a separate `secret.bin` file — never in SQLite.
- Power monitor: auto-pauses running sessions on system suspend.
- 60-second interval checks for 90-minute focus notification.

### Database (`electron/database.cjs`)

- Single class `StudyDatabase`. Init loads sql.js WASM, creates/opens SQLite file at `{userData}/growth-arc.sqlite`.
- `migrate()` creates tables and adds columns with `ALTER TABLE` when missing (no migration versioning — checks `PRAGMA table_info`).
- `seed()` inserts default area, settings defaults, and starter companion on first run.
- `save()` writes to a temp file then copies over (atomic-ish on local FS).
- All mutations call `this.save()` implicitly; `transaction()` batches writes and saves once.
- `recoverStaleSession()` on startup: sessions `running` with >90s since last heartbeat get paused.
- Stats computed via `rangeStats(start, end)` which joins `focus_intervals` with sessions and areas.
- XP system: `focusXp()` (capped at 24 per session) + `completionXp()` (20 base + bonus by total task focus time). Level curve: 100 + 25×(level-1) per level.
- Achievements checked after every mutation via `checkAchievements()`.

### Game layer (`electron/game.cjs`)

- 8 companion species (1 starter, 3 common, 4 rare), 9 loot items (5 common, 4 rare).
- `rollExpedition()` uses a deterministic SHA-256-based RNG seeded with `sessionId + activeSeconds` — same input always produces the same expedition, making it idempotent.
- Duration tiers determine common loot count and rare/companion drop chance. Pity system: rare pity at 9+ guarantees rare; companion pity at 7+ guarantees new companion.
- Companions have 3 stages (0/1/2), evolution paths at stage 2 require choosing one of two directions.

### Key flows

1. **Focus session**: User starts → `session:start` creates intervals → heartbeat every 30s from renderer → pause/resume closes/opens intervals → stop computes `activeSeconds` from all intervals, awards XP, rolls expedition, creates knowledge relic from outcome text.
2. **Task lifecycle**: `todo` → `doing` (auto on session start) → `done` (manual or via session stop with `taskCompleted=true`) → `archived`.
3. **AI reports**: User clicks generate → main process reads API key from DPICA, builds payload from daily/weekly data, sends to OpenAI Responses API with structured JSON schema, saves result back to DB.
4. **Companion bond**: Each completed session grants bond XP to the accompanying companion based on session duration. Enough bond XP unlocks evolution.

## Styling conventions

- Three CSS files: `styles.css` (app shell, pages, components), `focus.css` (focus timer expedition UI), `world.css` (companion sprites, game elements).
- CSS custom properties for theming: `--accent` is the user-chosen accent color applied via `document.documentElement.style.setProperty`.
- Companion sprites are CSS-only pixel art using nested `<i>` and `<b>` elements with class names like `sprite-body`, `sprite-head`, `sprite-ear-left`, etc.

## Important constraints

- **No router**: page navigation is purely `useState<PageId>` in `AppShell`. Do not introduce a routing library without explicit discussion.
- **CommonJS in Electron, ESM in Vite**: `electron/*.cjs` use `require/module.exports`. `src/*.ts` use `import/export`. Tests import domain.cjs directly (the test files are processed by vitest which handles CJS).
- **sql.js is WASM**: the WASM file must be readable at runtime. In production builds it's unpacked from asar via `asarUnpack` in package.json build config.
- **API key storage**: always use `safeStorage` (DPAPI), never store keys in SQLite or localStorage.
- **Deterministic expedition RNG**: the seed is `SHA256(sessionId + ':' + activeSeconds)`. Changing the roll algorithm would retroactively change past expedition results unless gated on creation date.
