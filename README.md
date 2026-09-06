# Citadel

**A multiplayer, text-based roguelike — descend the living tower with your party.**

Inspired by **Written Realms**, **Slay the Spire**, and **Shape of Dreams**.

> **Status: Core loop complete.** Foundation, rooms, identity, procedural generation, character system, starter kits, the full ability system, the AI DM (wired into the run loop as judge + narrator), turn-based combat with enemies, damage calculation, trial challenges, XP awards, loot drops, the merchant, inventory stacking, dropped items, grace revival, and dead-player restrictions are all implemented. The free-text action pipeline works end-to-end (structured verdict → procedural resolution → narration).


## Overview

Citadel is a real-time, browser-based game where a party of players descends through procedurally generated dungeons together. There's no client to install — just a text interface in your browser.

The Citadel itself is the narrator. It describes the world, judges your party's actions, and turns every choice into consequences. You type what you do, the Citadel decides how it goes, and you roll the dice together — deep, deeper, until the whole party falls.

## How it works

1. **Form an expedition** — you get an expedition code to share with friends
2. **Join the party** — everyone enters their name and picks a starter kit
3. **Descend together** — the host opens the gate and the run begins
4. **Act as a party** — read the scene, submit actions, and face the results
5. **See how far you get** — each dungeon climbs; the run ends only when the whole party is wiped

## Features

- **Free-text play** — actions are typed as plain text and structured into a verdict (`execute` / `not_allowed` / `ambiguous`); an `execute` verdict carries up to 6 structured actions (`intent` / `target_type` / `target_id` / `direction` / `resource`)
- **Turn-based combat** — initiative sorted by agility; each player selects attack, defend, or an ability on their turn; enemies act automatically with heuristic AI; defend redirects enemy targeting
- **Deterministic resolution** — every roll is `d20 + stat` vs a difficulty class, resolved by a seeded procedural engine; **same seed + same party = same run**
- **Characters** — STR / DEX / INT / WIS / AGI / HP; every stat starts at base 20, plus **50 bonus points** (max 40 per stat at creation), with race as a cosmetic choice
- **Starter kits** — 5 kits (Vanguard, Blade, Shadow, Arcane, Wanderer) with pre-set gear, consumables, and starting abilities
- **Run-scoped leveling** — equal XP for the whole party; each level banks **+3 stat points** and raises every stat cap by 1; XP awards from combat encounters (8 XP × threat multiplier per enemy, split among alive players)
- **Loot drops** — combat encounters drop items via seeded loot tables; rarity tiers (common → legendary) shift with depth; items land on the ground for players to pick up
- **Gold economy** — gold from encounter rewards; spent at the merchant (buy gear, consumables, scrolls) or earned by selling
- **Merchant** — buy/sell in grace rooms; stock generated per-room with guaranteed health potions; sell price = 50% of buy price
- **Inventory** — stackable items with cap; equip gear, use consumables, bind abilities from scrolls
- **Abilities** — 97-ability system with active/passive components, targeting, and cooldowns; abilities come from starter kits and scrolls found in the dungeon
- **Fainting & revives** — a player at 0 HP is skipped in initiative; revive via abilities (30% MaxHP heal) or automatically at grace rooms; dead players can't act, pick up items, or interact with gear/merchant
- **Dropped items** — items on the ground are visible to all; pick up to claim; dead players can't pick up
- **Escalating descent** — dungeons grow harder with each cleared floor and scale with party size
- **Pacing that doesn't stall** — the run advances only when every connected (socket-alive) player votes yes; narration lands as each event resolves
- **Grace rooms** — sanctuary checkpoints; rest restores HP; auto-revive downed players to full; merchant available

## Roadmap

### Foundation
- [x] Scaffold the app (React/Vite client + Node/Socket.io server)
- [x] Stand up the repo structure — independent `backend/` + `frontend/` folders, each self-contained (deliberately not a monorepo)

### Rooms & identity
- [x] User login / identification (REST entry)
- [x] Create an expedition (GameRoom instance)
- [x] Join an expedition via code
- [x] Join the room's Socket.io room on connect

### Session & state
- [x] Room session lifecycle (run/encounter loop)
- [x] In-memory room state management (players, character sheets, config)
- [x] Broadcast scene updates / results to all clients
- [x] Run/encounter game loop (InRunState: accepts actions, resolves them through the DM + engine)
- [x] Advance gate: every connected (socket-alive) player must vote yes to advance

### Characters
- [x] Stat system (STR / DEX / INT / WIS / AGI / HP)
- [x] Lobby character creation (50-point budget, floor 20, cap 40)
- [x] 5 starter kits with pre-set gear, consumables, and starting abilities
- [x] Run-scoped leveling (cubic XP curve, +3 skill points per level)
- [x] Skill point allocation
- [x] Ability system (97 abilities across 6 stat trees, with active/passive, components, targeting)
- [x] In-run stat modification (skill-point spend at grace rooms)
- [x] Per-encounter XP awards (8 XP × threat multiplier per enemy, split among alive players)
- [x] Boss bonus XP
- [x] Scroll acquisition (abilities learned from scrolls found in dungeon)

### Procedural generation
- [x] Seeded RNG (MulberryRNG, FNV-1a string hash)
- [x] Dungeon map generation (random walk, weighted direction bias, backtracking, cross-linking)
- [x] Room types (GRACE / NORMAL / BOSS / PUZZLE / MINIBOSS / TREASURE / SECRET)
- [x] Graph-diameter start/boss selection with depth-based room type assignment
- [x] Miniboss placement (triangular distribution, same-type adjacency gap)
- [x] Secret rooms (new dead-end branches, not converted normals; count by map size)
- [x] Passage events (combat / puzzle / challenge with stat requirements, depth-scaled)
- [x] Map serialization and frontend rendering (BFS grid layout, pan/zoom, type coloring, side-panel inspection)
- [x] Dice roll resolution for trial challenges (d20 + stat vs DC)
- [x] DC calculation for trial challenges (`8 + difficulty × 4`)
- [x] Action resolution pipeline (move / look / rest / use_item / use_ability / challenge resolvers)

### Equipment & gear
- [x] Data model (weapon / armor slots, consumables, gold)
- [x] 5 starter kits with default gear per archetype
- [x] Static gear catalog (80 items across 4 slots, rarity tiers, stat bonuses, buy prices)
- [x] Equip / unequip actions (backend + full frontend UI)
- [x] Loot tables (random item generation with depth-scaled rarity weights)
- [x] Gear drop logic (combat rewards, room loot for treasure/secret rooms)
- [x] Merchant / shop (buy / sell in grace rooms; guaranteed health potions + random stock)
- [x] Inventory stacking (stackable items with max stack qty)
- [x] Dropped items system (items on ground, pick up to claim)

### AI Dungeon Master
- [x] Structure free text into structured verdicts (intent / target / direction / resource)
- [x] Judge actions (execute / not_allowed / ambiguous, parse-failure fallback)
- [x] Narrate outcomes (in-world prose)
- [x] Wire DungeonMaster into GameRoom (room snapshot → resolve → execute → narrate)

### Frontend
- [x] Login / identity page
- [x] Lobby (expedition management, invite codes, player roster, host controls, kit selection with keyboard nav)
- [x] Run page layout (party manifest, field log, room card)
- [x] Map visualization (interactive canvas with pan/zoom, room type colors, connectors, side-panel inspection)
- [x] Action input UI (text field for player actions, @mention autocomplete)
- [x] Real-time transcript from server (with speaker attribution, self-highlighting)
- [x] Scene description display (room card + DM narration)
- [x] Fog of war / explored vs unexplored rooms (only visited rooms serialize)
- [x] Combat modal (initiative, action buttons, clickable foe cards, target selection, combat log)
- [x] Vote modal with keyboard navigation (arrow keys, number keys, Enter/Space)
- [x] Inventory & gear modals (equip/unequip, consumable use, ability binding)
- [x] Merchant modal (buy/sell tabs, keyboard navigation, stat comparison, quantity selector)
- [x] Dropped items panel (pick up from ground in right rail)
- [x] Tactical archive (end-of-run summary with accept-to-continue)

### Combat & encounters
- [x] Combat state machine and encounter loop (vote → combat → finish)
- [x] Monster / enemy definitions (99 enemies across 4 tiers, 14 enemy abilities)
- [x] Damage calculation (Pokemon-style formula, physical/magical type awareness)
- [x] Turn-based initiative (agility-sorted, player turns wait for input, enemy turns auto-resolve with heuristic AI)
- [x] Defend mechanic (redirects enemy targeting, clears on next turn)
- [x] Full party wipe = run end (EndRunState with narration)
- [x] Fainting & revive mechanics (revive ability heals 30% MaxHP; grace rooms auto-revive to full)
- [x] Dead player restrictions (can't act, pick up items, use merchant, equip/unequip)
- [x] Ambush mechanic (stealth check on entering enemy rooms; failure = combat with initiative disadvantage)

### Stasis rooms
- [x] Grace room rest behavior (HP restore) — the `rest` action heals to full in grace rooms
- [x] In-run stat point spending — `change_player_stats` action works in-run
- [x] Merchant / shop (buy/sell in grace rooms; stock generated per room with guaranteed health potions)
- [x] Grace room auto-revive (downed players restored to full HP with narration)

## Theme

### Lore

The Citadel is a **living tower-dungeon** — ever-growing, ever-moving, with no exit. It was once the townhall of a civilization in the **forest of Jura**; its people betrayed the gods, and their great hall was cursed into an endless, shifting descent.

The nobles of Jura turned the curse into a **theatre for the rich** — a death arena with no audience. The condemned descend as expeditions while the nobles bet on how deep they'll fall.

Every expedition carries a **ruined tablet**, through which a flat, official voice — the **officer**, the game's Dungeon Master — follows the party, judges their actions, and records every descent. The prisoners can hear; they can never answer.

### Style

**Grimoire Nocturna** — dark violet-and-gold illuminated-manuscript aesthetic. Deep void surfaces, parchment body text, ornamental gold corner accents. Zero border-radius; thin gold borders; subtle glow on hover. No CRT or scanlines; terminal imagery belongs only to the tablet's voice.

| Role | Hex | Notes |
|---|---|---|
| Void / background | `#0c0b0f` | deepest black-violet |
| Surface | `#181520` | panel and card ground |
| Gold primary | `#d4af37` | borders, highlights, active states |
| Gold bright | `#f2ca50` | hover glow, cipher codes |
| Astral violet | `#c084fc` | DM voice, officer markers |
| Parchment | `#ece4d4` | primary body text |
| Foe red | `#dc2626` | enemy borders, danger |

Outcomes are structured lines, not prose walls — the field log renders each action and result as distinct rows with colored left borders (gold for player, violet for DM):

```
‹ rest                          (player action — gold border)
✦ A calm settles...            (DM narration — violet border)
```

## Tech stack

| Layer | Choice |
|---|---|
| **Client** | React 19 (Vite) + TanStack Router + Tailwind v4 + socket.io-client — static SPA, no install |
| **Server** | Node.js ESM + Socket.io + Express — single process for MVP |
| **AI** | LangChain.js (Groq, `openai/gpt-oss-20b`), in-process — DungeonMaster: `Resolve` (free text → structured verdict) + `Narrate` (event → prose) |
| **State** | In-memory (users, game rooms, run state) — everything is lost on server restart |
| **Transport** | REST for entry/routing, Socket.io for live game events |

**Architecture rules:**

- **Single process** — one Node server holds sockets, game state, and the in-process agent for the MVP
- **AI is bound to Groq** — `CreateDungeonMaster` uses ChatGroq (`openai/gpt-oss-20b`)
- **State is in-memory** — no database; users and game rooms live in memory and are cleared on restart
- **No-install client** — the browser is the only client

## Architecture

The backend splits into four domains, each owning a narrow slice of a session:

| Domain | One-liner |
|---|---|
| **User** | Identity + auth only |
| **GameRoom** | The authoritative game session |
| **DungeonMaster** | The AI: structure, judge, narrate |
| **ProceduralEngine** | All randomness and outcome math |

- **User** issues a `user_id` once and reuses it across every expedition; it hands off to GameRoom after auth.
- **GameRoom** is authoritative: one instance per expedition, owning player mapping, character sheets, room lifecycle, and the run/encounter loop. It never rolls, generates, or resolves — it *asks* the AI to structure/judge/narrate and *hands* validated actions to the engine.
- **DungeonMaster** turns free text into a structured verdict (`execute` / `not_allowed` / `ambiguous`) and narrates decided outcomes as single-shot prose. It's bound to Groq (`openai/gpt-oss-20b`) via `CreateDungeonMaster`. It never decides outcomes and never owns state — parse failures fall back to `not_allowed`.
- **ProceduralEngine** is the single source of randomness — seeded RNG, dungeon generation, DCs, dice rolls — and resolves validated actions into deterministic outcomes. Pure, no I/O, trivially testable.

### Request flow

```
Client → REST → User (register/identify) → GameRoom (create/join expedition)
```

REST handles entry and routing only. Once a player is in a room, everything live moves to Socket.io:

```
Client → GameRoom (action intake)
              ↓
       DungeonMaster (resolve) ← free text → structured verdict
              ↓  execute
       ProceduralEngine (resolve) → deterministic outcome
              ↓
       DungeonMaster (narrate) → prose
              ↓
       GameRoom → all clients (scene update, result)
```

**Key rule:** outcomes are decided by game logic *before* the AI speaks. The AI narrates; it never decides what happened. GameRoom is the authority — the AI and engine are passive and never push.

## Documentation

Full design docs live in the `.docs/` vault (an Obsidian vault). Key entry points:

| Doc | Contents |
|---|---|
| [Welcome](.docs/Welcome.md) | Overview and the expedition flow |
| [Mechanics](.docs/Mechanics/Mechanics.md) | The mechanics hub — characters, leveling, stasis, gear, abilities, resolution |
| [Architecture](.docs/Architecture/Architecture.md) | Tech stack, backend domains, game flow, and request flow |
| [Theme](.docs/Theme/Theme.md) | Lore, the officer's voice, and the game's look |
---

*No one has ever seen the bottom. The tower's bettors are still waiting for someone to try.*
