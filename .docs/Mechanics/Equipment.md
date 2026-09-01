Every character starts with **no gear equipped**. Weapons and armor are found or bought as the run goes, entering the carried inventory first and then equipped from there.

## Slots

| Slot | Start | During the run |
|---|---|---|
| **Weapon** | — | Find better drops, or buy from the merchant |
| **Head** | — | Find better drops, or buy from the merchant |
| **Chest** | — | Find better drops, or buy from the merchant |
| **Greaves** | — | Find better drops, or buy from the merchant |

## Drops

- Better gear **drops in any room** (from encounters) and targets a specific slot
- Find a better piece → **equip it** from your inventory; the current piece in that slot returns to your carried inventory
- Unknown/dropped gear goes into the carried inventory (`PlayerInventory.inventory` as an `IGear` entry) before it can be equipped
- **Requirements** — each gear piece has a `required_stats` gate (a minimum in its primary stat, scaling with rarity); the piece can't be equipped until the member's effective stats meet it

## How gear works

- Gear grants **flat bonuses** to the relevant stats via `metadata.stats`
- Bonuses are applied/removed on the combat entity by `onEquip`/`onUnequip`, folding into the `d20 + stat + modifiers` roll (see [[Mechanics/Resolution]])
- Equipping a piece runs `onEquip(entity)` (adds its stat bonus); unequipping runs `onUnequip(entity)` (removes it)
- Each piece is tracked separately — weapon, head, chest, and greaves each carry their own stat bonus (see [[Mechanics/Characters]])

## Gold

- Gold comes from **encounter rewards** (and selling your equipped gear at the merchant)
- Spend gold at the **merchant** in [[Mechanics/Stasis]] — buy/sell only, **no upgrades**

## Rules

- Weapon bonus applies to attack checks (STR / INT depending on the weapon)
- Each armor piece's bonus applies to defense checks (DEX / WIS depending on the piece)
- Swapping replaces the piece in that slot; unequipped gear lives in the carried inventory alongside consumables (see [[Mechanics/Items]])
- Gear is **run-scoped** — it resets when the run ends, like characters

See also: [[Mechanics/Mechanics]] · [[Mechanics/Characters]] · [[Mechanics/Stasis]]
