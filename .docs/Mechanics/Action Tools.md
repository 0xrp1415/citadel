

How players act in a turn-based, text-based encounter.

## The idea

Encounters are **turn-based and text-based**. Each round, every living player takes a turn in initiative order (sorted by AGI). On your turn, you choose one action — attack, defend, or use an ability. When you act, you select from the combat grid buttons or type free text. The dungeon-master resolves that free text into a structured verdict carrying **Action Tools** so the engine and AI agree on intent:

```json
{
  "intent": "move|rest|use_item|look|use_ability|challenge",
  "target_type": "enemy|ally|object|self|location",
  "target_id": ["..."] ,
  "direction": "north|south|east|west",
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
| **direction** | Required for `move` and `challenge` — must be a listed exit |
| **detail** | The free-text description of what happens |
| **resource** | Any item/spell/ability tied to the action |

## Combat actions

During combat, players select from the combat grid:

| Action | Effect |
|---|---|
| **Attack** | Basic attack — select a foe target |
| **Defend** | Reduce incoming damage, redirect enemy targeting |
| **Ability** | Use a learned active ability — select a foe or ally target |

## Rules

- **`use_ability`** triggers a learned ability ([[Mechanics/Abilities]])
- **`use_item`** spends a tracked consumable ([[Mechanics/Items]])
- **`challenge`** attempts the trial barring a locked passage — a combat, puzzle, or physical feat
- **Each player gets one action per turn** in initiative order
- **Downed players** (0 HP) are skipped — they cannot act
- **Dead players** cannot act, pick up items, or interact with gear/merchant
- The verdict schema keeps the AI honest: it validates the structured actions, then the [[Mechanics/Action Validation]] step decides acceptability against the room facts

See also: [[Mechanics/Mechanics]] · [[Mechanics/Resolution]]
