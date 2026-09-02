import { IStats, NULL_STATS } from "../../../combat/stats.js";
import { IEnemyBaseData } from "../../interface.js";

const S = (s: Partial<Record<keyof IStats, number>>) => ({ ...NULL_STATS, ...s });

const T3_W1  = S({ strength: 18 });
const T3_W2  = S({ strength: 24 });
const T3_A1  = S({ hp: 20, strength: 8 });
const T3_A2  = S({ hp: 24, strength: 12 });

export const TIER_3: IEnemyBaseData[] = [
    { id: "ogre_bruiser", name: "Ogre Bruiser", description: "A massive ogre with fists scarred from a hundred battles.",
      base_stats: S({ strength: 54, dexterity: 22, intelligence: 18, wisdom: 18, agility: 22, hp: 116 }), base_health: 180,
      armor_stats: T3_A1, weapon_stats: T3_W2, ability_stats: NULL_STATS, threatLevel: 3 },

    { id: "vampire_adept", name: "Vampire Adept", description: "An aristocratic vampire with chilling, hypnotic eyes.",
      base_stats: S({ strength: 40, dexterity: 34, intelligence: 36, wisdom: 28, agility: 36, hp: 76 }), base_health: 150,
      armor_stats: T3_A1, weapon_stats: T3_W2, ability_stats: S({ intelligence: 12 }), threatLevel: 3 },

    { id: "death_knight", name: "Death Knight", description: "A dark knight encased in cursed black plate.",
      base_stats: S({ strength: 52, dexterity: 28, intelligence: 18, wisdom: 18, agility: 28, hp: 106 }), base_health: 176,
      armor_stats: T3_A2, weapon_stats: T3_W2, ability_stats: NULL_STATS, threatLevel: 3 },

    { id: "basilisk", name: "Basilisk", description: "A massive reptilian beast with a petrifying gaze.",
      base_stats: S({ strength: 48, dexterity: 30, intelligence: 20, wisdom: 22, agility: 30, hp: 100 }), base_health: 170,
      armor_stats: T3_A2, weapon_stats: T3_W1, ability_stats: S({ wisdom: 8 }), threatLevel: 3 },

    { id: "demon_lieutenant", name: "Demon Lieutenant", description: "A horned demon wreathed in sulfurous flame.",
      base_stats: S({ strength: 50, dexterity: 30, intelligence: 30, wisdom: 20, agility: 30, hp: 90 }), base_health: 160,
      armor_stats: T3_A1, weapon_stats: T3_W2, ability_stats: S({ intelligence: 10 }), threatLevel: 3 },

    { id: "stone_titan", name: "Stone Titan", description: "A towering giant of living stone with glowing seams.",
      base_stats: S({ strength: 56, dexterity: 18, intelligence: 16, wisdom: 16, agility: 18, hp: 126 }), base_health: 196,
      armor_stats: T3_A2, weapon_stats: T3_W2, ability_stats: NULL_STATS, threatLevel: 3 },

    { id: "lich_acolyte", name: "Lich Acolyte", description: "A skeletal mage with a staff of writhing souls.",
      base_stats: S({ strength: 20, dexterity: 26, intelligence: 52, wisdom: 40, agility: 26, hp: 86 }), base_health: 150,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: S({ intelligence: 16, wisdom: 12 }), threatLevel: 3 },

    { id: "greater_werewolf", name: "Greater Werewolf", description: "A massive wolf-man howling under a tattered cloak.",
      base_stats: S({ strength: 50, dexterity: 36, intelligence: 18, wisdom: 18, agility: 40, hp: 88 }), base_health: 158,
      armor_stats: NULL_STATS, weapon_stats: T3_W2, ability_stats: NULL_STATS, threatLevel: 3 },

    { id: "flesh_abomination", name: "Flesh Abomination", description: "A nightmarish construct of stitched, writhing limbs.",
      base_stats: S({ strength: 52, dexterity: 18, intelligence: 16, wisdom: 16, agility: 18, hp: 130 }), base_health: 196,
      armor_stats: T3_A2, weapon_stats: T3_W1, ability_stats: NULL_STATS, threatLevel: 3 },

    { id: "ancient_golem", name: "Ancient Golem", description: "A millennia-old golem overgrown with vines and runic carvings.",
      base_stats: S({ strength: 54, dexterity: 20, intelligence: 20, wisdom: 20, agility: 20, hp: 116 }), base_health: 186,
      armor_stats: T3_A2, weapon_stats: T3_W2, ability_stats: NULL_STATS, threatLevel: 3 },

    { id: "storm_harpy", name: "Storm Harpy", description: "A harpy crackling with static and razor wind.",
      base_stats: S({ strength: 28, dexterity: 38, intelligence: 28, wisdom: 24, agility: 42, hp: 90 }), base_health: 150,
      armor_stats: NULL_STATS, weapon_stats: T3_W1, ability_stats: S({ intelligence: 10 }), threatLevel: 3 },

    { id: "plague_bearer", name: "Plague Bearer", description: "A massive, distended figure trailing clouds of pestilence.",
      base_stats: S({ strength: 40, dexterity: 20, intelligence: 22, wisdom: 30, agility: 18, hp: 120 }), base_health: 184,
      armor_stats: T3_A1, weapon_stats: NULL_STATS, ability_stats: S({ wisdom: 10 }), threatLevel: 3 },

    { id: "ironclad_tortoise", name: "Ironclad Tortoise", description: "A titanic tortoise encased in overlapping iron plates.",
      base_stats: S({ strength: 42, dexterity: 16, intelligence: 14, wisdom: 14, agility: 14, hp: 150 }), base_health: 210,
      armor_stats: T3_A2, weapon_stats: T3_W1, ability_stats: NULL_STATS, threatLevel: 3 },

    { id: "void_stalker", name: "Void Stalker", description: "A shapeshifting entity of pure void and shadow.",
      base_stats: S({ strength: 26, dexterity: 36, intelligence: 34, wisdom: 28, agility: 40, hp: 86 }), base_health: 148,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: S({ intelligence: 12 }), threatLevel: 3 },

    { id: "blood_revenant", name: "Blood Revenant", description: "A towering revenant forged from congealed blood.",
      base_stats: S({ strength: 50, dexterity: 28, intelligence: 18, wisdom: 20, agility: 28, hp: 106 }), base_health: 172,
      armor_stats: T3_A1, weapon_stats: T3_W2, ability_stats: NULL_STATS, threatLevel: 3 },

    { id: "frost_giant", name: "Frost Giant", description: "A colossal giant of ice and frost, breathing glacial air.",
      base_stats: S({ strength: 56, dexterity: 24, intelligence: 20, wisdom: 20, agility: 24, hp: 106 }), base_health: 176,
      armor_stats: T3_A2, weapon_stats: T3_W2, ability_stats: S({ intelligence: 6 }), threatLevel: 3 },

    { id: "corrupted_dryad", name: "Corrupted Dryad", description: "A twisted tree spirit with blackened bark and sickly leaves.",
      base_stats: S({ strength: 38, dexterity: 30, intelligence: 24, wisdom: 40, agility: 28, hp: 90 }), base_health: 154,
      armor_stats: T3_A1, weapon_stats: NULL_STATS, ability_stats: S({ wisdom: 14 }), threatLevel: 3 },

    { id: "infernal_marshal", name: "Infernal Marshal", description: "A devil in ornate crimson armor wielding a flame whip.",
      base_stats: S({ strength: 50, dexterity: 30, intelligence: 30, wisdom: 20, agility: 30, hp: 90 }), base_health: 160,
      armor_stats: T3_A2, weapon_stats: T3_W2, ability_stats: S({ intelligence: 10 }), threatLevel: 3 },

    { id: "arcane_horror", name: "Arcane Horror", description: "A mass of writhing tentacles erupting from a glowing rift.",
      base_stats: S({ strength: 36, dexterity: 28, intelligence: 50, wisdom: 30, agility: 28, hp: 78 }), base_health: 144,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: S({ intelligence: 16 }), threatLevel: 3 },

    { id: "dread_centurion", name: "Dread Centurion", description: "An undead centurion leading a spectral legion into battle.",
      base_stats: S({ strength: 52, dexterity: 28, intelligence: 18, wisdom: 18, agility: 28, hp: 106 }), base_health: 176,
      armor_stats: T3_A2, weapon_stats: T3_W2, ability_stats: NULL_STATS, threatLevel: 3 },
];