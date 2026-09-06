import { IEnemyBaseData } from "./interface.js";
import { TIER_1, TIER_2, TIER_3, TIER_4 } from "./data/entity/index.js";
import { ENEMY_ABILITIES } from "./data/ability/index.js";

export { ENEMY_ABILITIES };

export const ENEMY_BASE_CATALOG: IEnemyBaseData[] = [
    ...TIER_1,
    ...TIER_2,
    ...TIER_3,
    ...TIER_4,
];

const ENEMY_BY_ID = new Map<string, IEnemyBaseData>(
    ENEMY_BASE_CATALOG.map((enemy) => [enemy.id, enemy]),
);

export function getEnemyById(id: string): IEnemyBaseData | undefined {
    return ENEMY_BY_ID.get(id);
}

export function getEnemiesByThreat(threatLevel: number): IEnemyBaseData[] {
    return ENEMY_BASE_CATALOG.filter((enemy) => enemy.threatLevel === threatLevel);
}
