# Citadel

**A multiplayer, text-based roguelike — descend the living tower with your party.**

Inspired by **Written Realms**, **Slay the Spire**, and **Shape of Dreams**.

## Overview

Citadel is a real-time, browser-based game where a party of players descends through procedurally generated dungeons together. There's no client to install — just a text interface in your browser.

The Citadel itself is the narrator. It describes the world, judges your party's actions, and turns every choice into consequences. You type what you do, the Citadel decides how it goes, and you roll the dice together — deep, deeper, until the whole party falls.

## How it works

1. **Form an expedition** — you get an expedition code to share with friends
2. **Join the party** — everyone enters their name and picks a starter kit
3. **Descend together** — the host opens the gate and the run begins
4. **Act as a party** — read the scene, submit actions, and face the results
5. **See how far you get** — each dungeon climbs; the run ends only when the whole party is wiped

## Run locally

### Prerequisites

- **Node.js** >= 22
- **pnpm** >= 11
- **Groq API key** — get one at [console.groq.com](https://console.groq.com)

### Setup

```sh
git clone <repo-url> && cd citadel
```

**Backend:**

```sh
cd backend
cp .env.example .env   # add your GROQ_API_KEY
pnpm install
pnpm dev                # starts on http://localhost:3000
```

**Frontend:**

```sh
cd frontend
pnpm install
pnpm dev                # starts on http://localhost:5173
```

Open **http://localhost:5173** in your browser. The Vite dev server proxies `/api` and `/socket.io` to the backend on `:3000`.

### Scripts

**Backend** (`cd backend`):

| Command | What it does |
|---|---|
| `pnpm dev` | nodemon + tsx, auto-restarts on changes |
| `pnpm build` | compile TypeScript to `dist/` |
| `pnpm start` | run the compiled output |
| `pnpm typecheck` | type-check without emitting |

**Frontend** (`cd frontend`):

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server on `:5173` with HMR |
| `pnpm build` | type-check + production build to `dist/` |
| `pnpm exec oxlint` | lint |

## Tech stack

| Layer | Choice |
|---|---|
| **Client** | React 19 (Vite) + TanStack Router + Tailwind v4 + socket.io-client |
| **Server** | Node.js ESM + Socket.io + Express — single process |
| **AI** | LangChain.js (Groq, `openai/gpt-oss-20b`) |
| **State** | In-memory (users, game rooms, run state) — lost on restart |
| **Transport** | REST for entry/routing, Socket.io for live game events |

## Documentation

Full design docs live in the `.docs/` vault (an Obsidian vault). Key entry points:

| Doc | Contents |
|---|---|
| [Welcome](.docs/Welcome.md) | Overview and the expedition flow |
| [Mechanics](.docs/Mechanics/Mechanics.md) | Characters, leveling, stasis, gear, abilities, resolution |
| [Architecture](.docs/Architecture/Architecture.md) | Tech stack, backend domains, game flow |
| [Theme](.docs/Theme/Theme.md) | Lore, the officer's voice, and the game's look |

---

*No one has ever seen the bottom. The tower's bettors are still waiting for someone to try.*
