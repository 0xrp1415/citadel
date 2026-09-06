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

## Vote gating

- Actions that advance the run (moving to a new room) require a **party vote**
- Every connected (socket-alive) player must vote yes for the action to proceed
- The vote has a time limit; uncast votes default to no

## Why it matters

Validation is what makes free-text play work in a multiplayer room: it stops nonsense actions from polluting the shared run while keeping the text-first feel.

See also: [[Mechanics/Mechanics]] · [[Mechanics/Action Tools]]
