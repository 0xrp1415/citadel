

How players act in a turn-based, text-based encounter.

## The idea

Encounters are **turn-based and text-based**. Each round the party shares **3 moves**, freely allocated among players; AGI breaks ties when moves resolve together ([[Mechanics/Resolution]]). When you act you type what you do. That free text is structured through **Action Tools** so the engine and AI agree on intent:

```json
{
  "intent": "attack|defend|aid|interact|move|negotiate|use_item|use_ability",
  "target": "enemy|ally|object|self|location",
  "detail": "what the player says or does",
  "resource": { "type": "item|spell|none", "id": "" }
}
```

## Fields

| Field | Purpose |
|---|---|
| **intent** | What kind of action it is |
| **target** | Who or what it's aimed at |
| **detail** | The free-text description of what happens |
| **resource** | Any item/spell/ability tied to the action |

## Rules

- **`use_ability`** triggers a learned ability ([[Mechanics/Abilities]])
- In battle, an active ability's **mana cost** attaches to the action ([[Mechanics/Mana]])
- Outside battle, actives are free
- **Each action spends 1 move** from the party's 3-move round budget ([[Mechanics/Resolution]]); at most 3 actions per round
- The schema keeps the AI honest: it validates the structure, then the [[Mechanics/Action Validation]] step judges scene-sense

See also: [[Mechanics/Mechanics]] · [[Mechanics/Resolution]]
