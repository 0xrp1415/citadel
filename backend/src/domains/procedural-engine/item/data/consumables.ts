import { IConsumable } from "../consumable.js";

export const CONSUMABLE_ITEMS: IConsumable[] = [
    {
        id: "health_potion",
        name: "Health Potion",
        description: "A bubbling red potion that restores 20 HP when drunk.",
        stackable: true,
        maxStackQty: 8,
        rarity: { name: "common", rarityLevel: 1 },
        buyPrice: 25,
        type: "consumable",
        equipable: false,
        useable: true,
    },
    {
        id: "gold_key",
        name: "Gold Key",
        description: "A gleaming key that may open sealed chests and doors.",
        stackable: true,
        maxStackQty: 4,
        rarity: { name: "uncommon", rarityLevel: 2 },
        buyPrice: 60,
        type: "consumable",
        equipable: false,
        useable: true,
    },
    {
        id: "lockpick",
        name: "Lockpick",
        description: "A slender pick for forcing stubborn locks.",
        stackable: true,
        maxStackQty: 4,
        rarity: { name: "common", rarityLevel: 1 },
        buyPrice: 40,
        type: "consumable",
        equipable: false,
        useable: true,
    },
];

export function getConsumableById(id: string): IConsumable | undefined {
    return CONSUMABLE_ITEMS.find((item) => item.id === id);
}