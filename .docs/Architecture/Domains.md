The backend splits into four domains. Each owns its slice of a session and exposes a narrow surface.

| Domain | One-liner |
|---|---|
| **[[Domains#User\|user]]** | Identity + auth only |
| **[[Domains#Game Room\|GameRoom]]** | The authoritative game session |
| **[[Domains#Dungeon Master\|dungeon-master]]** | The AI: structure, judge, narrate |
| **[[Domains#Procedural Engine\|procedural-engine]]** | All randomness and outcome math |

## User

The account layer. Its only job is "who is this person?"

- **Owns:** identity (name) and auth (token/session). A `user_id` is issued once and reused across every expedition the person joins.
- **Exposes:** register/identify (`createUser`, `validateToken`) and nothing else.
- **Does not own:** characters, stats, game history, anything in a room. Once authenticated, it hands off to GameRoom.
- **Why separate from GameRoom:** identity must survive room teardown. Rooms come and go; a user persists. Keeps auth out of gameplay logic so the run loop never has to reason about tokens.

## Game Room

The game itself. One instance per expedition, authoritative over everything that happens in a session.

- **Owns:**
  - **Player mapping** — `user_id → player_id`. A user becomes a *player* the moment they join a room; the map is the bridge between the account layer and gameplay.
  - **Character sheets** — per `player_id`, run-scoped (STR / DEX / INT / WIS / AGI / HP). Created at staging, dead at run end.
  - **Room state & lifecycle** — staging → ready → gate open → running → ended.
  - **Run/encounter loop** — the authoritative state machine: stasis → scene → action intake → validation orchestration → resolution → fainting → boss → next dungeon → run end (wipe).
- **Internal submodules:**
  - `lobby` — members, ready flags, gate open, leader authority
  - `characters` — sheet creation/customization, stat access for resolution, per-player XP/level and banked stat points
  - `run` — run state, seed, dungeon index, dungeon sequence, party gold, run end stats
  - `stasis` — rest/merchant state, stat-point spending, gear buy/sell
  - `encounter` — the scene state machine, action intake, round move budget (3 moves/round), resolution pipeline
- **Key rule:** it never rolls, generates, or resolves itself — it *asks* dungeon-master to structure/judge/narrate and *hands* validated actions to procedural-engine to resolve. It owns state and sequencing, not generation or outcome math.

## Dungeon Master

The AI agent — the game's voice, scribe, and judge.

- **Surface:** `CreateDungeonMaster(roomViewGenerator)` → `DungeonMaster` with `Resolve(text)` and `Narrate(eventText)`.
- **Owns:** resolving a player's free text into a structured verdict — `execute` (carries up to 6 structured actions: `intent` / `target_type` / `target_id` / `direction` / `detail` / `resource`), `not_allowed` (reason), or `ambiguous` (question + guesses) — narrating decided outcomes as single-shot prose, and the run's recent-exchanges transcript.
- **Key rules:**
  - Called on **action intake** (`Resolve`) and **after resolution** (`Narrate`). It never decides outcomes — `execute` actions go to procedural-engine, which resolves them.
  - Never owns game state; it reads through `roomViewGenerator`, it can't mutate anything.
  - If the model output fails to parse, `Resolve` falls back to `not_allowed`; a session never blocks on the AI.
- **Notes:** the model is currently bound to Groq (`openai/gpt-oss-120b`, structured-output `jsonMode`) inside `CreateDungeonMaster`; the swappable-provider port is not implemented yet.

## Procedural Engine

Every number in the game comes from here — the single source of randomness and the solver of outcomes.

- **Owns:** the seeded RNG and everything derived from it: dungeon generation, scene selection, boss selection, difficulty classes (DCs), dice rolls, AGI tie-break order, party-size scaling — and **resolving validated actions** into deterministic outcomes (damage, success/failure, side effects). GameRoom hands it validated actions ([[Mechanics/Action Validation]]) and gets results back.
- **Key rule:** *all* `roll()` calls and outcome math route through it. GameRoom never rolls directly, which is what makes "same seed + same party = same run" reproducible.
- **Pure:** no I/O, no AI, no side effects. Inputs in, outputs out. Deterministic for a given seed — trivially unit-testable and safe to call from anywhere.
- **Not random at runtime:** seeding is fixed at run start (from the expedition), so within one run it behaves like a deterministic generator the GameRoom consumes.
