import { IStats, NULL_STATS } from "../../../combat/stats.js";
import { IEnemyBaseData } from "../../interface.js";

const S = (s: Partial<Record<keyof IStats, number>>) => ({ ...NULL_STATS, ...s });

const T2_W1  = S({ strength: 10 });
const T2_W2  = S({ strength: 16 });
const T2_A1  = S({ hp: 12 });
const T2_A2  = S({ hp: 16, strength: 4 });

export const TIER_2: IEnemyBaseData[] = [
    { id: "orc_raider", name: "Orc Raider", description: "A snarling orc with scarred tusks and a heavy axe.",
      base_stats: S({ strength: 28, dexterity: 16, intelligence: 10, wisdom: 10, agility: 16, hp: 40 }), base_health: 80,
      armor_stats: T2_A1, weapon_stats: T2_W2, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "armored_skeleton", name: "Armored Skeleton", description: "A skeleton fitted with tarnished chainmail and a notched blade.",
      base_stats: S({ strength: 24, dexterity: 14, intelligence: 8, wisdom: 8, agility: 14, hp: 52 }), base_health: 88,
      armor_stats: T2_A2, weapon_stats: T2_W1, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "dire_wolf", name: "Dire Wolf", description: "A massive wolf with bared fangs and a scarred muzzle.",
      base_stats: S({ strength: 22, dexterity: 20, intelligence: 8, wisdom: 8, agility: 22, hp: 40 }), base_health: 82,
      armor_stats: NULL_STATS, weapon_stats: T2_W2, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "kobold_guard", name: "Kobold Guard", description: "A stocky kobold with a dented shield and spear.",
      base_stats: S({ strength: 22, dexterity: 16, intelligence: 8, wisdom: 8, agility: 14, hp: 52 }), base_health: 86,
      armor_stats: T2_A1, weapon_stats: T2_W1, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "bloated_zombie", name: "Bloated Zombie", description: "A swollen corpse that seeps dark fluid from distended joints.",
      base_stats: S({ strength: 26, dexterity: 8, intelligence: 6, wisdom: 6, agility: 6, hp: 68 }), base_health: 96,
      armor_stats: T2_A1, weapon_stats: NULL_STATS, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "gnoll_marauder", name: "Gnoll Marauder", description: "A hyena-headed brute with chipped fangs and a barbed club.",
      base_stats: S({ strength: 28, dexterity: 16, intelligence: 10, wisdom: 10, agility: 16, hp: 40 }), base_health: 80,
      armor_stats: NULL_STATS, weapon_stats: T2_W2, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "cave_troll", name: "Cave Troll", description: "A hulking troll with knuckles dragging on the ground.",
      base_stats: S({ strength: 30, dexterity: 10, intelligence: 6, wisdom: 6, agility: 8, hp: 60 }), base_health: 98,
      armor_stats: T2_A1, weapon_stats: T2_W2, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "warg_rider", name: "Warg Rider", description: "A snarling orc mounted on a vicious warg.",
      base_stats: S({ strength: 26, dexterity: 18, intelligence: 10, wisdom: 10, agility: 20, hp: 36 }), base_health: 78,
      armor_stats: T2_A1, weapon_stats: T2_W2, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "shadow_dancer", name: "Shadow Dancer", description: "A cloaked figure that flickers in and out of shadow.",
      base_stats: S({ strength: 14, dexterity: 20, intelligence: 18, wisdom: 12, agility: 22, hp: 34 }), base_health: 72,
      armor_stats: NULL_STATS, weapon_stats: T2_W1, ability_stats: S({ intelligence: 6 }), threatLevel: 2 },

    { id: "moss_golem", name: "Moss Golem", description: "A lumbering construct of mossy boulders and thick roots.",
      base_stats: S({ strength: 28, dexterity: 10, intelligence: 6, wisdom: 6, agility: 8, hp: 62 }), base_health: 100,
      armor_stats: T2_A2, weapon_stats: T2_W1, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "plague_rat", name: "Plague Rat", description: "A bloated rat trailed by a swarm of mites.",
      base_stats: S({ strength: 20, dexterity: 18, intelligence: 8, wisdom: 8, agility: 18, hp: 48 }), base_health: 84,
      armor_stats: NULL_STATS, weapon_stats: T2_W1, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "hollow_knight", name: "Hollow Knight", description: "A headless knight carrying a rusted greatsword.",
      base_stats: S({ strength: 26, dexterity: 14, intelligence: 8, wisdom: 8, agility: 14, hp: 50 }), base_health: 88,
      armor_stats: T2_A2, weapon_stats: T2_W2, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "feral_wolf", name: "Feral Wolf", description: "A gaunt wolf with matted fur and wild eyes.",
      base_stats: S({ strength: 22, dexterity: 18, intelligence: 8, wisdom: 8, agility: 22, hp: 42 }), base_health: 80,
      armor_stats: NULL_STATS, weapon_stats: T2_W2, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "rot_skeleton", name: "Rot Skeleton", description: "A skeleton leaking dark ichor from its joints.",
      base_stats: S({ strength: 24, dexterity: 12, intelligence: 8, wisdom: 8, agility: 12, hp: 56 }), base_health: 90,
      armor_stats: T2_A1, weapon_stats: T2_W1, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "bog_ogre", name: "Bog Ogre", description: "A squat, mud-caked ogre with a stone club.",
      base_stats: S({ strength: 30, dexterity: 10, intelligence: 6, wisdom: 6, agility: 8, hp: 60 }), base_health: 98,
      armor_stats: T2_A1, weapon_stats: T2_W2, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "fire_scarred_berserker", name: "Fire-Scarred Berserker", description: "A scarred warrior wreathed in smoke and ash, axe swinging wildly.",
      base_stats: S({ strength: 28, dexterity: 16, intelligence: 10, wisdom: 10, agility: 16, hp: 40 }), base_health: 80,
      armor_stats: NULL_STATS, weapon_stats: T2_W2, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "venom_spider", name: "Venom Spider", description: "A bloated spider dripping venom from its fangs.",
      base_stats: S({ strength: 16, dexterity: 22, intelligence: 10, wisdom: 10, agility: 20, hp: 42 }), base_health: 78,
      armor_stats: NULL_STATS, weapon_stats: T2_W1, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "spectral_hound", name: "Spectral Hound", description: "A translucent hound with burning pale eyes.",
      base_stats: S({ strength: 20, dexterity: 16, intelligence: 10, wisdom: 16, agility: 18, hp: 40 }), base_health: 78,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: S({ wisdom: 6 }), threatLevel: 2 },

    { id: "iron_construct", name: "Iron Construct", description: "A towering construct of riveted iron plates and grinding gears.",
      base_stats: S({ strength: 28, dexterity: 10, intelligence: 6, wisdom: 6, agility: 8, hp: 62 }), base_health: 100,
      armor_stats: T2_A2, weapon_stats: T2_W2, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "rotting_wretch", name: "Rotting Wretch", description: "A staggering humanoid whose flesh hangs in strips.",
      base_stats: S({ strength: 24, dexterity: 12, intelligence: 8, wisdom: 8, agility: 10, hp: 58 }), base_health: 92,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "goblin_shaman", name: "Goblin Shaman", description: "A wizened goblin crackling with crude magic.",
      base_stats: S({ strength: 10, dexterity: 14, intelligence: 24, wisdom: 18, agility: 10, hp: 44 }), base_health: 76,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: S({ intelligence: 8 }), threatLevel: 2 },

    { id: "ogre_mauler", name: "Ogre Mauler", description: "An ogre with fists like boulders and a booming yell.",
      base_stats: S({ strength: 32, dexterity: 10, intelligence: 6, wisdom: 6, agility: 8, hp: 58 }), base_health: 96,
      armor_stats: NULL_STATS, weapon_stats: T2_W2, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "bone_revenant", name: "Bone Revenant", description: "A skeleton fused with hundreds of lesser bones into a towering mass.",
      base_stats: S({ strength: 24, dexterity: 12, intelligence: 10, wisdom: 14, agility: 10, hp: 50 }), base_health: 88,
      armor_stats: T2_A2, weapon_stats: NULL_STATS, ability_stats: S({ wisdom: 6 }), threatLevel: 2 },

    { id: "scaled_sentry", name: "Scaled Sentry", description: "A lizardfolk warrior with obsidian-scaled armor.",
      base_stats: S({ strength: 24, dexterity: 18, intelligence: 10, wisdom: 10, agility: 16, hp: 42 }), base_health: 82,
      armor_stats: T2_A2, weapon_stats: T2_W1, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "corruptor_priest", name: "Corruptor Priest", description: "A dark priest channeling diseased power.",
      base_stats: S({ strength: 10, dexterity: 12, intelligence: 24, wisdom: 20, agility: 10, hp: 44 }), base_health: 76,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: S({ intelligence: 8, wisdom: 6 }), threatLevel: 2 },

    { id: "ghoul_stalker", name: "Ghoul Stalker", description: "A hunched ghoul with elongated claws and a fetid stench.",
      base_stats: S({ strength: 24, dexterity: 18, intelligence: 8, wisdom: 8, agility: 18, hp: 44 }), base_health: 82,
      armor_stats: NULL_STATS, weapon_stats: T2_W2, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "war_boar", name: "War Boar", description: "A tusked boar armored in scarred hide, snorting with fury.",
      base_stats: S({ strength: 26, dexterity: 12, intelligence: 6, wisdom: 6, agility: 12, hp: 58 }), base_health: 94,
      armor_stats: T2_A1, weapon_stats: T2_W1, ability_stats: NULL_STATS, threatLevel: 2 },

    { id: "crystalline_golem", name: "Crystalline Golem", description: "A golem formed of jagged crystal shards that catch the light.",
      base_stats: S({ strength: 22, dexterity: 10, intelligence: 18, wisdom: 12, agility: 8, hp: 50 }), base_health: 86,
      armor_stats: T2_A2, weapon_stats: T2_W1, ability_stats: S({ intelligence: 6 }), threatLevel: 2 },

    { id: "blood_wraith", name: "Blood Wraith", description: "A crimson specter exuding a wave of dread.",
      base_stats: S({ strength: 22, dexterity: 14, intelligence: 12, wisdom: 18, agility: 14, hp: 40 }), base_health: 78,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: S({ wisdom: 8 }), threatLevel: 2 },

    { id: "magma_elemental", name: "Magma Elemental", description: "A churning mass of molten rock and ember that scorches everything it touches.",
      base_stats: S({ strength: 26, dexterity: 10, intelligence: 18, wisdom: 10, agility: 8, hp: 48 }), base_health: 84,
      armor_stats: NULL_STATS, weapon_stats: T2_W2, ability_stats: S({ intelligence: 6 }), threatLevel: 2 },
];