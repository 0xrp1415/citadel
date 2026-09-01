import { EntityCombat, IStats } from "../../procedural-engine/index.js";
import { BASE_MAX_PLAYER_BASE_STAT, BASE_PLAYER_HP } from "./defaults.js";

export class PlayerCombat extends EntityCombat {

    private readonly initialBaseStats: IStats;
    
    constructor(
        initialStats: IStats,
        current_level: number,
    ) {
        super(initialStats, BASE_PLAYER_HP, current_level);
        this.initialBaseStats = { ...initialStats };
    }

    public onLevelChange(new_level: number): void {
        this.StatMultiplier = new_level;    
    }

    public increaseBaseStatBy(stat: keyof IStats, amount: number, level: number): boolean {
        if (this.Stats[stat] + amount > this.getMaxBaseStat(level)) {
            return false;
        }
        if (this.Stats[stat] + amount < this.initialBaseStats[stat]) {
            return false;
        }
        super.Stats = { ...this.Stats, [stat]: this.Stats[stat] + amount };
        return true;
    }

    public getMaxBaseStat(level: number): number {
        return BASE_MAX_PLAYER_BASE_STAT + (level - 1);
    }
}
