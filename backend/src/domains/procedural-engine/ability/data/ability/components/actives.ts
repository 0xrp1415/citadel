import { IAbilityActiveComponent, IAbilityActor, IAbilityActiveContext } from "../../../interface.js";
import { IStats } from "../../../../entity/stats.js";

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

function enemyGate(ctx: IAbilityActiveContext): { gate: NonNullable<IAbilityActiveContext["gate"]>; actors: IAbilityActor[] } | null {
    if (ctx.targeting.kind !== "enemy" || !ctx.gate) return null;
    return { gate: ctx.gate, actors: ctx.targets };
}

function breakGate(ctx: IAbilityActiveContext, verb: string, detail: string): string | null {
    const target = enemyGate(ctx);
    if (!target) return null;
    if (target.gate.opened) return `${verb} but the passage is already open`;
    target.gate.open();
    return `${verb} the ${target.gate.type ?? "sealed"} trial ${detail}, forcing the passage open`;
}

export function Damage(basePower: number): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Strikes the target with overwhelming force.",
        onExecute: (ctx) => {
            const gate = enemyGate(ctx);
            if (gate) {
                const amount = scaled(basePower, ctx.actor.level);
                return breakGate(ctx, "smashed", `with ${amount} force`) ?? `dealt ${amount} damage to ${names(gate.actors)}`;
            }
            const amount = scaled(basePower, ctx.actor.level);
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
            const gate = breakGate(ctx, "seared", "with arcane force");
            if (gate) return gate;
            const amount = scaled(basePower, ctx.actor.level) + 4;
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
            const amount = scaled(basePower, ctx.actor.level);
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
            const gate = enemyGate(ctx);
            if (gate) {
                return breakGate(ctx, "ravaged", "with a withering strike") ?? `ravaged ${names(gate.actors)}`;
            }
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
            actual.forEach((a) => a.ApplyStatModifiers(modifiers));
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
        onExecute: (ctx) => {
            if (ctx.targeting.kind === "enemy" && ctx.gate) {
                return breakGate(ctx, "rattled", "off balance") ?? `staggered ${names(ctx.targets)}`;
            }
            return `staggered ${names(ctx.targets)}`;
        },
    };
}

export function Stun(): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Overwhelms the target into helplessness.",
        onExecute: (ctx) => {
            if (ctx.targeting.kind === "enemy" && ctx.gate) {
                return breakGate(ctx, "silenced", "into stillness") ?? `stunned ${names(ctx.targets)}`;
            }
            return `stunned ${names(ctx.targets)}`;
        },
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
        onExecute: (ctx) => {
            if (ctx.targeting.kind === "enemy" && ctx.gate) {
                return breakGate(ctx, "unraveleld", "to reveal its secret") ?? `uncovered a hidden secret`;
            }
            return `uncovered a hidden secret`;
        },
    };
}

export function UnlockGate(): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Forces or bypasses a sealed passage.",
        onExecute: (ctx) => {
            if (ctx.gate) {
                if (ctx.gate.opened) return "the gate is already open";
                ctx.gate.open();
                return `forced the gate to yield`;
            }
            return "there is no sealed passage here to unlock";
        },
    };
}

export function DrainLife(basePower: number): IAbilityActiveComponent {
    return {
        type: "active",
        flavor_text: "Steals life from a foe to mend the caster.",
        onExecute: (ctx) => {
            const amount = scaled(basePower, ctx.actor.level);
            if (ctx.targeting.kind === "enemy" && ctx.gate) {
                ctx.actor.Heal(Math.floor(amount * 0.5));
                return (breakGate(ctx, "drained", `of ${amount} vitality`) ?? `drained ${amount} life from ${names(ctx.targets)}`) + `, recovering health`;
            }
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
