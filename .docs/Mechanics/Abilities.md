Abilities come from **scrolls** — and only scrolls.

```
scroll found during run
   ↓
any party member may claim it
   ↓
ability learned for THIS RUN only
```

## Acquisition rules

- **Obtained only via scrolls** — never given at start
- **Run-scoped** — the ability and the scroll vanish when the run ends
- Any party member may claim a scroll; first-come claims it

## Types

| Type | Behaviour |
|---|---|
| **Passive** | Always active, no cost |
| **Active** | Costs **mana in battle**; **free outside battle** |

## Limits & usage

- **Slots** — each character holds a limited set *(1 active + 2 passive)*
- **In battle** — actives trigger via `use_ability` and draw from the mana pool ([[Mechanics/Mana]])
- **Out of battle** — actives are free to use, still via `use_ability`
- Abilities can be used in both combat and narration/exploration scenes

See also: [[Mechanics/Mechanics]] · [[Mechanics/Mana]] · [[Mechanics/Action Tools]]
