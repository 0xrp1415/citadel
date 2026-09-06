export type StarterKitId = "vanguard" | "blade" | "shadow" | "arcane" | "wanderer";

export interface StarterKit {
    id: StarterKitId;
    name: string;
    description: string;
    icon: string;
    gear: {
        weapon?: string;
        head?: string;
        chest?: string;
        greaves?: string;
    };
    consumables: { id: string; qty: number }[];
    abilities: string[];
}

export const STARTER_KITS: StarterKit[] = [
    {
        id: "vanguard",
        name: "Vanguard",
        description: "Heavy armor and blade. A frontline fighter built to endure.",
        icon: "game-icons:shield",
        gear: {
            weapon: "iron_sword",
            head: "iron_helm",
            chest: "iron_chestplate",
            greaves: "iron_greaves",
        },
        consumables: [
            { id: "health_potion", qty: 2 },
            { id: "lockpick", qty: 1 },
        ],
        abilities: ["iron_thews", "mend_wounds"],
    },
    {
        id: "blade",
        name: "Blade",
        description: "Swift steel and keen eyes. Strikes fast, strikes first.",
        icon: "game-icons:gauntlet",
        gear: {
            weapon: "rusty_dagger",
            head: "night_veil",
            chest: "hunter_tunic",
            greaves: "reed_sandals",
        },
        consumables: [
            { id: "health_potion", qty: 2 },
            { id: "lockpick", qty: 1 },
        ],
        abilities: ["crushing_blow", "swift_step"],
    },
    {
        id: "shadow",
        name: "Shadow",
        description: "Cloak and bow. Unseen, unheard, unstoppable.",
        icon: "game-icons:hood",
        gear: {
            weapon: "shortbow",
            head: "cloth_bonnet",
            chest: "linen_vestments",
            greaves: "cloth_wraps",
        },
        consumables: [
            { id: "health_potion", qty: 2 },
            { id: "lockpick", qty: 2 },
        ],
        abilities: ["dodge", "fleet_foot"],
    },
    {
        id: "arcane",
        name: "Arcane",
        description: "Staff and scripture. Bends the weave to their will.",
        icon: "game-icons:book-aura",
        gear: {
            weapon: "acolyte_staff",
            head: "novice_cowl",
            chest: "tattered_robe",
            greaves: "monk_legwraps",
        },
        consumables: [
            { id: "health_potion", qty: 2 },
            { id: "lockpick", qty: 1 },
        ],
        abilities: ["arcane_bolt", "learned_lore"],
    },
    {
        id: "wanderer",
        name: "Wanderer",
        description: "No school, no master. Survives by instinct and grit.",
        icon: "game-icons:boots",
        gear: {
            weapon: "weapon_default_bat",
            head: "wooden_helmet",
            chest: "wooden_chest",
            greaves: "wooden_greaves",
        },
        consumables: [
            { id: "health_potion", qty: 3 },
            { id: "gold_key", qty: 1 },
            { id: "lockpick", qty: 2 },
        ],
        abilities: ["grit", "clarity"],
    },
];

export function getStarterKit(id: StarterKitId): StarterKit | undefined {
    return STARTER_KITS.find((k) => k.id === id);
}
