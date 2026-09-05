# Citadel — Agent Guide

## Dev Commands

### Frontend (`cd /home/oby/Projects/citadel/frontend`)
```
pnpm dev          # Vite dev server on :5173, proxies /api + /socket.io → localhost:3000
pnpm build        # tsc -b && vite build (run before committing; includes typecheck)
pnpm exec tsc -b  # typecheck only
pnpm exec oxlint  # lint only
pnpm exec tsr generate  # regenerate routeTree.gen.ts after route file changes
```

### Backend (`cd /home/oby/Projects/citadel/backend`)
```
pnpm dev          # nodemon + tsx src/index.ts, auto-restarts on changes
pnpm build        # tsc -p tsconfig.json → dist/
pnpm start        # node dist/index.js (run after build)
```

No test runner configured. No CI or pre-commit hooks.

---

## Architecture

**Not a monorepo.** `frontend/` and `backend/` are independent pnpm packages with no root `package.json`.

### Frontend Stack
- React 19 + Vite + TanStack Router + Tailwind v4
- **routeTree.gen.ts is auto-generated** by `@tanstack/router-plugin/vite` — regenerates on every `vite dev` or `pnpm build`. Commit changes to it after adding/removing routes.
- `stages.ts` — 5-stage navigation system (see below)
- `index.css` — ALL styles: Tailwind v4 `@theme {}` block + custom classes (~3750 lines)
- `main.tsx` — entry: creates router + AuthProvider + RouterProvider

### Backend Stack
- Node.js ESM, Express + Socket.io
- In-memory only (no DB — lost on restart)
- `backend/src/index.ts` — Express app + Socket.io on `:3000`

### Routing: 5-Stage Nav (`stages.ts`)

| Index | Path | Screen |
|-------|------|--------|
| 0 | `/` | The Gate — inscription/login |
| 1 | `/chamber` | Chamber Nexus — create or join |
| 2 | `/lobby` | Staging Grounds — party lobby |
| 3 | `/run` | The Descent — live run |
| 4 | `/archive` | Tactical Archive — folio |

- `sessionStorage.citadel.stage` stores current stage index
- `__root.tsx` guards: unauthenticated → `/`; navigating past stored stage → redirect to stored stage
- Auth tokens: `localStorage.citadel.token` (user session), `localStorage.citadel.roomToken` (room session)

---

## Critical Quirks

**Tailwind v4 — no `tailwind.config.js`.** All custom colors/fonts/spacing go in `@theme {}` in `index.css`. Using a config file will not work with v4.

**routeTree.gen.ts auto-generation.** Never edit it manually. After adding/removing a route file, run `pnpm exec tsr generate` and commit the result.

**Socket.io token auth.** Pass `auth: { token: \`Bearer ${roomToken}\` }` on connect. Server strips the `Bearer ` prefix.

**ESM backend.** `package.json` has `"type": "module"`. Use `.js` extensions in imports even for TypeScript files.

---

## Design System

**Grimoire Nocturna** (violet + gold + deep surfaces). Reference spec: `frontend/ref/ref/stitch_citadel_text_dungeon_crawler/grimoire_nocturna/DESIGN.md`.

Key palette (from refs, used in `index.css` `@theme {}`):
- Void/background: `#0c0b0f`
- Grimoire surface: `#181520`, raised: `#221c2e`
- Gold primary: `#d4af37`, bright: `#f2ca50`, patina: `#8a702b`
- Astral violet: `#c084fc`, deep: `#3b0764`
- Parchment: `#ece4d4`, muted: `#cfc4b0`, aged: `#9d9280`

Typography: `Cinzel` (headings/labels), `EB Garamond` (body), `JetBrains Mono` (mono), `Playfair Display` (editorial). All loaded in `index.html`.

Content source: `.docs/` (Obsidian vault) — lore, officer voice, mechanics text. UI copy should align to `.docs/` not to placeholder text in ref mockups.

---

## Key Data Types

```ts
RoomData           // full room: inviteCode, players, config, floor, map, messages, encounter, currentVote
PlayerPublic       // in-room player: playerId, name, status, stats (PlayerRunEntity)
PlayerRunEntity    // character: level, HP, stats, inventory, abilities, gold, consumables
EncounterPublicState // combat state: enemies, initiative, round, phase, currentTurnId, log
RoomConfig         // { maxPlayers, seed, difficulty, mapSize }
MapPublicJSON      // explored rooms only (fog of war)
```

---

## File Ownership Hints

- `frontend/src/routes/*.tsx` — route components (one file per route)
- `frontend/src/components/` — shared UI primitives
- `frontend/src/stages.ts` — nav stage index constants + helpers
- `frontend/src/rooms.ts` — all REST + socket helpers + types
- `frontend/src/auth.tsx` — AuthProvider context
- `frontend/src/useRoomSocket.ts` — Socket.io connection hook
- `frontend/src/roomSession.ts` — room token encode/decode/save
- `backend/src/domains/game-room/` — game room controller + state machine
- `backend/src/domains/dungeon-master/` — AI resolve + narrate
- `backend/src/domains/procedural-engine/` — RNG, dungeon gen, abilities, enemies, gear
