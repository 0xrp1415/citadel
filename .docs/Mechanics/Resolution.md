How a validated action becomes a result — turn-based, text-based.

## Round structure

Each round has two phases:

1. **Party round** — each living player takes a turn in initiative order (sorted by AGI); on your turn, choose one action (attack, defend, or use an ability)
2. **Enemy round** — monsters respond after the party acts

## Initiative

- Initiative is sorted by **AGI** (highest first)
- Players act in order; each living player gets exactly **one action per turn**
- **Downed players** (0 HP) are **skipped** in initiative — they cannot act
- Enemies act after all living players have taken their turn

## The roll

- **Roll die** — `d20 + stat + modifiers` vs a **difficulty class** set by the dungeon
- **Modifiers** come from gear bonuses ([[Mechanics/Equipment]]), abilities ([[Mechanics/Abilities]]), and run-long boons/banes

## Trial challenges

Locked passages are barred by a **trial**: combat, puzzle, or challenge, each gating a specific stat. A player attempts it with the `challenge` action. The engine rolls `d20 + stat` against a **difficulty class** (`8 + difficulty × 4`):

- **combat / puzzle** — the acting member's stat
- **challenge** — the party's average stat

On a success the passage unlocks; on a failure it stays barred and may be retried.

## Resolution steps

1. **Initiative** — sort all living combatants by AGI
2. **Party round** — each living player takes their turn in order (one action each)
3. **Roll die** — `d20 + stat + modifiers` vs the difficulty class
4. **Process action** — deterministic outcome: damage, success/failure, side effects
5. **Enemy round** — monsters respond after all living players have acted
6. **Narrate outcome** — the AI dramatizes the decided result

## Ambush mechanic

- When entering a room with enemies, the party may be **ambushed**
- Ambush check: `d20 + (agility + strength) / 8 ≥ 18 + total threat`
- **Success** — the party acts first in the encounter
- **Failure** — enemies act first (initiative disadvantage)

## Determinism

Outcomes are decided by game logic before the AI speaks. The AI only narrates — it never decides what happened. Same seed, same actions = same results.

See also: [[Mechanics/Mechanics]] · [[Mechanics/Action Tools]]
