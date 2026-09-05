import { getItemById, IItem, IGear, SCROLL_ITEMS } from "../../procedural-engine/index.js";
import { PlayerRunEntityArmor, PlayerRunEntityItem, PlayerRunEntityWeapon } from "./types.js";

export const toArmorPiece = (gear: IGear, gear_position: "head" | "chest" | "greaves"): PlayerRunEntityArmor => ({
    armorId: gear.id,
    armorName: gear.name,
    description: gear.description,
    stats: gear.metadata.stats,
    gear_position,
    rarity: gear.rarity,
});

export const toWeapon = (gear: IGear): PlayerRunEntityWeapon => ({
    weaponId: gear.id,
    weaponName: gear.name,
    description: gear.description,
    stats: gear.metadata.stats,
    rarity: gear.rarity,
});

export const toItem = (item: IItem): PlayerRunEntityItem => {
    const base = {
        id: item.id,
        name: item.name,
        description: item.description,
        type: item.type,
        rarity: item.rarity,
        stackable: item.stackable,
        buyPrice: item.buyPrice,
    };
    if (item.type === "gear") {
        return {
            ...base,
            slot: item.metadata.slot,
            stats: item.metadata.stats,
            required_stats: item.metadata.required_stats,
        };
    }
    if (item.type === "scroll") {
        return {
            ...base,
            ability: item.metadata.ability.name,
            ability_description: item.metadata.ability.flavor_text,
        };
    }
    return base;
};

export const BASE_MAX_PLAYER_BASE_STAT = 40;
export const BASE_PLAYER_HP = 50;

export const DefaultSkillPoints = (): number => 50;
export const DefaultGold = (): number => 200;

// A starter kit for testing the inventory and gear flows: carried (unequipped) gear,
// HEALING + utility consumables, and ability scrolls. war_hammer's strength 26 gate
// deliberately exceeds the 20 base, so the blocked-equip state is testable.
const STARTING_ITEM_IDS = [
    "health_potion",
    "health_potion",
    "health_potion",
    "gold_key",
    "lockpick",
    "rusty_dagger",
    "wooden_helmet",
    "iron_chestplate",
    "cloth_wraps",
    "war_hammer",
] as const;

export const DefaultStartingInventory = (): IItem[] => {
    const items: IItem[] = [];
    for (const id of STARTING_ITEM_IDS) {
        const item = getItemById(id);
        if (item) {
            items.push(item);
        }
    }
    for (const scroll of SCROLL_ITEMS) {
        items.push(scroll);
    }
    return items;
};