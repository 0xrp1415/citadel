import { EntityCombat, IStats } from "../combat/index.js";
import { IAbility, IAbilityActor } from "../index.js";
import { IEnemyData } from "./interface.js";

export class EnemyEntity extends EntityCombat implements IAbilityActor {
    id: string;
    abilities: IAbility[];
    threatLevel: number;
    name: string;
    description: string;

    constructor(data: IEnemyData) {
        super(data.base_stats, data.base_health, data.stat_multiplier, data.armor_stats, data.weapon_stats, data.ability_stats);
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.abilities = data.abilities;
        this.threatLevel = data.threatLevel;
    }

    get level(): number { return this.threatLevel; }

    Heal(amount: number): void { this.changeHealthBy(amount); }
    TakeDamage(amount: number): void { this.changeHealthBy(-amount); }

    ApplyStatModifiers(modifiers: Partial<Record<keyof IStats, number>>): void {
        for (const stat of Object.keys(modifiers) as (keyof IStats)[]) {
            const value = modifiers[stat];
            if (value !== undefined) this.increaseStatModifierBy(stat, value);
        }
    }

    ApplyTemporaryStatModifiers(modifiers: Partial<Record<keyof IStats, number>>): void {
        for (const stat of Object.keys(modifiers) as (keyof IStats)[]) {
            const value = modifiers[stat];
            if (value !== undefined) this.applyTemporaryStatModifierBy(stat, value);
        }
    }

    get scale_factor(): number { return this.StatMultiplier; }
    get alive(): boolean { return this.Health.CurrentHealth > 0; }
    get stats(): IStats { return this.BaseStats; }
    get modifiers(): IStats { return this.StatModifiers; }
    get maxHealth(): number { return this.Health.MaxHealth; }
    get currentHealth(): number { return this.Health.CurrentHealth; }
}
