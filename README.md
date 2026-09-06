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
