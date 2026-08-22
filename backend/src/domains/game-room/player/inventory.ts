import { ConsumableType, Consumables, DefaultConsumablesGenerator } from "./types.js";

export class PlayerInventory {
    private gold: number;
    private consumables: Consumables;

    constructor(initialGold: number = 200) {
        this.gold = initialGold;
        this.consumables = DefaultConsumablesGenerator();
    }

    public changeGoldBy(amt: number): boolean {
        if (this.gold + amt < 0) {
            return false;
        }
        this.gold += amt;
        return true;
    }

    public ChangeConsumable(consumable: ConsumableType, quantity: number): boolean {
        const newCount = this.consumables[consumable] + quantity;
        if (newCount < 0) {
            return false;
        }
        this.consumables[consumable] = newCount;
        return true;
    }

    public get Gold(): number {
        return this.gold;
    }

    public get Consumables(): Consumables {
        return this.consumables;
    }
}
