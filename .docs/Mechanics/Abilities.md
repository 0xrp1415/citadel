Abilities come from **starter kits** and **scrolls** found in the dungeon.

## Acquisition

### Starter kits
- Each kit grants **2 starting abilities** — one active, one passive
- Vanguard: iron_thews, mend_wounds
- Blade: swift_step, dodge
- Shadow: fleet_foot, dodge
- Arcane: arcane_bolt, learned_lore
- Wanderer: grit, clarity

### Scrolls
- Scrolls are found as **loot drops** during the run
- Scroll items appear in the dungeon; pick one up and use it to learn the ability
- Any party member may claim a scroll; first-come claims it
- **Run-scoped** — the ability and the scroll vanish when the run ends

```
scroll found during run
   ↓
pick up from ground
   ↓
use from inventory
   ↓
ability learned for THIS RUN only
```

## Types

| Type | Behaviour |
|---|---|
| **Passive** | Always active, no cost |
| **Active** | Costs a resource per use |

## Limits & usage

- **Slots** — each character holds a limited set *(1 active + 2 passive)*
- **In battle** — actives trigger via combat grid or `use_ability`
- **Out of battle** — actives are free to use, still via `use_ability`
- Abilities can be used in both combat and narration/exploration scenes

See also: [[Mechanics/Mechanics]] · [[Mechanics/Action Tools]]
