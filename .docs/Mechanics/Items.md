Consumables and other items carried in the tower — single-use or gear stored in the party member's inventory, tracked as item entries (with per-item counts when stacked).

## What exists

| Item | Effect |
|---|---|
| **Health potion** (`health_potion`) | Restores 20 HP when used; in battle it costs 1 move, outside battle it's free |
| **Gold key** (`gold_key`) | Opens sealed doors and chests in scenes |
| **Lockpick** (`lockpick`) | Bypasses locked doors and chests in scenes |

## Items on the ground

- Items dropped from combat rewards or room loot land **on the ground** in the current room
- Any living player can **pick up** items from the ground via the dropped items panel in the right rail
- **Dead players** cannot pick up items
- Items are visible to all players — first-come, first-served
- Scroll items (from loot tables) can also be picked up and used to learn abilities

## Inventory model

- Items are stored as `IItem` entries in `PlayerInventory.inventory`
- Each entry has an `id`, `name`, description, rarity, and `stackable`/`maxStackQty`
- Stackable items (potions, keys, lockpicks) merge into a single entry with a count
- Non-stackable items (gear, scrolls) each get their own entry
- The sheet serializes them into `items`; `consumables` counts are derived from that list for the DM view

## Rules

- **Run-scoped** — items vanish when the run ends, like characters
- **Acquisition** — from encounter rewards, room loot, and the merchant; starter kits provide starting consumables
- **Usage** — spent via `use_item` ([[Mechanics/Action Tools]]) or the inventory modal's use action; `health_potion` is consumed on use, keys and lockpicks are shown but not consumed
- **Gear gates** — every gear piece carries `required_stats` (a minimum stat gate) alongside its `stats` bonus; equipping an item requires the party member's effective stats to meet the gate, and the combat entity applies/removes the stat bonus on equip/unequip

> Keys and lockpicks pair with the `interact` intent — doors and chests are opened by describing what you do.

See also: [[Mechanics/Mechanics]] · [[Mechanics/Equipment]] · [[Mechanics/Action Tools]]
