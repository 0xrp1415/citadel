import { IAbilityActiveComponent, IAbilityActor } from "../../../ability/interface.js";
import { IStats } from "../../../combat/stats.js";

function names(actors: IAbilityActor[]): string {
    return actors.map((a) => a.name).join(", ");
}

function scaled(basePower: number, level: number): number {
    return basePower + Math.floor(level * 1.5);
}

export function EnemyDamage(basePower: number): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Strikes the target with beastly ferocity.",
        onExecute: (ctx) => {
            const amount = scaled(basePower, ctx.actor.scale_factor);
            ctx.targets.forEach((t) => t.TakeDamage(amount));
            return `dealt ${amount} damage to ${names(ctx.targets)}`;
        },
    };
}

export function EnemyAoeDamage(basePower: number): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Unleashes a devastating attack upon all foes.",
        onExecute: (ctx) => {
            const amount = scaled(basePower, ctx.actor.scale_factor);
            ctx.targets.forEach((t) => t.TakeDamage(amount));
            return `devastated ${names(ctx.targets)} for ${amount} damage`;
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
            ctx.targets.forEach((t) => t.ApplyTemporaryStatModifiers(modifiers));
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
            ctx.actor.ApplyTemporaryStatModifiers(modifiers);
            return `${ctx.actor.name} gained +${amount} ${label}`;
        },
    };
}

export function DrainLife(basePower: number): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Steals life from a foe to mend the caster.",
        onExecute: (ctx) => {
            const amount = scaled(basePower, ctx.actor.scale_factor);
            ctx.targets.forEach((t) => t.TakeDamage(amount));
            ctx.targets.forEach(() => ctx.actor.Heal(Math.floor(amount * 0.5)));
            return `drained ${amount} life from ${names(ctx.targets)}, recovering health`;
        },
    };
}

export function CorrodeAll(amount: number): IAbilityActiveComponent {
    const modifiers = { strength: -amount, dexterity: -amount } as Partial<Record<keyof IStats, number>>;
    return {
        type: "active",
        flavor_text: "A corrosive aura that eats away at resilience.",
        onExecute: (ctx) => {
            ctx.targets.forEach((t) => t.ApplyTemporaryStatModifiers(modifiers));
            return `corroded ${names(ctx.targets)}, reducing strength and dexterity by ${amount}`;
        },
    };
}
