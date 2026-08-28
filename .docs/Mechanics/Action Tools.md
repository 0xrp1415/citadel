

How players act in a turn-based, text-based encounter.

## The idea

Encounters are **turn-based and text-based**. Each round the party shares **3 moves**, freely allocated among players; AGI breaks ties when moves resolve together ([[Mechanics/Resolution]]). When you act you type what you do. The dungeon-master resolves that free text into a structured verdict carrying **Action Tools** so the engine and AI agree on intent:

```json
{
  "intent": "attack|defend|aid|interact|move|negotiate|use_item|use_ability",
  "target_type": "enemy|ally|object|self|location",
  "target_id": ["..."] ,
  "direction": "left|right|up|down",
  "detail": "what the player says or does",
  "resource": { "type": "item|spell|none", "id": "" }
}
```

## Fields

| Field | Purpose |
|---|---|
| **intent** | What kind of action it is |
| **target_type** | Who or what it's aimed at |
| **target_id** | Specific ids from the room facts (`target_id` for `move`, targets by id) |
| **direction** | Required for `move` — must be a listed exit |
| **detail** | The free-text description of what happens |
| **resource** | Any item/spell/ability tied to the action |

## Rules

- **`use_ability`** triggers a learned ability ([[Mechanics/Abilities]])
- **`use_item`** spends a tracked consumable ([[Mechanics/Items]])
- In battle, an active ability's **mana cost** attaches to the action ([[Mechanics/Mana]])
- Outside battle, actives are free
- **Each action spends 1 move** from the party's 3-move round budget ([[Mechanics/Resolution]]); at most 3 actions per round
- The verdict schema keeps the AI honest: it validates the structured actions, then the [[Mechanics/Action Validation]] step decides acceptability against the room facts

See also: [[Mechanics/Mechanics]] · [[Mechanics/Resolution]]
