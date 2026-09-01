# Citadel

**A multiplayer, text-based roguelike — descend the living tower with your party.**

Inspired by **Written Realms**, **Slay the Spire**, and **Shape of Dreams**.

> **Status: Core systems phase.** Foundation, rooms, identity, procedural generation, character system, the full ability system, the AI DM (wired into the run loop as judge + narrator), and trial challenges (dice/DC resolution for locked passages) are implemented. The free-text action pipeline works end-to-end (structured verdict → procedural resolution → narration). What's **not yet built**: the shared move economy, combat encounters with enemies, full dice/DC resolution for combat, XP/level-up rewards, loot & equipment progression, and the merchant (stasis).


## Overview

Citadel is a real-time, browser-based game where a party of players descends through procedurally generated dungeons together. There's no client to install — just a text interface in your browser.

The Citadel itself is the narrator. It describes the world, judges your party's actions, and turns every choice into consequences. You type what you do, the Citadel decides how it goes, and you roll the dice together — deep, deeper, until the whole party falls.

## How it works

1. **Form an expedition** — you get an expedition code to share with friends
2. **Join the party** — everyone enters their name and picks a character
3. **Descend together** — the host opens the gate and the run begins
4. **Act as a party** — read the scene, submit actions, and face the results
5. **See how far you get** — each dungeon climbs; the run ends only when the whole party is wiped

## Features

- **Free-text play** — actions are typed as plain text and structured into a verdict (`execute` / `not_allowed` / `ambiguous`); an `execute` verdict carries up to 6 structured actions (`intent` / `target_type` / `target_id` / `direction` / `resource`)
- **Shared action economy** — *planned*: the party gets **3 moves per round**, split however they choose; AGI breaks ties, unspent moves are lost, then monsters respond. Not yet built — actions currently resolve one at a time with no move budget.
- **Deterministic resolution** — every roll is `d20 + stat` vs a difficulty class, resolved by a seeded procedural engine; **same seed + same party = same run**. The dice/DC roll is wired in for trial challenges (locked passages); combat/encounter rolls are *planned*.
- **Characters** — STR / DEX / INT / WIS / AGI / HP; every stat starts at base 20, plus **50 bonus points** (max 40 per stat at creation), with race as a cosmetic choice
- **Run-scoped leveling** — equal XP for the whole party; each level banks **+3 stat points** and raises every stat cap by 1; bosses grant bonus points to survivors. XP/level-up and boss bonuses are *planned* — XP is never awarded in a run yet.
- **Stasis rooms** — *planned*: a rest checkpoint at the start of every dungeon: restore HP, spend stat points, and visit the merchant (buy/sell gear for gold). Not yet built.
- **Equipment** — *planned*: weapon and armor slots, upgraded via drops or merchant purchases; better gear drops in any room, and dropped gear can be dismantled for a small XP bump. Slots exist on the sheet; drops, merchant, and dismantling are not built.
- **Abilities from scrolls** — 1 active + 2 passive slots. The 97-ability system is built, but scroll acquisition is *planned*.
- **Fainting & revives** — *planned*: a player at 0 HP is downed for the encounter; an ally can spend a revive action, and a full party wipe is the only way a run ends. Dead-state detection exists but downed/revive/wipe handling isn't wired up.
- **Escalating descent** — dungeons grow harder with each cleared floor and scale with party size; a typical run lands around **20–30 minutes**. Difficulty scaling is *planned*.
- **Pacing that doesn't stall** — the run advances only when every connected (socket-alive) player votes yes; narration lands as each event resolves

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
- [ ] Round/turn system (shared action economy: 3 moves per round) — actions currently resolve one at a time with no move budget
- [x] Advance gate: every connected (socket-alive) player must vote yes to advance

### Characters
- [x] Stat system (STR / DEX / INT / WIS / AGI / HP)
- [x] Lobby character creation (50-point budget, floor 20, cap 40)
- [x] Race selection (cosmetic: elf / dwarf / human / orc / goblin / troll)
- [x] Run-scoped leveling (cubic XP curve, +3 skill points per level)
- [x] Skill point allocation
- [x] Ability system (97 abilities across 6 stat trees, with active/passive, components, targeting) — acquired by claiming scrolls in-run (acquisition not yet wired)
- [x] In-run stat modification (skill-point spend at grace rooms; full level-up UI pending)
- [ ] Per-encounter XP awards and boss bonus XP — XP is not yet awarded during a run

### Procedural generation
- [x] Seeded RNG (MulberryRNG, FNV-1a string hash)
- [x] Dungeon map generation (random walk, weighted direction bias, backtracking, cross-linking)
- [x] Room types (GRACE / NORMAL / BOSS / PUZZLE / MINIBOSS / TREASURE / SECRET)
- [x] Graph-diameter start/boss selection with depth-based room type assignment
- [x] Miniboss placement (triangular distribution, same-type adjacency gap)
- [x] Secret rooms (new dead-end branches, not converted normals; count by map size)
- [x] Passage events (combat / puzzle / challenge with stat requirements, depth-scaled)
- [x] Map serialization and frontend rendering (BFS grid layout, pan/zoom, type coloring)
- [x] Dice roll resolution for trial challenges (d20 + stat vs DC) — combat/encounter rolls pending
- [x] DC calculation for trial challenges (`8 + difficulty × 4`) — events carry `difficulty`/`requiredStat`/`flavor_text` and are resolved via `challenge`
- [x] Action resolution pipeline (move / look / rest / use_item / use_ability / challenge resolvers)

### Equipment & gear
- [x] Data model (weapon / armor slots, consumables, gold)
- [x] Default starter gear (wooden helmet / chestplate / greaves / bat)
- [x] Consumables (health potion works; gold key / lockpick tracked but have no game effect yet)
- [ ] Gear catalog / loot tables
- [ ] Gear drop logic (rewards from rooms)
- [ ] Equip / unequip actions
- [ ] Merchant / shop (buy / sell in stasis rooms)
- [ ] Gear dismantling for XP

### AI Dungeon Master
- [x] Structure free text into structured verdicts (intent / target / direction / resource)
- [x] Judge actions (execute / not_allowed / ambiguous, parse-failure fallback)
- [x] Narrate outcomes (in-world prose)
- [x] Wire DungeonMaster into GameRoom (room snapshot → resolve → execute → narrate)

### Frontend
- [x] Login / identity page
- [x] Lobby (expedition management, invite codes, player roster, host controls, character modal)
- [x] Run page layout (party manifest, field log, room card)
- [x] Map visualization (interactive canvas with pan/zoom, room type colors, connectors)
- [x] Action input UI (text field for player actions, @mention autocomplete)
- [x] Real-time transcript from server (with speaker attribution, self-highlighting)
- [x] Scene description display (room card + DM narration)
- [ ] Move counter / shared action economy display
- [x] Fog of war / explored vs unexplored rooms (only visited rooms serialize)
- [ ] Room navigation from map (map is view-only)

### Combat & encounters
- [ ] Combat state and encounter loop
- [ ] Monster / enemy definitions
- [ ] Damage calculation
- [ ] Fainting & revive mechanics
- [ ] Full party wipe = run end

### Stasis rooms
- [x] Grace room rest behavior (HP restore) — the `rest` action heals to full in grace rooms
- [x] In-run stat point spending — `change_player_stats` action works in-run
- [ ] Merchant / shop UI (buy / sell)

## Theme

### Lore

The Citadel is a **living tower-dungeon** — ever-growing, ever-moving, with no exit. It was once the townhall of a civilization in the **forest of Jura**; its people betrayed the gods, and their great hall was cursed into an endless, shifting descent.

The nobles of Jura turned the curse into a **theatre for the rich** — a death arena with no audience. The condemned descend as expeditions while the nobles bet on how deep they'll fall.

Every expedition carries a **ruined tablet**, through which a flat, official voice — the **officer**, the game's Dungeon Master — follows the party, judges their actions, and records every descent. The prisoners can hear; they can never answer.

### Style

Retro medieval, illuminated-manuscript — dark vellum, ornamental corners, old-style serif body text with blackletter headers and drop caps. No CRT or scanlines; terminal imagery belongs only to the tablet's voice.

| Role | Hex | Notes |
|---|---|---|
| Background | `#090909` | ink-black |
| Player | `#d3ffe9` | pale mint — brightest, "you" stand out |
| Other party members | `#9bc4bc` | sage — one step dimmer |
| DM (officer, via the tablet) | `#8ddbe0` | fen cyan — the voice from the stone |
| System | `#4b5043` | faded olive — muted, never shouts |

Outcomes are structured lines, not prose walls — validation reads like court rulings:

```
> I advance, blade low, toward the warden
→ RULING: ADMISSIBLE
roll 12 + 26 vs 18 → hit
  14 damage to the warden
```

## Tech stack

| Layer | Choice |
|---|---|
| **Client** | React (Vite) + socket.io-client — static SPA, no install |
| **Server** | Node.js + Socket.io (Express/Fastify for REST) — single process for MVP |
| **AI** | LangChain.js (Groq, `openai/gpt-oss-120b`), in-process — DungeonMaster: `Resolve` (free text → structured verdict) + `Narrate` (event → prose) |
| **State** | In-memory (users, game rooms, run state) — everything is lost on server restart |
| **Transport** | REST for entry/routing, Socket.io for live game events |

**Architecture rules:**

- **Single process** — one Node server holds sockets, game state, and the in-process agent for the MVP
- **AI is bound to Groq** — `CreateDungeonMaster` uses ChatGroq (`openai/gpt-oss-120b`)
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
- **DungeonMaster** turns free text into a structured verdict (`execute` / `not_allowed` / `ambiguous`) and narrates decided outcomes as single-shot prose. It's bound to Groq (`openai/gpt-oss-120b`) via `CreateDungeonMaster`. It never decides outcomes and never owns state — parse failures fall back to `not_allowed`.
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
