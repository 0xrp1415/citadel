import { IStats } from "../entity/stats.js";
import { MulberryRNG } from "../rng.js";

export interface IAbilityRarity {
    name: string;
    rarityLevel: number;
}

export type TAbilityTargetKind = "enemy" | "ally" | "self" | "any";
export type TAbilityTargetScope = "single" | "all" | "self";

export interface IAbilityTargeting {
    kind: TAbilityTargetKind;
    scope: TAbilityTargetScope;
}

export interface IAbility {
    name: string;
    flavor_text: string;

    rarity: IAbilityRarity;
    minimumLevel: number;
    minimumStats: Partial<Record<keyof IStats, number>>;

    targeting: IAbilityTargeting;
    components: TAbilityComponent[];
}

export type TAbilityComponent = IAbilityPassiveComponent | IAbilityActiveComponent;

export interface IAbilityComponentBase {
    flavor_text: string;
}


export interface IAbilityActor {
    name: string;
    level: number;
    alive: boolean;
    stats: IStats;
    modifiers: IStats;
    maxHealth: number;
    currentHealth: number;

    Heal(amount: number): void;
    TakeDamage(amount: number): void;
    ApplyStatModifiers(modifiers: Partial<Record<keyof IStats, number>>): void;
}

export interface IAbilityActiveContext {
    actor: IAbilityActor;
    allies: IAbilityActor[];
    targets: IAbilityActor[];
    targeting: IAbilityTargeting;
    rng: MulberryRNG;
}

export interface IAbilityPassiveContext {
    actor: IAbilityActor;
    modifiers: Partial<Record<keyof IStats, number>>;
}


export interface IAbilityPassiveComponent extends IAbilityComponentBase {
    type: "passive";
    statModifiers: Partial<Record<keyof IStats, number>>;
}

export interface IAbilityActiveComponent extends IAbilityComponentBase {
    type: "active";
    onExecute: (context: IAbilityActiveContext) => string | Promise<string>;
}
