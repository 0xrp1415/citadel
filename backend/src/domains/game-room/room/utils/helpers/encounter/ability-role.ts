import { IAbility } from "../../../../../procedural-engine/index.js";

const HEAL_ABILITY_IDS = new Set(["devour", "soul_tear"]);
const BUFF_TARGET_KIND = "self";

export type AbilityRole = "attack" | "buff" | "heal";

export function classifyAbility(ability: IAbility): AbilityRole {
    if (HEAL_ABILITY_IDS.has(ability.id)) return "heal";
    if (ability.targeting.kind === BUFF_TARGET_KIND) return "buff";
    return "attack";
}

export function isSingleTargetEnemyAbility(ability: IAbility): boolean {
    return ability.targeting.kind === "enemy" && ability.targeting.scope === "single";
}

export function isMultiTargetAbility(ability: IAbility): boolean {
    return ability.targeting.scope === "all";
}

export function isSelfAbility(ability: IAbility): boolean {
    return ability.targeting.kind === "self" || ability.targeting.scope === "self";
}
