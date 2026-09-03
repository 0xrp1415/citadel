import { IAbilityPassiveComponent } from "../../interface.js";
import { IStats } from "../../../combat/stats.js";
import { CombatManager } from "../../../combat/manager.js";

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
            CombatManager.ApplyPermanentModifiers(ctx.actor.combat, mods);
        },
        onDeactivate: (ctx) => {
            CombatManager.ApplyPermanentModifiers(ctx.actor.combat, negate(mods));
        },
    };
}

export function vitalityBonus(amount: number): IAbilityPassiveComponent {
    return {
        type: "passive",
        flavor_text: "A surge of vitality upon acquiring this boon.",
        onActivate: (ctx) => {
            CombatManager.Heal(ctx.actor.combat, amount);
        },
        onDeactivate: () => {},
    };
}
