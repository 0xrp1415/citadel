The Citadel judges every action before it resolves.

## Verdicts

| Verdict | Meaning | Result |
|---|---|---|
| **Valid** | Actionable in the current scene | Accepted → resolution |
| **Ambiguous** | Unclear intent or target | Denied → player resubmits |
| **Needs more detail** | Understandable but underspecified | Returned for clarification |

## Two-stage check

1. **Schema check** — machine-validates the Action Tool structure (intent, target, resource)
2. **Scene-sense check** — the AI (dungeon-master) judges whether the action makes sense in the current scene

## Fallback rule

If the AI is down, the **schema check alone** decides. A session never blocks on the AI — a denied action is always replayable by the player.

## Move budget

- The party has **3 moves per round** ([[Mechanics/Resolution]]); each action spends 1
- An action submitted when the round's moves are gone is **denied** ("no moves remain this round") — the player can act again next round

## Why it matters

Validation is what makes free-text play work in a multiplayer room: it stops nonsense actions from polluting the shared run while keeping the text-first feel.

See also: [[Mechanics/Mechanics]] · [[Mechanics/Action Tools]]
