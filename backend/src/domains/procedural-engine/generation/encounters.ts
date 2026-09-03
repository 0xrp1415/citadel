import { MulberryRNG } from "../rng.js";
import { ERoomType, Room } from "../room.js";
import { EnemyEntity } from "../enemy/entity.js";
import { EnemyEntityBuilder, threatMultiplier } from "../enemy/builder.js";
import { getEnemiesByThreat, getEnemyById } from "../enemy/registry.js";

const TIER_BY_ROOM_TYPE: Partial<Record<ERoomType, number[]>> = {
    [ERoomType.NORMAL]: [1, 2],
    [ERoomType.MINIBOSS]: [3],
    [ERoomType.SECRET]: [3],
    [ERoomType.BOSS]: [4],
};

const COUNT_BY_ROOM_TYPE: Record<ERoomType, [number, number]> = {
    [ERoomType.NORMAL]: [1, 2],
    [ERoomType.MINIBOSS]: [1, 3],
    [ERoomType.SECRET]: [1, 3],
    [ERoomType.BOSS]: [1, 3],
    [ERoomType.GRACE]: [0, 0],
    [ERoomType.TREASURE]: [0, 0],
    [ERoomType.PUZZLE]: [0, 0],
};

const MAX_TIER_BY_FLOOR = (floor: number): number => 1 + Math.floor((floor - 1) / 4);

export function selectEnemiesForRoom(room: Room, floor: number, rng: MulberryRNG): EnemyEntity[] {
    const allowed = TIER_BY_ROOM_TYPE[room.Type];
    if (!allowed || allowed.length === 0) return [];

    const baseTier = allowed[Math.min(rng.roll(0, allowed.length - 1), allowed.length - 1)];
    if (baseTier === undefined) return [];
    const tier = Math.min(
        allowed[allowed.length - 1] ?? baseTier,
        baseTier,
        MAX_TIER_BY_FLOOR(floor),
    );

    let band = getEnemiesByThreat(tier);
    for (let fallback = tier - 1; band.length === 0 && fallback >= 1; fallback--) {
        band = getEnemiesByThreat(fallback);
    }
    if (band.length === 0) return [];

    const [minCount, maxCount] = COUNT_BY_ROOM_TYPE[room.Type];
    const extra = Math.floor(Math.max(0, floor - 1) / 2);
    const effectiveMax = Math.min(maxCount + extra, band.length);
    const count = effectiveMax < minCount ? minCount : rng.roll(minCount, effectiveMax);
    if (count <= 0) return [];

    const picked = pickDistinct(band.map((e) => e.id), count, rng);
    const positionScale = 0.75 + 0.05 * room.DistanceBonus + 0.1 * Math.max(0, floor - 1);
    const scale = (threatMultiplier(tier) * positionScale) / Math.max(1, count);
    return picked
        .map((id) => getEnemyById(id))
        .filter((e): e is NonNullable<typeof e> => e !== undefined)
        .map((base) => new EnemyEntityBuilder(base).withStatMultiplier(scale).build());
}

function pickDistinct<T>(items: T[], count: number, rng: MulberryRNG): T[] {
    const pool = [...items];
    const result: T[] = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
        const idx = rng.roll(0, pool.length - 1);
        result.push(pool.splice(idx, 1)[0]!);
    }
    return result;
}
