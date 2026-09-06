import { IEntityHealthStatGetters, IStats, IRarity, TGearSlot } from "../../procedural-engine/index.js";
import { StarterKitId } from "./kits.js";

export type PlayerStatus =
    | "joined"
    | "connected"
    | "ready"
    | "disconnected"
    | "left"
    | "in-run"
    | "ended";

export type PlayerRunEntityArmor = {
    armorId: string;
    stats: IStats;
    description: string;
    gear_position: "head" | "chest" | "greaves";
    armorName: string;
    rarity: IRarity;
};

export type PlayerRunEntityWeapon = {
    weaponId: string;
    weaponName: string;
    description: string;
    stats: IStats;
    rarity: IRarity;
};

export type PlayerRunEntityArmors = {
    head: PlayerRunEntityArmor | null;
    chest: PlayerRunEntityArmor | null;
    greaves: PlayerRunEntityArmor | null;
};

export type PlayerRunEntityItem = {
    id: string;
    name: string;
    description: string;
    type: "gear" | "consumable" | "scroll";
    rarity: IRarity;
    stackable: boolean;
    maxStackQty: number;
    buyPrice: number;
    count: number;
    slot?: TGearSlot;
    stats?: IStats;
    required_stats?: IStats;
    ability?: string;
    ability_description?: string;
};

export type ConsumableType = "health_potion" | "gold_key" | "lockpick";
export type Consumables = Record<ConsumableType, number>;

export type PlayerRunEntityAbility = {
    id: string;
    name: string;
    active: boolean;
    flavor_text: string;
    description: string;
    targeting: { kind: "enemy" | "ally" | "self" | "any"; scope: "single" | "all" | "self"; type: "physical" | "magical" };
    minimumLevel: number;
    minimumStats: Partial<Record<keyof IStats, number>>;
};

export type PlayerRunEntityJSON = {
    base_stats: IStats;
    stat_modifiers: IStats;
    temp_stat_modifiers: IStats;
    armor_stats: PlayerRunEntityArmors;
    weapon_stats: PlayerRunEntityWeapon | null;
    level: number;
    experience: number;
    skill_points: number;
    gold: number;
    consumables: Consumables;
    items: PlayerRunEntityItem[];
    health: IEntityHealthStatGetters;
    abilities: PlayerRunEntityAbility[];
    activeAbilities: { slot: number; id: string }[];
};

export interface PlayerPublic {
    playerId: string;
    playerPublicId: string;
    name: string;
    status: PlayerStatus;
    disconnectedAt: number | null;
    kit: StarterKitId;
    stats: PlayerRunEntityJSON;
}