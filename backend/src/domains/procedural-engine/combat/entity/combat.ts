import { EntityHealthStatImpl, IEntityHealthStatGetters } from "./health.js";
import { EntityStats, IStats, NULL_STATS, sumStats } from "../stats.js";

export abstract class EntityCombat {
    private base_stats: EntityStats;
    private health: EntityHealthStatImpl;

    private statModifiers: IStats;

    private tempStatModifiers: IStats = { ...NULL_STATS };

    private statMultiplier: number = 1;

    private readonly baseMaxHealth: number;
    private readonly baseStatsHp: number;

    constructor(base_stats: IStats, base_health: number, stat_multiplier: number = 1, armor_stats: IStats = NULL_STATS, weapon_stats: IStats = NULL_STATS, ability_stats: IStats = NULL_STATS) {

        this.base_stats = new EntityStats(base_stats);
        this.baseMaxHealth = base_health;
        this.baseStatsHp = base_stats.hp;
        this.statModifiers = sumStats([armor_stats, weapon_stats, ability_stats]);
        this.statMultiplier = stat_multiplier;
        this.health = new EntityHealthStatImpl(base_health, undefined, () => this.resolveMaxHealth());

    }

    private resolveMaxHealth(): number {
        const hpDelta = this.BaseStats.hp + this.StatModifiers.hp + this.tempStatModifiers.hp - this.baseStatsHp;
        return this.baseMaxHealth + Math.floor(hpDelta);
    }


    // Getters 

    public get Stats(): IStats {
        return this.base_stats.Stats;
    }

    public get StatMultiplier(): number {
        return this.statMultiplier;
    }

    public get BaseStats(): IStats {
        return this.base_stats.Stats;
    }

    public get StatModifiers(): IStats {
        return this.statModifiers;
    }

    public get EffectiveStats(): IStats {
        const combined = sumStats([this.base_stats.Stats, this.statModifiers, this.tempStatModifiers]);
        for (const stat of Object.keys(combined) as (keyof IStats)[]) {
            combined[stat] = Math.floor(combined[stat] * this.statMultiplier);
        }
        return combined;
    }

    public get TempStatModifiers(): IStats {
        return { ...this.tempStatModifiers };
    }

    public get Health(): IEntityHealthStatGetters {
        return this.health;
    }



    // Setters
    protected set StatMultiplier(value: number) {
        this.statMultiplier = value;
    }

    protected set Stats(stats: IStats) {
        this.base_stats.setStats(stats);
    }

    protected set StatModifiers(stats: IStats) {
        this.statModifiers = stats;
    }

    // Methods

    public changeHealthBy(amount: number): void {
        this.health.changeCurrentHealthBy(amount);
    }

    public increaseStatModifierBy(stat: keyof IStats, amount: number): void {
        this.statModifiers = { ...this.statModifiers, [stat]: this.statModifiers[stat] + amount };
    }

    public applyTemporaryStatModifierBy(stat: keyof IStats, amount: number): void {
        this.tempStatModifiers = { ...this.tempStatModifiers, [stat]: this.tempStatModifiers[stat] + amount };
    }

    public clearTemporaryStatModifiers(): boolean {
        const cleared = Object.values(this.tempStatModifiers).some((amount) => amount !== 0);
        this.tempStatModifiers = { ...NULL_STATS };
        return cleared;
    }
}
