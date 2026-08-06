How a request moves through the system, from the browser to a resolved outcome.

## Entry (REST)

```
Client → REST → user (register/identify) → GameRoom (create/join expedition)
```

- **Register/identify** — the client proves who it is and gets a token
- **Create expedition** — the leader names it, sets party size and region, gets an **expedition code**
- **Join expedition** — a user enters their name and the code, becomes a player
- **Character creation** — player submits their stat allocation at the staging grounds

REST handles routing only; once a player is in a room, everything live moves to Socket.io.

## Live events (Socket.io)

Every in-room event is a socket message. The canonical loop:

```
Client → GameRoom (action intake)
              ↓
       dungeon-master (structure + validate) ← free text → Action Tool
              ↓  valid
       procedural-engine (resolve) → deterministic outcome
              ↓
       dungeon-master (narrate) → streamed prose
              ↓
       GameRoom → all clients (scene update, result)
```

## The action pipeline (per round)

1. A player submits **free text** (e.g. "I slash the goblin's flank with my axe")
2. **dungeon-master** structures it into an Action Tool and judges scene-sense ([[Mechanics/Action Validation]])
   - `valid` → on to resolution
   - `ambiguous` / `needs_more_detail` → denied, returned to the player
   - AI down → schema-only fallback
3. **procedural-engine** rolls `d20 + stat + modifiers` vs DC and returns the deterministic result
4. **dungeon-master** narrates the decided outcome; GameRoom broadcasts it

## Who sees what

- **GameRoom** is the authority — every event lands here first, then fans out to clients
- **dungeon-master** and **procedural-engine** are passive: they answer calls from GameRoom, never push on their own
- Clients never talk to the engine or the AI directly

See also: [[Architecture/Architecture]] · [[Mechanics/Action Tools]]
