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
Staging grounds → customize characters → ready? → the gate opens
```

- A themed staging area at the Citadel's entrance, not a bare lobby
- Players customize their characters and mark themselves **ready**
- The expedition **leader opens the gate** to start the run

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

- Every dungeon **starts at a stasis** room — a Grace-like checkpoint where the party rests
- Extra graces can **also be found in between dungeons**
- At stasis: restore HP, spend banked stat points ([[Mechanics/Leveling]]), and visit the **merchant** ([[Mechanics/Stasis]])

## 6. Dungeon loop (per dungeon)

```
AI narrates the scene
    ↓
Turn begins — the party shares 3 moves per round:
    players allocate them freely; AGI breaks ties
    ↓
AI validates each action:
    valid             → accept to move on
    ambiguous         → deny action (reason shown)
    needs more detail → return for clarification
    ↓
Roll die → process party (AGI breaks ties) → monsters respond
    ↓
Narrate outcome (first person)
    ↓
Fainted? → downed handling / continue
    ↓
Encounters clear → final boss
    ↓
Boss defeated? → next dungeon (starts at stasis) or continue
```

## 7. Run end

```
Party wiped → run ends → display stats → back to lobby
```

- The run ends **only when the whole party is downed**
- Session stats: dungeons cleared, damage dealt, actions taken, survivors
- The party returns to the lobby for another run

---

Related: [[Mechanics/Mechanics]] covers how actions, stats, and resolution work.
