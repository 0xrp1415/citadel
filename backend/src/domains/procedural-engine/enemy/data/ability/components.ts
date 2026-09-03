import { IAbilityActiveComponent, IAbilityActor } from "../../../ability/interface.js";
import { IStats } from "../../../combat/stats.js";
import { CombatManager } from "../../../combat/manager.js";

function names(actors: IAbilityActor[]): string {
    return actors.map((a) => a.name).join(", ");
}

export function EnemyDamage(basePower: number): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Strikes the target with beastly ferocity.",
        onExecute: (ctx) => {
            let dealt = 0;
            ctx.targets.forEach((t) => {
                dealt += CombatManager.DealDamage(ctx.actor.combat, t.combat, ctx.targeting.type, basePower);
            });
            return `dealt ${dealt} damage to ${names(ctx.targets)}`;
        },
    };
}

export function EnemyAoeDamage(basePower: number): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Unleashes a devastating attack upon all foes.",
        onExecute: (ctx) => {
            let dealt = 0;
            ctx.targets.forEach((t) => {
                dealt += CombatManager.DealDamage(ctx.actor.combat, t.combat, ctx.targeting.type, basePower);
            });
            return `devastated ${names(ctx.targets)} for ${dealt} damage`;
        },
    };
}

export function Debuff(stat: keyof IStats, amount: number): IAbilityActiveComponent {
    const modifiers = { [stat]: -amount } as Partial<Record<keyof IStats, number>>;
    const label = stat as string;
    return {
        type: "active",
        flavor_text: `Weakens the target's ${label}.`,
        onExecute: (ctx) => {
            ctx.targets.forEach((t) => CombatManager.ApplyTemporaryModifiers(t.combat, modifiers));
            return `reduced ${names(ctx.targets)}'s ${label} by ${amount}`;
        },
    };
}

export function SelfBuff(stat: keyof IStats, amount: number): IAbilityActiveComponent {
    const modifiers = { [stat]: amount } as Partial<Record<keyof IStats, number>>;
    const label = stat as string;
    return {
        type: "active",
        flavor_text: `Unleashes a surge of inner power.`,
        onExecute: (ctx) => {
            CombatManager.ApplyTemporaryModifiers(ctx.actor.combat, modifiers);
            return `${ctx.actor.name} gained +${amount} ${label}`;
        },
    };
}

export function DrainLife(basePower: number): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Steals life from a foe to mend the caster.",
        onExecute: (ctx) => {
            let dealt = 0;
            ctx.targets.forEach((t) => {
                dealt += CombatManager.DealDamage(ctx.actor.combat, t.combat, ctx.targeting.type, basePower);
            });
            ctx.targets.forEach((t) => CombatManager.Heal(ctx.actor.combat, Math.floor(dealt * 0.5)));
            return `drained ${dealt} life from ${names(ctx.targets)}, recovering health`;
        },
    };
}

export function CorrodeAll(amount: number): IAbilityActiveComponent {
    const modifiers = { strength: -amount, dexterity: -amount } as Partial<Record<keyof IStats, number>>;
    return {
        type: "active",
        flavor_text: "A corrosive aura that eats away at resilience.",
        onExecute: (ctx) => {
            ctx.targets.forEach((t) => CombatManager.ApplyTemporaryModifiers(t.combat, modifiers));
            return `corroded ${names(ctx.targets)}, reducing strength and dexterity by ${amount}`;
        },
    };
}
