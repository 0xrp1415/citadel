Abilities come from **scrolls** — and only scrolls.

> **Status:** the ability **system** is implemented (97 abilities across 6 stat trees, with active/passive behaviour, components, and targeting). Scroll **acquisition** in-run is *not yet wired*.

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
| **Active** | Costs a resource per use |

## Limits & usage

- **Slots** — each character holds a limited set *(1 active + 2 passive)*
- **In battle** — actives trigger via `use_ability`
- **Out of battle** — actives are free to use, still via `use_ability`
- Abilities can be used in both combat and narration/exploration scenes

See also: [[Mechanics/Mechanics]] · [[Mechanics/Action Tools]]
