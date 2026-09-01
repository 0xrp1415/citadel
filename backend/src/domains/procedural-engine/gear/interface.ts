import { IStats } from "../combat/stats.js";
import { EntityCombat } from "../combat/entity/combat.js";

export type TGearSlot = "weapon" | "head" | "chest" | "greaves";

export interface IGearData {
    slot: TGearSlot;
    required_stats: IStats;
    stats: IStats;
    onEquip: (entity: EntityCombat) => void;
    onUnequip: (entity: EntityCombat) => void;
}