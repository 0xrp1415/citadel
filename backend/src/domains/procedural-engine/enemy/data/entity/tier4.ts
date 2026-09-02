import { IStats, NULL_STATS } from "../../../combat/stats.js";
import { IEnemyBaseData } from "../../interface.js";

const S = (s: Partial<Record<keyof IStats, number>>) => ({ ...NULL_STATS, ...s });

const T4_W1  = S({ strength: 28 });
const T4_W2  = S({ strength: 36 });
const T4_W3  = S({ strength: 44 });
const T4_A1  = S({ hp: 30, strength: 16 });
const T4_A2  = S({ hp: 40, strength: 24 });

export const TIER_4: IEnemyBaseData[] = [
    { id: "ancient_dragon", name: "Ancient Dragon", description: "An ancient dragon with scales like molten gold and eyes of fire.",
      base_stats: S({ strength: 80, dexterity: 50, intelligence: 40, wisdom: 40, agility: 50, hp: 140 }), base_health: 280,
      armor_stats: T4_A2, weapon_stats: T4_W2, ability_stats: S({ intelligence: 16 }), threatLevel: 4 },

    { id: "lich_king", name: "Lich King", description: "A skeletal sovereign wreathed in necrotic power.",
      base_stats: S({ strength: 30, dexterity: 40, intelligence: 80, wisdom: 60, agility: 40, hp: 150 }), base_health: 260,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: S({ intelligence: 24, wisdom: 18 }), threatLevel: 4 },

    { id: "demon_lord", name: "Demon Lord", description: "A towering demon lord radiating hellfire and despair.",
      base_stats: S({ strength: 86, dexterity: 45, intelligence: 40, wisdom: 30, agility: 45, hp: 154 }), base_health: 290,
      armor_stats: T4_A2, weapon_stats: T4_W2, ability_stats: S({ intelligence: 12 }), threatLevel: 4 },

    { id: "stone_colossus", name: "Stone Colossus", description: "A living mountain of stone with rivers of light through its cracks.",
      base_stats: S({ strength: 90, dexterity: 30, intelligence: 25, wisdom: 25, agility: 30, hp: 200 }), base_health: 340,
      armor_stats: T4_A2, weapon_stats: T4_W2, ability_stats: NULL_STATS, threatLevel: 4 },

    { id: "void_emperor", name: "Void Emperor", description: "A regal figure of living void, reality bending at its presence.",
      base_stats: S({ strength: 35, dexterity: 45, intelligence: 80, wisdom: 60, agility: 60, hp: 120 }), base_health: 240,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: S({ intelligence: 24, wisdom: 18 }), threatLevel: 4 },

    { id: "blood_sovereign", name: "Blood Sovereign", description: "A vampiric overlord commanding rivers of blood.",
      base_stats: S({ strength: 76, dexterity: 48, intelligence: 35, wisdom: 40, agility: 48, hp: 153 }), base_health: 280,
      armor_stats: T4_A1, weapon_stats: T4_W2, ability_stats: S({ wisdom: 12 }), threatLevel: 4 },

    { id: "storm_titan", name: "Storm Titan", description: "A titan of living storm, lightning arcing between its limbs.",
      base_stats: S({ strength: 82, dexterity: 48, intelligence: 35, wisdom: 35, agility: 48, hp: 152 }), base_health: 290,
      armor_stats: T4_A2, weapon_stats: T4_W3, ability_stats: S({ intelligence: 12 }), threatLevel: 4 },

    { id: "corrupted_world_tree", name: "Corrupted World Tree", description: "A massive tree animated by corruption, its roots strangling the earth.",
      base_stats: S({ strength: 70, dexterity: 35, intelligence: 40, wisdom: 65, agility: 30, hp: 160 }), base_health: 300,
      armor_stats: T4_A2, weapon_stats: NULL_STATS, ability_stats: S({ wisdom: 20 }), threatLevel: 4 },

    { id: "flame_archon", name: "Flame Archon", description: "A radiant being of living flame with wings of pure fire.",
      base_stats: S({ strength: 72, dexterity: 48, intelligence: 50, wisdom: 35, agility: 48, hp: 147 }), base_health: 270,
      armor_stats: T4_A1, weapon_stats: T4_W2, ability_stats: S({ intelligence: 16 }), threatLevel: 4 },

    { id: "dread_overlord", name: "Dread Overlord", description: "The ultimate horror: a massive, multi-eyed entity of pure darkness.",
      base_stats: S({ strength: 75, dexterity: 45, intelligence: 65, wisdom: 45, agility: 45, hp: 125 }), base_health: 260,
      armor_stats: T4_A2, weapon_stats: T4_W2, ability_stats: S({ intelligence: 20, wisdom: 12 }), threatLevel: 4 },
];