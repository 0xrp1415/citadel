import { IStats, NULL_STATS } from "../../../combat/stats.js";
import { IEnemyBaseData } from "../../interface.js";

const S = (s: Partial<Record<keyof IStats, number>>) => ({ ...NULL_STATS, ...s });

const T1_W1 = S({ strength: 4 });
const T1_W2 = S({ strength: 8 });
const T1_A1 = S({ hp: 8 });
const T1_A2 = S({ hp: 12 });

export const TIER_1: IEnemyBaseData[] = [
    { id: "goblin_grunt", name: "Goblin Grunt", description: "A scrawny goblin sneaking through the dark, clutching a crude blade.",
      base_stats: S({ strength: 14, dexterity: 10, intelligence: 5, wisdom: 5, agility: 10, hp: 16 }), base_health: 40,
      armor_stats: NULL_STATS, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "cave_rat", name: "Cave Rat", description: "A rat the size of a small dog with mangy fur and yellowed fangs.",
      base_stats: S({ strength: 8, dexterity: 12, intelligence: 6, wisdom: 6, agility: 14, hp: 14 }), base_health: 35,
      armor_stats: NULL_STATS, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "cave_bat", name: "Cave Bat", description: "A leathery-winged bat with oversized ears and needle-sharp teeth.",
      base_stats: S({ strength: 6, dexterity: 10, intelligence: 4, wisdom: 4, agility: 16, hp: 20 }), base_health: 38,
      armor_stats: NULL_STATS, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "dungeon_spider", name: "Dungeon Spider", description: "A fat spider clinging to a web of grey silk.",
      base_stats: S({ strength: 8, dexterity: 14, intelligence: 6, wisdom: 6, agility: 12, hp: 14 }), base_health: 35,
      armor_stats: NULL_STATS, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "crumbling_skeleton", name: "Crumbling Skeleton", description: "A skeleton barely held together, rattling with every step.",
      base_stats: S({ strength: 12, dexterity: 8, intelligence: 5, wisdom: 5, agility: 8, hp: 22 }), base_health: 42,
      armor_stats: T1_A1, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "green_slime", name: "Green Slime", description: "An amorphous blob of bubbling green ooze.",
      base_stats: S({ strength: 10, dexterity: 6, intelligence: 4, wisdom: 4, agility: 6, hp: 30 }), base_health: 45,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "kobold_scout", name: "Kobold Scout", description: "A diminutive kobold, quick and sneaky.",
      base_stats: S({ strength: 8, dexterity: 14, intelligence: 6, wisdom: 6, agility: 14, hp: 12 }), base_health: 32,
      armor_stats: NULL_STATS, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "wild_ox", name: "Wild Ox", description: "A lean ox with cracked horns, charging headlong.",
      base_stats: S({ strength: 16, dexterity: 6, intelligence: 4, wisdom: 4, agility: 6, hp: 24 }), base_health: 48,
      armor_stats: NULL_STATS, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "sickly_zombie", name: "Sickly Zombie", description: "A shambling corpse trailing black ichor from its wounds.",
      base_stats: S({ strength: 14, dexterity: 6, intelligence: 4, wisdom: 4, agility: 4, hp: 28 }), base_health: 50,
      armor_stats: T1_A1, weapon_stats: NULL_STATS, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "scrawny_cultist", name: "Scrawny Cultist", description: "A hollow-eyed cultist clutching a ragged tome.",
      base_stats: S({ strength: 6, dexterity: 8, intelligence: 16, wisdom: 12, agility: 6, hp: 12 }), base_health: 30,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: S({ intelligence: 4 }), threatLevel: 1 },

    { id: "giant_rat", name: "Giant Rat", description: "A bloated rat with matted fur and gnawed whiskers.",
      base_stats: S({ strength: 10, dexterity: 12, intelligence: 5, wisdom: 5, agility: 12, hp: 16 }), base_health: 38,
      armor_stats: NULL_STATS, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "plumed_bat", name: "Plumed Bat", description: "A bat with dull feathers streaked across its wings.",
      base_stats: S({ strength: 6, dexterity: 10, intelligence: 4, wisdom: 4, agility: 16, hp: 20 }), base_health: 38,
      armor_stats: NULL_STATS, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "mud_skeleton", name: "Mud Skeleton", description: "A skeleton caked in drying mud, joints grinding.",
      base_stats: S({ strength: 12, dexterity: 8, intelligence: 5, wisdom: 5, agility: 8, hp: 22 }), base_health: 42,
      armor_stats: T1_A1, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "oozeling", name: "Oozeling", description: "A tiny ooze that splits and reforms with every step.",
      base_stats: S({ strength: 8, dexterity: 6, intelligence: 4, wisdom: 4, agility: 6, hp: 32 }), base_health: 46,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "stone_beetle", name: "Stone Beetle", description: "A beetle with a rock-like carapace, mandibles clicking.",
      base_stats: S({ strength: 10, dexterity: 8, intelligence: 4, wisdom: 4, agility: 6, hp: 28 }), base_health: 48,
      armor_stats: T1_A1, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "feral_cat", name: "Feral Cat", description: "A scarred feral cat with bared claws.",
      base_stats: S({ strength: 8, dexterity: 14, intelligence: 5, wisdom: 5, agility: 16, hp: 12 }), base_health: 32,
      armor_stats: NULL_STATS, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "carrion_crow", name: "Carrion Crow", description: "A skeletal crow with bare patches of feathers.",
      base_stats: S({ strength: 6, dexterity: 12, intelligence: 5, wisdom: 5, agility: 16, hp: 16 }), base_health: 36,
      armor_stats: NULL_STATS, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "fungal_sprout", name: "Fungal Sprout", description: "A small humanoid figure made of pale, wilting fungi.",
      base_stats: S({ strength: 6, dexterity: 8, intelligence: 10, wisdom: 14, agility: 8, hp: 14 }), base_health: 34,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: S({ wisdom: 4 }), threatLevel: 1 },

    { id: "shadow_wisp", name: "Shadow Wisp", description: "A flickering wisp of living shadow.",
      base_stats: S({ strength: 4, dexterity: 12, intelligence: 12, wisdom: 8, agility: 14, hp: 10 }), base_health: 28,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: S({ intelligence: 4 }), threatLevel: 1 },

    { id: "hatchling_wyrm", name: "Hatchling Wyrm", description: "A tiny dragon hatchling with fragile, translucent scales.",
      base_stats: S({ strength: 12, dexterity: 10, intelligence: 6, wisdom: 6, agility: 10, hp: 16 }), base_health: 40,
      armor_stats: NULL_STATS, weapon_stats: T1_W2, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "skeletal_raven", name: "Skeletal Raven", description: "A bird skeleton with hollow, clicking beak.",
      base_stats: S({ strength: 6, dexterity: 12, intelligence: 5, wisdom: 5, agility: 16, hp: 16 }), base_health: 36,
      armor_stats: NULL_STATS, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "iron_scarab", name: "Iron Scarab", description: "A metallic beetle with serrated legs.",
      base_stats: S({ strength: 10, dexterity: 8, intelligence: 4, wisdom: 4, agility: 6, hp: 28 }), base_health: 48,
      armor_stats: T1_A2, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "slime_droplet", name: "Slime Droplet", description: "A small, iridescent droplet of magical slime.",
      base_stats: S({ strength: 6, dexterity: 6, intelligence: 6, wisdom: 6, agility: 6, hp: 30 }), base_health: 44,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "brittle_golem", name: "Brittle Golem", description: "A small construct of loose, crumbling stone.",
      base_stats: S({ strength: 14, dexterity: 4, intelligence: 4, wisdom: 4, agility: 4, hp: 30 }), base_health: 50,
      armor_stats: T1_A1, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "ash_imp", name: "Ash Imp", description: "A tiny imp wreathed in grey ash.",
      base_stats: S({ strength: 6, dexterity: 12, intelligence: 12, wisdom: 6, agility: 12, hp: 12 }), base_health: 30,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: S({ intelligence: 4 }), threatLevel: 1 },

    { id: "fog_specter", name: "Fog Specter", description: "A translucent shape drifting through the mist.",
      base_stats: S({ strength: 4, dexterity: 10, intelligence: 10, wisdom: 14, agility: 10, hp: 12 }), base_health: 30,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: S({ wisdom: 4 }), threatLevel: 1 },

    { id: "flayed_wretch", name: "Flayed Wretch", description: "A pale, trembling humanoid stripped of its skin.",
      base_stats: S({ strength: 14, dexterity: 8, intelligence: 4, wisdom: 4, agility: 6, hp: 24 }), base_health: 44,
      armor_stats: NULL_STATS, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "drowned_corpse", name: "Drowned Corpse", description: "A waterlogged corpse that drags itself forward.",
      base_stats: S({ strength: 14, dexterity: 6, intelligence: 4, wisdom: 4, agility: 4, hp: 28 }), base_health: 48,
      armor_stats: T1_A1, weapon_stats: NULL_STATS, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "buzzing_swarm", name: "Buzzing Swarm", description: "A chaotic cloud of stinging insects.",
      base_stats: S({ strength: 6, dexterity: 14, intelligence: 4, wisdom: 4, agility: 16, hp: 16 }), base_health: 34,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "grinning_goblin", name: "Grinning Goblin", description: "A wide-eyed goblin with a manic grin and jagged knife.",
      base_stats: S({ strength: 12, dexterity: 12, intelligence: 6, wisdom: 6, agility: 10, hp: 14 }), base_health: 36,
      armor_stats: NULL_STATS, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "dust_wraith", name: "Dust Wraith", description: "A thin wraith made of swirling dust.",
      base_stats: S({ strength: 6, dexterity: 10, intelligence: 10, wisdom: 12, agility: 10, hp: 12 }), base_health: 30,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: S({ wisdom: 4 }), threatLevel: 1 },

    { id: "fungal_bat", name: "Fungal Bat", description: "A bat overgrown with parasitic fungi.",
      base_stats: S({ strength: 6, dexterity: 10, intelligence: 6, wisdom: 8, agility: 14, hp: 16 }), base_health: 36,
      armor_stats: NULL_STATS, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "moss_skeleton", name: "Moss Skeleton", description: "A skeleton draped in trailing green moss.",
      base_stats: S({ strength: 12, dexterity: 8, intelligence: 5, wisdom: 5, agility: 8, hp: 22 }), base_health: 42,
      armor_stats: T1_A1, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "spiderling", name: "Spiderling", description: "A tiny spider with a bulbous, veined abdomen.",
      base_stats: S({ strength: 6, dexterity: 14, intelligence: 6, wisdom: 6, agility: 14, hp: 14 }), base_health: 34,
      armor_stats: NULL_STATS, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "swamp_lurker", name: "Swamp Lurker", description: "A squat, mud-colored toad with a distended belly.",
      base_stats: S({ strength: 10, dexterity: 6, intelligence: 4, wisdom: 4, agility: 6, hp: 30 }), base_health: 48,
      armor_stats: T1_A1, weapon_stats: NULL_STATS, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "thornling", name: "Thornling", description: "A small creature of thorned bramble.",
      base_stats: S({ strength: 10, dexterity: 10, intelligence: 4, wisdom: 4, agility: 8, hp: 24 }), base_health: 44,
      armor_stats: T1_A1, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "wormling", name: "Wormling", description: "A fat, translucent worm with visible innards.",
      base_stats: S({ strength: 8, dexterity: 6, intelligence: 4, wisdom: 4, agility: 6, hp: 32 }), base_health: 46,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "crackling_elemental", name: "Crackling Elemental", description: "A small spark of crackling elemental energy.",
      base_stats: S({ strength: 6, dexterity: 10, intelligence: 14, wisdom: 8, agility: 10, hp: 12 }), base_health: 30,
      armor_stats: NULL_STATS, weapon_stats: NULL_STATS, ability_stats: S({ intelligence: 4 }), threatLevel: 1 },

    { id: "bog_crawler", name: "Bog Crawler", description: "A crab-like creature with mossy, pitted legs.",
      base_stats: S({ strength: 10, dexterity: 10, intelligence: 4, wisdom: 4, agility: 8, hp: 24 }), base_health: 44,
      armor_stats: T1_A1, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },

    { id: "rust_rat", name: "Rust Rat", description: "A rat with patches of corroded metal fused to its hide.",
      base_stats: S({ strength: 10, dexterity: 10, intelligence: 4, wisdom: 4, agility: 10, hp: 22 }), base_health: 42,
      armor_stats: T1_A1, weapon_stats: T1_W1, ability_stats: NULL_STATS, threatLevel: 1 },
];