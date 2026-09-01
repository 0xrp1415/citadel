import { IAbilityPassiveComponent } from "../../interface.js";
import { IStats } from "../../../combat/stats.js";

function negate(mods: Partial<IStats>): Partial<IStats> {
    const out: Partial<IStats> = {};
    for (const key of Object.keys(mods) as (keyof IStats)[]) {
        out[key] = -mods[key]!;
    }
    return out;
}

export function statBonus(mods: Partial<IStats>): IAbilityPassiveComponent {
    return {
        type: "passive",
        flavor_text: "A permanent enhancement to the body's capacities.",
        onActivate: (ctx) => {
            ctx.actor.ApplyStatModifiers(mods);
        },
        onDeactivate: (ctx) => {
            ctx.actor.ApplyStatModifiers(negate(mods));
        },
    };
}

export function vitalityBonus(amount: number): IAbilityPassiveComponent {
    return {
        type: "passive",
        flavor_text: "A surge of vitality upon acquiring this boon.",
        onActivate: (ctx) => {
            ctx.actor.Heal(amount);
        },
        onDeactivate: () => {},
    };
}
