import { IAbilityActiveComponent, IAbilityActor } from "../../../interface.js";

function names(actors: IAbilityActor[]): string {
    return actors.map((a) => a.name).join(", ");
}

function damageAmount(level: number): number {
    return 10 + Math.floor(level * 2);
}

function healAmount(level: number): number {
    return 12 + Math.floor(level * 2);
}

export const Damage: IAbilityActiveComponent = {
    type: "active",
    flavor_text: "Strikes the target with overwhelming force.",
    onExecute: (ctx) => {
        const amount = damageAmount(ctx.actor.level);
        const hit = ctx.targets.length ? names(ctx.targets) : ctx.actor.name;
        ctx.targets.forEach((t) => t.TakeDamage(amount));
        return `dealt ${amount} damage to ${hit}`;
    },
};

export const ArcaneDamage: IAbilityActiveComponent = {
    type: "active",
    flavor_text: "Unleashes crackling magical force.",
    onExecute: (ctx) => {
        const amount = damageAmount(ctx.actor.level) + 4;
        ctx.targets.forEach((t) => t.TakeDamage(amount));
        return `arcane blast seared ${names(ctx.targets)} for ${amount} damage`;
    },
};

export const Heal: IAbilityActiveComponent = {
    type: "active",
    flavor_text: "Mends wounds and restores vigor.",
    onExecute: (ctx) => {
        const amount = healAmount(ctx.actor.level);
        const healed = ctx.targeting.kind === "self" ? [ctx.actor] : ctx.targets;
        const actual = healed.length ? healed : ctx.allies;
        actual.forEach((a) => a.Heal(amount));
        return `healed ${names(actual)} for ${amount}`;
    },
};

export const Ward: IAbilityActiveComponent = {
    type: "active",
    flavor_text: "Raises a protective ward.",
    onExecute: (ctx) => {
        const warded = ctx.targeting.kind === "self" ? [ctx.actor] : ctx.targets;
        const actual = warded.length ? warded : ctx.allies;
        return `raised a ward over ${names(actual)}`;
    },
};

export const BuffStrength: IAbilityActiveComponent = {
    type: "active",
    flavor_text: "Tempers the target's brute force.",
    onExecute: (ctx) => {
        const buffed = ctx.targeting.kind === "self" ? [ctx.actor] : ctx.targets;
        const actual = buffed.length ? buffed : ctx.allies;
        actual.forEach((a) => a.ApplyStatModifiers({ strength: 10 }));
        return `granted +10 strength to ${names(actual)}`;
    },
};

export const BuffDexterity: IAbilityActiveComponent = {
    type: "active",
    flavor_text: "Hardens the target's body and endurance.",
    onExecute: (ctx) => {
        const buffed = ctx.targeting.kind === "self" ? [ctx.actor] : ctx.targets;
        const actual = buffed.length ? buffed : ctx.allies;
        actual.forEach((a) => a.ApplyStatModifiers({ dexterity: 10 }));
        return `granted +10 dexterity to ${names(actual)}`;
    },
};

export const BuffIntelligence: IAbilityActiveComponent = {
    type: "active",
    flavor_text: "Sharpens the target's mind and magic.",
    onExecute: (ctx) => {
        const buffed = ctx.targeting.kind === "self" ? [ctx.actor] : ctx.targets;
        const actual = buffed.length ? buffed : ctx.allies;
        actual.forEach((a) => a.ApplyStatModifiers({ intelligence: 10 }));
        return `granted +10 intelligence to ${names(actual)}`;
    },
};

export const BuffWisdom: IAbilityActiveComponent = {
    type: "active",
    flavor_text: "Deepens the target's insight and instinct.",
    onExecute: (ctx) => {
        const buffed = ctx.targeting.kind === "self" ? [ctx.actor] : ctx.targets;
        const actual = buffed.length ? buffed : ctx.allies;
        actual.forEach((a) => a.ApplyStatModifiers({ wisdom: 10 }));
        return `granted +10 wisdom to ${names(actual)}`;
    },
};

export const BuffAgility: IAbilityActiveComponent = {
    type: "active",
    flavor_text: "Quicksilver speed suffuses the target.",
    onExecute: (ctx) => {
        const buffed = ctx.targeting.kind === "self" ? [ctx.actor] : ctx.targets;
        const actual = buffed.length ? buffed : ctx.allies;
        actual.forEach((a) => a.ApplyStatModifiers({ agility: 10 }));
        return `granted +10 agility to ${names(actual)}`;
    },
};

export const Stagger: IAbilityActiveComponent = {
    type: "active",
    flavor_text: "Knocks the target off balance.",
    onExecute: (ctx) => `staggered ${names(ctx.targets)}`,
};

export const Stun: IAbilityActiveComponent = {
    type: "active",
    flavor_text: "Overwhelms the target into helplessness.",
    onExecute: (ctx) => `stunned ${names(ctx.targets)}`,
};

export const Cleanse: IAbilityActiveComponent = {
    type: "active",
    flavor_text: "Purges poisons, curses, and lingering harm.",
    onExecute: (ctx) => {
        const cleansed = ctx.targeting.kind === "self" ? [ctx.actor] : ctx.targets;
        return `cleansed ${names(cleansed)} of afflictions`;
    },
};

export const RevealSecret: IAbilityActiveComponent = {
    type: "active",
    flavor_text: "Scans the area to uncover hidden things.",
    onExecute: () => `uncovered a hidden secret`,
};

export const UnlockGate: IAbilityActiveComponent = {
    type: "active",
    flavor_text: "Forces or bypasses a sealed passage.",
    onExecute: () => `forced the gate to yield`,
};

export const DrainLife: IAbilityActiveComponent = {
    type: "active",
    flavor_text: "Steals life from a foe to mend the caster.",
    onExecute: (ctx) => {
        const amount = damageAmount(ctx.actor.level);
        const stolen = ctx.targets.reduce((acc, t) => acc + 1, 0);
        ctx.targets.forEach((t) => t.TakeDamage(amount));
        ctx.targets.forEach(() => ctx.actor.Heal(Math.floor(amount * 0.5)));
        return `drained ${amount} life from ${names(ctx.targets)}${stolen ? `, recovering health` : ""}`;
    },
};

export const Revive: IAbilityActiveComponent = {
    type: "active",
    flavor_text: "Drags a fallen comrade back from the brink.",
    onExecute: (ctx) => {
        const revived = ctx.targets.length ? names(ctx.targets) : ctx.allies.map((a) => a.name).join(", ");
        return `revived ${revived}`;
    },
};