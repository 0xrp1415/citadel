Every character starts with a **starter kit** — gear, consumables, and starting abilities. Additional gear is found or bought as the run goes, entering the carried inventory first and then equipped from there.

## Starter kits

| Kit | Description | Gear | Consumables | Abilities |
|---|---|---|---|---|
| **Vanguard** | Heavy armor and blade. Frontline fighter. | iron_sword, iron_helm, iron_chestplate, iron_greaves | 2× health potion, 1× lockpick | iron_thews, mend_wounds |
| **Blade** | Swift steel and keen eyes. Strikes fast. | steel_dagger, leather_cap, leather_vest, leather_boots | 2× health potion, 1× lockpick | swift_step, dodge |
| **Shadow** | Light and cunning. Hard to pin down. | short_bow, hood, cloak, boots | 2× health potion, 1× lockpick | fleet_foot, dodge |
| **Arcane** | Ranged power. Devastating at distance. | oak_staff, cloth_hat, cloth_robe, cloth_shoes | 2× health potion, 1× lockpick | arcane_bolt, learned_lore |
| **Wanderer** | Balanced. No gear, no training. Finds a way. | club, rags, rags, sandals | 3× health potion | grit, clarity |

## Slots

| Slot | Start | During the run |
|---|---|---|
| **Weapon** | From kit | Find better drops, or buy from the merchant |
| **Head** | From kit | Find better drops, or buy from the merchant |
| **Chest** | From kit | Find better drops, or buy from the merchant |
| **Greaves** | From kit | Find better drops, or buy from the merchant |

## Drops

- Better gear **drops from combat encounters** (via the loot table system) and targets a specific slot
- Items land **on the ground** — any player can pick them up
- Find a better piece → **equip it** from your inventory; the current piece in that slot returns to your carried inventory
- Unknown/dropped gear goes into the carried inventory (`PlayerInventory.inventory` as an `IGear` entry) before it can be equipped
- **Requirements** — each gear piece has a `required_stats` gate (a minimum in its primary stat, scaling with rarity); the piece can't be equipped until the member's effective stats meet it

## Loot tables

- Combat encounters drop items via seeded loot tables
- Rarity tiers: **common → uncommon → rare → epic → legendary**
- Rarity weights shift with depth: deeper floors yield rarer items
- **Treasure and secret rooms** also award loot on entry
- Gold is awarded alongside items from encounter rewards

## How gear works

- Gear grants **flat bonuses** to the relevant stats via `metadata.stats`
- Bonuses are applied/removed on the combat entity by `onEquip`/`onUnequip`, folding into the `d20 + stat + modifiers` roll (see [[Mechanics/Resolution]])
- Equipping a piece runs `onEquip(entity)` (adds its stat bonus); unequipping runs `onUnequip(entity)` (removes it)
- Each piece is tracked separately — weapon, head, chest, and greaves each carry their own stat bonus (see [[Mechanics/Characters]])

## Gold

- Gold comes from **encounter rewards** and **selling items** at the merchant
- Spend gold at the **merchant** in grace rooms ([[Mechanics/Stasis]]) — buy gear, consumables, and scrolls
- Sell price = **50% of buy price**

## Rules

- Weapon bonus applies to attack checks (STR / INT depending on the weapon)
- Each armor piece's bonus applies to defense checks (DEX / WIS depending on the piece)
- Swapping replaces the piece in that slot; unequipped gear lives in the carried inventory alongside consumables (see [[Mechanics/Items]])
- Gear is **run-scoped** — it resets when the run ends, like characters

See also: [[Mechanics/Mechanics]] · [[Mechanics/Characters]] · [[Mechanics/Stasis]]
