import { IAbility } from "../ability/interface.js";
import { IStats } from "../combat/stats.js";

export interface IEnemyBaseData {
    id: string;
    name: string;
    description: string;

    base_stats: IStats;
    base_health: number;
    armor_stats: IStats;
    weapon_stats: IStats;
    ability_stats: IStats;
    threatLevel: number;
}
export interface IEnemyData extends IEnemyBaseData {
    stat_multiplier: number;
    abilities: IAbility[];
}