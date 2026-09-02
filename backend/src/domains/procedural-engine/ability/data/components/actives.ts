import { IAbilityActiveComponent, IAbilityActor, IAbilityActiveContext } from "../../interface.js";
import { IStats } from "../../../combat/stats.js";

function names(actors: IAbilityActor[]): string {
    return actors.map((a) => a.name).join(", ");
}

function scaled(basePower: number, level: number): number {
    return basePower + Math.floor(level * 1.5);
}

function recipients(ctx: {
    targeting: { kind: "self" | "ally" | "enemy" | "any"; scope: string };
    actor: IAbilityActor;
    allies: IAbilityActor[];
    targets: IAbilityActor[];
}): IAbilityActor[] {
    const selected = ctx.targeting.kind === "self" ? [ctx.actor] : ctx.targets;
    return selected.length ? selected : ctx.allies;
}

export function Damage(basePower: number): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Strikes the target with overwhelming force.",
        onExecute: (ctx) => {
            const amount = scaled(basePower, ctx.actor.scale_factor);
            const hit = ctx.targets.length ? names(ctx.targets) : ctx.actor.name;
            ctx.targets.forEach((t) => t.TakeDamage(amount));
            return `dealt ${amount} damage to ${hit}`;
        },
    };
}

export function ArcaneDamage(basePower: number): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Unleashes crackling magical force.",
        onExecute: (ctx) => {
            const amount = scaled(basePower, ctx.actor.scale_factor) + 4;
            ctx.targets.forEach((t) => t.TakeDamage(amount));
            return `arcane blast seared ${names(ctx.targets)} for ${amount} damage`;
        },
    };
}

export function Heal(basePower: number): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Mends wounds and restores vigor.",
        onExecute: (ctx) => {
            const amount = scaled(basePower, ctx.actor.scale_factor);
            const actual = recipients(ctx);
            actual.forEach((a) => a.Heal(amount));
            return `healed ${names(actual)} for ${amount}`;
        },
    };
}

export function MaxHealthHeal(percent: number): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Restores a fraction of the target's maximum vitality.",
        onExecute: (ctx) => {
            const actual = recipients(ctx);
            const amounts = actual.map((a) => {
                const amount = Math.round(a.maxHealth * percent);
                a.Heal(amount);
                return { name: a.name, amount };
            });
            return `healed ${amounts.map((a) => `${a.name} for ${a.amount}`).join(", ")}`;
        },
    };
}

export function CurrentHealthDamage(percent: number): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Strikes away a fraction of the target's current health.",
        onExecute: (ctx) => {
            const hit = ctx.targets.length ? names(ctx.targets) : ctx.actor.name;
            const amounts = ctx.targets.map((t) => {
                const amount = Math.round(t.currentHealth * percent);
                t.TakeDamage(amount);
                return { name: t.name, amount };
            });
            return `struck ${hit} for ${amounts.map((a) => `${a.amount}`).join(", ")} damage`;
        },
    };
}

export function Ward(): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Raises a protective ward.",
        onExecute: (ctx) => {
            const actual = recipients(ctx);
            return `raised a ward over ${names(actual)}`;
        },
    };
}

function Buff(stat: keyof IStats, amount: number): IAbilityActiveComponent {
    const modifiers = { [stat]: amount } as Partial<Record<keyof IStats, number>>;
    const label = stat as string;
    return {
        type: "active",
        flavor_text: `Enhances the target's ${label}.`,
        onExecute: (ctx) => {
            const actual = recipients(ctx);
            actual.forEach((a) => a.ApplyTemporaryStatModifiers(modifiers));
            return `granted +${amount} ${label} to ${names(actual)}`;
        },
    };
}

export const BuffStrength = (amount: number): IAbilityActiveComponent => Buff("strength", amount);
export const BuffDexterity = (amount: number): IAbilityActiveComponent => Buff("dexterity", amount);
export const BuffIntelligence = (amount: number): IAbilityActiveComponent => Buff("intelligence", amount);
export const BuffWisdom = (amount: number): IAbilityActiveComponent => Buff("wisdom", amount);
export const BuffAgility = (amount: number): IAbilityActiveComponent => Buff("agility", amount);

export function Stagger(): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Knocks the target off balance.",
        onExecute: (ctx) => `staggered ${names(ctx.targets)}`,
    };
}

export function Stun(): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Overwhelms the target into helplessness.",
        onExecute: (ctx) => `stunned ${names(ctx.targets)}`,
    };
}

export function Cleanse(): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Purges poisons, curses, and lingering harm.",
        onExecute: (ctx) => `cleansed ${names(recipients(ctx))} of afflictions`,
    };
}

export function RevealSecret(): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Scans the area to uncover hidden things.",
        onExecute: (ctx) => `uncovered a hidden secret`,
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

export function Revive(): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Drags a fallen comrade back from the brink.",
        onExecute: (ctx) => `revived ${names(ctx.targets.length ? ctx.targets : ctx.allies)}`,
    };
}
