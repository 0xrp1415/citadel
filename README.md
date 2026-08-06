# Citadel

**A multiplayer, text-based roguelike — descend the living tower with your party.**

Inspired by **Written Realms**, **Slay the Spire**, and **Shape of Dreams**.

> **Status: MVP design phase.** The `.docs/` folder is the design source of truth. No code yet.


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

- **Free-text play** — actions are typed as plain text and structured into Action Tools (`intent` / `target` / `detail` / `resource`); the AI judges each one with a ruling: `ADMISSIBLE`, `DENIED`, or a request for more detail
- **Shared action economy** — the party gets **3 moves per round**, split however they choose; AGI breaks ties, unspent moves are lost, then monsters respond
- **Deterministic resolution** — every roll is `d20 + stat + modifiers` vs a difficulty class, resolved by a seeded procedural engine; **same seed + same party = same run**
- **Characters** — STR / DEX / INT / WIS / AGI / HP; every stat starts at base 20, plus **50 bonus points** (max 40 per stat at creation), with race as a cosmetic choice
- **Run-scoped leveling** — equal XP for the whole party; each level banks **+3 stat points** and raises every stat cap by 1; bosses grant bonus points to survivors
- **Stasis rooms** — a rest checkpoint at the start of every dungeon: restore HP, spend stat points, and visit the merchant (buy/sell gear for gold)
- **Equipment** — weapon and armor slots, upgraded via drops or merchant purchases; better gear drops in any room, and dropped gear can be dismantled for a small XP bump
- **Abilities from scrolls** — 1 active + 2 passive slots; actives cost **mana, but only in battle** — outside combat they're free
- **Fainting & revives** — a player at 0 HP is downed for the encounter; an ally can spend a revive action, and a full party wipe is the only way a run ends
- **Escalating descent** — dungeons grow harder with each cleared floor and scale with party size; a typical run lands around **20–30 minutes**
- **Pacing that doesn't stall** — per-turn timeouts, a host that can force-advance, and streamed AI narration

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
| **AI** | LangChain.js, in-process — one Citadel Agent (structuring, validation, narration); provider-agnostic, model decided later |
| **Database** | PostgreSQL — free, self-hosted; JSONB for run snapshots; live session state stays in-memory |
| **Transport** | REST for entry/routing, Socket.io for live game events |

**Architecture rules:**

- **Single process** — one Node server holds sockets, game state, and the in-process agent for the MVP
- **Provider-agnostic AI** — the agent interface is a port, so the model/provider can be swapped without touching game logic
- **State split** — live session state is in-memory; PostgreSQL persists identity and run snapshots
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
- **DungeonMaster** turns free text into Action Tools, rules on scene-sense, and narrates streamed prose. It's exposed as a port (mockable, swappable). It never decides outcomes and never owns state; if it's down, sessions fall back to schema-only handling.
- **ProceduralEngine** is the single source of randomness — seeded RNG, dungeon generation, DCs, dice rolls — and resolves validated actions into deterministic outcomes. Pure, no I/O, trivially testable.

### Request flow

```
Client → REST → User (register/identify) → GameRoom (create/join expedition)
```

REST handles entry and routing only. Once a player is in a room, everything live moves to Socket.io:

```
Client → GameRoom (action intake)
              ↓
       DungeonMaster (structure + validate) ← free text → Action Tool
              ↓  valid
       ProceduralEngine (resolve) → deterministic outcome
              ↓
       DungeonMaster (narrate) → streamed prose
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
