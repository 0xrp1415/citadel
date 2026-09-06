import { EntityCombat, IStats, IGear, IItem } from "../../procedural-engine/index.js";
import { PlayerAbilities } from "./abilities.js";
import { Consumables } from "./types.js";

export const POTION_HEAL = 20;

const GEAR_SLOTS = ["head", "chest", "greaves"] as const;
export type TGearSlot = "weapon" | "head" | "chest" | "greaves";

export class PlayerInventory {
    private gold: number;

    private inventory: [IItem, number][];

    private gear: Record<"head" | "chest" | "greaves", IGear | null>;
    private weapon: IGear | null;

    constructor(initialGold: number = 0) {
        this.gold = initialGold;
        this.inventory = [];
        this.gear = { head: null, chest: null, greaves: null };
        this.weapon = null;
    }

    public get Gold(): number {
        return this.gold;
    }

    public get Inventory(): [IItem, number][] {
        return this.inventory;
    }

    public get Gear(): Record<"head" | "chest" | "greaves", IGear | null> {
        return this.gear;
    }

    public get Weapon(): IGear | null {
        return this.weapon;
    }


    public addGold(amount: number): void {
        this.gold += amount;
    }

    public removeGold(amount: number): boolean {
        if (this.gold < amount) {
            return false;
        }
        this.gold -= amount;
        return true;
    }


    public addItem(item: IItem, qty: number = 1): void {
        if (item.stackable) {
            const entry = this.inventory.find(([i]) => i.id === item.id);
            if (entry) {
                entry[1] = Math.min(entry[1] + qty, item.maxStackQty);
                return;
            }
        }
        this.inventory.push([item, qty]);
    }

    public removeItem(item: IItem, qty: number = 1): boolean {
        const index = this.inventory.findIndex(([i]) => i.id === item.id);
        if (index === -1) return false;
        const entry = this.inventory[index]!;
        entry[1] -= qty;
        if (entry[1] <= 0) {
            this.inventory.splice(index, 1);
        }
        return true;
    }

    public CountOf(id: string): number {
        let count = 0;
        for (const [item, qty] of this.inventory) {
            if (item.id === id) {
                count += qty;
            }
        }
        return count;
    }

    public get Consumables(): Consumables {
        return {
            health_potion: this.CountOf("health_potion"),
            gold_key: this.CountOf("gold_key"),
            lockpick: this.CountOf("lockpick"),
        };
    }

    private EquipGear(gear: IGear, stats: IStats, entity: EntityCombat): boolean {
        const required = gear.metadata.required_stats;
        for (const stat of Object.keys(required) as (keyof IStats)[]) {
            if (stats[stat] < required[stat]) {
                return false;
            }
        }

        if (gear.metadata.slot === "weapon") {
            const previous = this.weapon;
            if (previous) {
                previous.metadata.onUnequip(entity);
                this.inventory.push([previous, 1]);
            }
            this.weapon = gear;
            gear.metadata.onEquip(entity);
        } else if (GEAR_SLOTS.indexOf(gear.metadata.slot) !== -1) {
            const slot = gear.metadata.slot;
            const previous = this.gear[slot];
            if (previous) {
                previous.metadata.onUnequip(entity);
                this.inventory.push([previous, 1]);
            }
            this.gear[slot] = gear;
            gear.metadata.onEquip(entity);
        } else {
            return false;
        }
        return true;
    }

    public Equip(stats: IStats, index: number, entity: EntityCombat): boolean {
        if (index < 0 || index >= this.inventory.length) {
            return false;
        }
        const [item] = this.inventory[index]!;
        if (!item || item.type !== "gear") {
            return false;
        }
        if (!this.EquipGear(item as IGear, stats, entity)) {
            return false;
        }
        this.inventory.splice(index, 1);
        return true;
    }

    public Unequip(slot: TGearSlot, entity: EntityCombat): boolean {
        if (slot === "weapon") {
            if (!this.weapon) {
                return false;
            }
            this.weapon.metadata.onUnequip(entity);
            this.inventory.push([this.weapon, 1]);
            this.weapon = null;
            return true;
        }
        const piece = this.gear[slot];
        if (!piece) {
            return false;
        }
        piece.metadata.onUnequip(entity);
        this.inventory.push([piece, 1]);
        this.gear[slot] = null;
        return true;
    }

    public useItem(id: string, entity: EntityCombat, abilities?: PlayerAbilities): boolean {
        if (id === "health_potion") {
            const index = this.inventory.findIndex(
                ([item]) => item.id === "health_potion" && item.type === "consumable"
            );
            if (index === -1) return false;
            const entry = this.inventory[index]!;
            entry[1] -= 1;
            if (entry[1] <= 0) {
                this.inventory.splice(index, 1);
            }
            entity.changeHealthBy(POTION_HEAL);
            return true;
        }
        if (abilities) {
            const index = this.inventory.findIndex(
                ([item]) => item.id === id && item.type === "scroll"
            );
            if (index === -1) return false;
            const [scroll] = this.inventory[index]!;
            if (!scroll || scroll.type !== "scroll") return false;
            this.inventory.splice(index, 1);
            abilities.learn(scroll.metadata.ability);
            return true;
        }
        return this.CountOf(id) > 0;
    }
}
