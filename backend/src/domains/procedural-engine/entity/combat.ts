import { EntityHealthStatImpl, IEntityHealthStatGetters } from "./health.js";
import { EntityStats, IStats, NULL_STATS, sumStats } from "./stats.js";

export class EntityCombat {
    private baseStats: EntityStats;
    private statModifiers: EntityStats;
    private health: EntityHealthStatImpl;

    private readonly baseMaxHealth: number;
    private multiplier: number;

    constructor(baseStats: IStats, baseMaxHealth: number, statMultiplier: number = 1) {
        this.baseStats = new EntityStats(baseStats);
        this.statModifiers = new EntityStats(NULL_STATS);
        this.baseMaxHealth = baseMaxHealth;
        this.multiplier = statMultiplier;
        this.health = new EntityHealthStatImpl(this.computeMaxHealth());
    }

    public get StatMultiplier(): number {
        return this.statMultiplier;
    }

    protected get statMultiplier(): number {
        return this.multiplier;
    }

    public setStatMultiplier(statMultiplier: number): void {
        this.multiplier = statMultiplier;
        this.refreshHealth();
    }

    public increaseBaseStatBy(stat: keyof IStats, amount: number, maxCap?: number): boolean {
        const nextValue = this.BaseStats[stat] + amount;
        if (nextValue < 0 || (maxCap !== undefined && nextValue > maxCap)) {
            return false;
        }
        const applied = this.baseStats.increaseStatBy(stat, amount);
        if (applied) {
            this.refreshHealth();
        }
        return applied;
    }

    public increaseStatModifierBy(stat: keyof IStats, amount: number): boolean {
        return this.statModifiers.increaseStatBy(stat, amount);
    }

    public changeHealthBy(amount: number): void {
        this.health.changeCurrentHealthBy(amount);
    }

    public refreshHealth(): void {
        const previousRatio = this.health.CurrentHealth / this.health.MaxHealth;
        this.health.setMaxHealth(this.computeMaxHealth());
        this.health.changeCurrentHealthBy((this.health.MaxHealth * previousRatio) - this.health.CurrentHealth);
    }

    public get BaseStats(): IStats {
        return this.baseStats.Stats;
    }

    public get StatModifiers(): IStats {
        return this.statModifiers.Stats;
    }

    public get EffectiveStats(): IStats {
        const combined = sumStats([this.baseStats.Stats, this.statModifiers.Stats]);
        for (const stat of Object.keys(combined) as (keyof IStats)[]) {
            combined[stat] = Math.floor(combined[stat] * this.StatMultiplier);
        }
        return combined;
    }

    public get Health(): IEntityHealthStatGetters {
        return {
            MaxHealth: this.health.MaxHealth,
            CurrentHealth: this.health.CurrentHealth,
        };
    }

    private computeMaxHealth(): number {
        return this.baseMaxHealth + this.EffectiveStats.hp;
    }
}
