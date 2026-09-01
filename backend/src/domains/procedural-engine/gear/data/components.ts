import { IStats } from "../../combat/stats.js";
import { EntityCombat } from "../../combat/entity/combat.js";
import { IGearData, TGearSlot } from "../interface.js";

function applyStatDelta(entity: EntityCombat, delta: IStats, sign: 1 | -1): void {
    for (const stat of Object.keys(delta) as (keyof IStats)[]) {
        const value = delta[stat];
        if (value !== 0) {
            entity.increaseStatModifierBy(stat, sign * value);
        }
    }
}

export function gearData(
    slot: TGearSlot,
    stats: IStats,
    required_stats: IStats,
): IGearData {
    return {
        slot,
        required_stats,
        stats,
        onEquip: (entity) => applyStatDelta(entity, stats, 1),
        onUnequip: (entity) => applyStatDelta(entity, stats, -1),
    };
}