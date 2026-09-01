Consumables are carried items in the tower — single-use items stored in the party member's inventory alongside gear, tracked as item entries (with per-item counts when stacked).

## What exists

| Item | Effect |
|---|---|
| **Health potion** (`health_potion`) | Restores 20 HP when used; in battle it costs 1 move, outside battle it's free |
| **Gold key** (`gold_key`) | Opens sealed doors and chests in scenes |
| **Lockpick** (`lockpick`) | Bypasses locked doors and chests in scenes |

## Rules

- **An item list, not plain counts** — consumables are `IItem`s in `PlayerInventory.inventory`; each entry has an `id`, `name`, description, rarity, and `stackable`/`maxStackQty`. The sheet serializes them into `items`, and `consumables` counts are derived from that list for the DM view (see [[Mechanics/Equipment]])
- **Run-scoped** — consumables vanish when the run ends, like characters
- **Acquisition** — from encounter rewards and scene finds; nothing is carried at start (no free starter kit)
- **Usage** — spent via `use_item` ([[Mechanics/Action Tools]]) or the inventory modal's use action; `health_potion` is consumed on use, keys and lockpicks are shown but not consumed
- **Gear gates** — every gear piece carries `required_stats` (a minimum stat gate) alongside its `stats` bonus; equipping an item requires the party member's effective stats to meet the gate, and the combat entity applies/removes the stat bonus on equip/unequip
- **In battle**, using a consumable spends 1 move from the party's round budget ([[Mechanics/Resolution]])

> Keys and lockpicks pair with the `interact` intent — doors and chests are opened by describing what you do.

See also: [[Mechanics/Mechanics]] · [[Mechanics/Equipment]] · [[Mechanics/Action Tools]]