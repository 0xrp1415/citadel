import { IEntityHealthStatGetters, IStats } from "../../procedural-engine/index.js";

export type PlayerStatus =
    | "joined"
    | "connected"
    | "ready"
    | "disconnected"
    | "left"
    | "in-run";

export type PlayerRunEntityArmor = {
    armorId: string;
    stats: IStats;
    description: string;
    gear_position: "head" | "chest" | "greaves";
    armorName: string;
};

export type PlayerRunEntityWeapon = {
    weaponId: string;
    weaponName: string;
    description: string;
    stats: IStats;
};

export type PlayerRunEntityArmors = {
    head: PlayerRunEntityArmor;
    chest: PlayerRunEntityArmor;
    greaves: PlayerRunEntityArmor;
};

export type ConsumableType = "health_potion" | "gold_key" | "lockpick";
export type Consumables = Record<ConsumableType, number>;

export const DefaultConsumablesGenerator = (): Consumables => ({
    health_potion: 0,
    gold_key: 0,
    lockpick: 0
});

export type PlayerRunEntityJSON = {
    base_stats: IStats;
    stat_modifiers: IStats;
    armor_stats: PlayerRunEntityArmors;
    weapon_stats: PlayerRunEntityWeapon;
    level: number;
    experience: number;
    skill_points: number;
    gold: number;
    consumables: Consumables;
    health: IEntityHealthStatGetters;
};

export interface PlayerPublic {
    playerId: string;
    name: string;
    status: PlayerStatus;
    isHost: boolean;
    disconnectedAt: number | null;
    stats: PlayerRunEntityJSON;
}
