How a validated action becomes a result — turn-based, text-based.

## Round structure

Each round has two phases:

1. **Party round** — the party shares **3 moves**, freely allocated among players
2. **Enemy round** — monsters respond after the party acts

## The 3-move budget

- The party gets **3 moves per round**, split between players however they choose
- **Each action costs 1 move** (attack, ability, item, etc.)
- **AGI only breaks ties** — when moves resolve together, highest AGI goes first. It no longer grants each player a free turn
- Unspent moves are **lost** at round end, then monsters respond
- Rationale: a bounded action economy keeps the fight fair for monsters — a large party can't bury them under unlimited actions

## The roll

- **Roll die** — `d20 + stat + modifiers` vs a **difficulty class** set by the dungeon
- **Modifiers** come from gear bonuses ([[Mechanics/Equipment]]), abilities ([[Mechanics/Abilities]]), and run-long boons/banes

## Resolution steps

1. **Party round** — the party spends its 3 moves; players allocate them freely
2. **Roll die** — `d20 + stat + modifiers` vs the dungeon's difficulty class
3. **Process party** — moves resolve with AGI breaking ties; the engine picks targets
4. **Action result** — deterministic outcome: damage, success/failure, side effects
5. **Enemy round** — monsters respond
6. **Narrate outcome** — the AI dramatizes the decided result

## Determinism

Outcomes are decided by game logic before the AI speaks. The AI only narrates — it never decides what happened. Same seed, same actions = same results.

See also: [[Mechanics/Mechanics]] · [[Mechanics/Action Tools]]
