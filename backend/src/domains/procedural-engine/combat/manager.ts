import { EntityCombat } from "./entity/combat.js";
import { IStats } from "./stats.js";

export const BASE_ATTACK_POWER = 40;

export class CombatManager {
    public static IsAlive(entity: EntityCombat): boolean {
        return entity.Health.CurrentHealth > 0;
    }

    public static IsDead(entity: EntityCombat): boolean {
        return entity.Health.CurrentHealth <= 0;
    }

    public static DealDamage(
        dealer: EntityCombat,
        target: EntityCombat,
        damageType: "physical" | "magical",
        basePower: number,
    ): number {
        if (basePower <= 0 || CombatManager.IsDead(target)) return 0;

        const level = dealer.StatMultiplier;
        const dealerStats = dealer.EffectiveStats;
        const targetStats = target.EffectiveStats;

        const physical = damageType === "physical";
        const atk = physical ? dealerStats.strength : dealerStats.intelligence;
        const def = physical ? targetStats.dexterity : targetStats.wisdom;

        const final = Math.floor((Math.floor((2 * level) / 5 + 2) * basePower * atk) / Math.max(1, def) / 50) + 2;

        const before = target.Health.CurrentHealth;
        target.changeHealthBy(-final);
        return before - target.Health.CurrentHealth;
    }

    public static Kill(target: EntityCombat): number {
        if (CombatManager.IsDead(target)) return 0;
        const before = target.Health.CurrentHealth;
        target.changeHealthBy(-before);
        return before;
    }

    public static Heal(target: EntityCombat, amount: number): number {
        if (amount <= 0 || CombatManager.IsDead(target)) return 0;

        const before = target.Health.CurrentHealth;
        target.changeHealthBy(amount);
        return target.Health.CurrentHealth - before;
    }

    public static ApplyTemporaryModifiers(target: EntityCombat, modifiers: Partial<Record<keyof IStats, number>>): void {
        for (const stat of Object.keys(modifiers) as (keyof IStats)[]) {
            const value = modifiers[stat];
            if (value !== undefined) target.applyTemporaryStatModifierBy(stat, value);
        }
    }

    public static ApplyPermanentModifiers(target: EntityCombat, modifiers: Partial<Record<keyof IStats, number>>): void {
        for (const stat of Object.keys(modifiers) as (keyof IStats)[]) {
            const value = modifiers[stat];
            if (value !== undefined) target.increaseStatModifierBy(stat, value);
        }
    }
}
