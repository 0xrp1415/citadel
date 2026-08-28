The Citadel judges every action before it resolves.

## Verdicts

| Verdict | Meaning | Result |
|---|---|---|
| **Execute** | Actionable in the current scene | Accepted → resolution; carries up to 6 structured actions |
| **Not allowed** | References something absent from the room facts or plainly impossible | Denied → player resubmits (reason given) |
| **Ambiguous** | Unclear intent or target | Returned for clarification (optional question + guesses) |

## Single structured-output check

The dungeon-master resolves once: it reads the room facts, produces a structured verdict, and the verdict schema (`execute` / `not_allowed` / `ambiguous`) machine-validates the action shapes (intent, target, direction, resource). If the model's output fails to parse, the verdict falls back to `not_allowed`.

## Fallback rule

If the AI is down, the **schema check alone** decides. A session never blocks on the AI — a denied action is always replayable by the player.

## Move budget

- The party has **3 moves per round** ([[Mechanics/Resolution]]); each action spends 1
- An action submitted when the round's moves are gone is **denied** ("no moves remain this round") — the player can act again next round

## Why it matters

Validation is what makes free-text play work in a multiplayer room: it stops nonsense actions from polluting the shared run while keeping the text-first feel.

See also: [[Mechanics/Mechanics]] · [[Mechanics/Action Tools]]
