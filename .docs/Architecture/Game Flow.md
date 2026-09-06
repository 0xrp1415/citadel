How a session of Citadel plays, from expedition setup to run end.

## 1. Form an expedition

```
Init game → name the expedition → pick size & region → expedition code
```

- Instead of a bare room, you **form an expedition**: give it a name, choose party size, and pick which region of the Citadel you'll descend
- The server issues a short **expedition code** to share

## 2. Join an expedition

```
Enter name → enter the expedition code → join
```

- Joiners enter a name (creating their player) and the **expedition code**
- They land at the staging grounds

## 3. The staging grounds (lobby)

```
Staging grounds → pick starter kit → customize stats → ready? → the gate opens
```

- A themed staging area at the Citadel's entrance, not a bare lobby
- Players choose a **starter kit** (gear, consumables, abilities) and allocate bonus stats
- The expedition **leader opens the gate** to start the run
- Keyboard: arrow keys navigate kit selection, Space/Enter toggles ready

## 4. The run

```
Run (procedural engine) → generate dungeons → dungeon index = 1
```

- The procedural engine generates a **dungeon** (a map) that climbs in difficulty with each cleared dungeon
- The run is an **endless descent** — it only ends when the whole party is wiped

## 5. Stasis (start of every dungeon)

```
Stasis → rest → spend stat points → merchant → the descent begins
```

- Every dungeon **starts at a grace room** — a sanctuary checkpoint where the party rests
- Extra graces can **also be found in between dungeons**
- At stasis: restore HP, spend banked stat points ([[Mechanics/Leveling]]), visit the **merchant** ([[Mechanics/Stasis]])
- **Downed players are auto-revived** to full HP on entering a grace room

## 6. Dungeon loop (per dungeon)

```
AI narrates the scene
    ↓
Turn begins — initiative sorted by AGI:
    each living player takes one action per turn
    ↓
AI resolves each action:
    execute           → accept the structured actions, move on
    not_allowed       → deny action (reason shown)
    ambiguous         → return for clarification (question + guesses)
    ↓
Roll die → process action → enemies respond
    ↓
Narrate outcome (first person)
    ↓
Encounters clear → loot drops + XP awards → final boss
    ↓
Boss defeated? → next dungeon (starts at grace) or continue
```

## 7. Run end

```
Party wiped → run ends → Tactical Archive → accept → back to lobby
```

- The run ends **only when the whole party is downed**
- The **Tactical Archive** shows: run summary, player stats, loot found, XP earned
- All players must **accept** to return to the lobby
- The party returns to the lobby for another run

---

Related: [[Mechanics/Mechanics]] covers how actions, stats, and resolution work.
