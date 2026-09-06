import { MulberryRNG } from "../../rng.js";
import { ERoomType } from "../../room.js";
import { IItem } from "../base.js";
import { IGear } from "../gear.js";
import { GEAR_ITEMS } from "./gear.js";
import { SCROLL_ITEMS } from "./scrolls.js";
import { CONSUMABLE_ITEMS } from "./consumables.js";
import { TRarity } from "../base.js";

export interface LootResult {
    items: IItem[];
    gold: number;
}

type RarityWeight = Record<TRarity, number>;

const RARITY_ORDER: TRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

const BASE_RARITY_WEIGHTS: RarityWeight = {
    common: 55,
    uncommon: 28,
    rare: 12,
    epic: 4,
    legendary: 1,
};

function depthShiftedWeights(floor: number): RarityWeight {
    const shift = Math.floor(floor / 3);
    const w = { ...BASE_RARITY_WEIGHTS };
    if (shift >= 1) { w.common -= 15; w.uncommon += 10; w.rare += 5; }
    if (shift >= 2) { w.uncommon -= 10; w.rare += 8; w.epic += 2; }
    if (shift >= 3) { w.rare -= 5; w.epic += 4; w.legendary += 1; }
    if (shift >= 4) { w.common -= 10; w.rare -= 5; w.epic += 8; w.legendary += 7; }
    return w;
}

function pickRarity(rng: MulberryRNG, weights: RarityWeight): TRarity {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let roll = rng.roll(1, total);
    for (const r of RARITY_ORDER) {
        roll -= weights[r];
        if (roll <= 0) return r;
    }
    return "common";
}

function filterByRarity<T extends { rarity: { name: TRarity } }>(items: T[], rarity: TRarity): T[] {
    return items.filter((i) => i.rarity.name === rarity);
}

function pickItem(rng: MulberryRNG, pool: IItem[], rarity: RarityWeight): IItem | null {
    const rarityName = pickRarity(rng, rarity);
    const candidates = filterByRarity(pool, rarityName);
    if (candidates.length === 0) {
        const fallback = filterByRarity(pool, "common");
        return fallback.length > 0 ? rng.pick(fallback) : null;
    }
    return rng.pick(candidates);
}

interface RoomLootConfig {
    goldMin: number;
    goldMax: number;
    itemChance: number;
    maxItems: number;
}

const LOOT_CONFIG: Record<string, RoomLootConfig> = {
    [ERoomType.NORMAL]:  { goldMin: 8,  goldMax: 25,  itemChance: 0.45, maxItems: 1 },
    [ERoomType.MINIBOSS]: { goldMin: 25, goldMax: 55,  itemChance: 0.70, maxItems: 1 },
    [ERoomType.BOSS]:    { goldMin: 50, goldMax: 120, itemChance: 1.0,  maxItems: 2 },
    [ERoomType.TREASURE]: { goldMin: 60, goldMax: 150, itemChance: 1.0,  maxItems: 3 },
    [ERoomType.SECRET]:  { goldMin: 35, goldMax: 80,  itemChance: 0.85, maxItems: 2 },
    [ERoomType.PUZZLE]:  { goldMin: 20, goldMax: 50,  itemChance: 0.60, maxItems: 1 },
    [ERoomType.GRACE]:   { goldMin: 0,  goldMax: 0,   itemChance: 0,    maxItems: 0 },
};

const GEAR_SLOTS = ["weapon", "head", "chest", "greaves"] as const;

export function rollLoot(roomType: ERoomType, floor: number, rng: MulberryRNG): LootResult {
    const config = LOOT_CONFIG[roomType] ?? LOOT_CONFIG[ERoomType.NORMAL];
    if (!config) return { items: [], gold: 0 };
    const rarity = depthShiftedWeights(floor);

    const gold = rng.roll(config.goldMin, config.goldMax);
    const items: IItem[] = [];

    const itemCount = rng.chance(config.itemChance) ? rng.roll(1, config.maxItems) : 0;

    for (let i = 0; i < itemCount; i++) {
        const kind = rng.pick(["gear", "scroll", "consumable"] as const);
        let item: IItem | null = null;

        if (kind === "gear") {
            const slot = rng.pick(GEAR_SLOTS);
            const pool = GEAR_ITEMS.filter((g) => g.metadata.slot === slot);
            item = pickItem(rng, pool, rarity);
        } else if (kind === "scroll") {
            item = pickItem(rng, SCROLL_ITEMS, rarity);
        } else {
            item = pickItem(rng, CONSUMABLE_ITEMS, rarity);
        }

        if (item) items.push(item);
    }

    return { items, gold };
}

export function rollTreasureLoot(floor: number, rng: MulberryRNG): LootResult {
    return rollLoot(ERoomType.TREASURE, floor, rng);
}
