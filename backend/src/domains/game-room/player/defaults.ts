import { getItemById, IItem, IGear } from "../../procedural-engine/index.js";
import { PlayerRunEntityArmor, PlayerRunEntityItem, PlayerRunEntityWeapon } from "./types.js";
import { StarterKitId, getStarterKit } from "./kits.js";

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

export const toItem = (item: IItem, count: number = 1): PlayerRunEntityItem => {
    const base = {
        id: item.id,
        name: item.name,
        description: item.description,
        type: item.type,
        rarity: item.rarity,
        stackable: item.stackable,
        maxStackQty: item.maxStackQty,
        buyPrice: item.buyPrice,
        count,
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

export const DefaultStartingInventory = (kit: StarterKitId = "wanderer"): IItem[] => {
    const kitData = getStarterKit(kit);
    const items: IItem[] = [];

    if (kitData) {
        for (const slot of ["weapon", "head", "chest", "greaves"] as const) {
            const id = kitData.gear[slot];
            if (id) {
                const item = getItemById(id);
                if (item) items.push(item);
            }
        }
        for (const c of kitData.consumables) {
            const item = getItemById(c.id);
            if (item) {
                for (let i = 0; i < c.qty; i++) {
                    items.push(item);
                }
            }
        }
        for (const abilityId of kitData.abilities) {
            const scroll = getItemById("scroll_" + abilityId);
            if (scroll) items.push(scroll);
        }
    }

    return items;
};