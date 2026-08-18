import { PlayerRunEntity, PlayerRunEntityArmors, PlayerRunEntityWeapon } from "../game-room/player.js";
import { EntityStats } from "../procedural-engine/domain.js";
import { IGameRoomConfig } from "./types.js";

export const DEFAULT_GAME_ROOM_CONFIG_GENERATOR = (): IGameRoomConfig => ({
    maxPlayers: 4,
    seed: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    difficulty: "medium",
    mapSize: "medium",
});

export const DEFAULT_ARMOUR_GENERATOR = (): PlayerRunEntityArmors => ({
    head: {
        armorId: "wooden_helmet",
        armorName: "Wooden Helmet",
        description: "A simple wooden helmet.",
        stats: {
            hp: 0,
            strength: 0,
            dexterity: 0,
            intelligence: 0,
            wisdom: 0,
            agility: 0
        },
        gear_position: "head"
    },
    chest: {
        armorId: "wooden_chest",
        armorName: "Wooden Chestplate",
        description: "A simple wooden chestplate.",
        stats: {
            hp: 0,
            strength: 0,
            dexterity: 0,
            intelligence: 0,
            wisdom: 0,
            agility: 0
        },
        gear_position: "chest"
    },
    greaves: {
        armorId: "wooden_greaves",
        armorName: "Wooden Greaves",
        description: "A simple wooden leg armor.",
        stats: {
            hp: 0,
            strength: 0,
            dexterity: 0,
            intelligence: 0,
            wisdom: 0,
            agility: 0
        },
        gear_position: "greaves"
    }
});

export const DEFAULT_WEAPON_GENERATOR = (): PlayerRunEntityWeapon => ({
    weaponId: "weapon_default_bat",
    weaponName: "Bat",
    description: "A simple wooden bat.",
    stats: {
        hp: 0,
        strength: 0,
        dexterity: 0,
        intelligence: 0,
        wisdom: 0,
        agility: 0
    },
});

export const NullStatsGenerator = (): EntityStats => (new EntityStats({
    hp: 0,
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    wisdom: 0,
    agility: 0
}));

export const GameRoomEntityStatsDefaults = (): PlayerRunEntity => (new PlayerRunEntity({
    hp: 20,
    strength: 20,
    dexterity: 20,
    intelligence: 20,
    wisdom: 20,
    agility: 20
}, DEFAULT_ARMOUR_GENERATOR(), DEFAULT_WEAPON_GENERATOR())); 