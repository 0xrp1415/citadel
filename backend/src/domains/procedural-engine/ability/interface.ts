import { IStats } from "../combat/stats.js";
import { EntityCombat } from "../combat/entity/combat.js";

export type TAbilityTargetKind = "enemy" | "ally" | "self" | "any";
export type TAbilityTargetScope = "single" | "all" | "self";

export interface IAbilityTargeting {
    kind: TAbilityTargetKind;
    scope: TAbilityTargetScope;
    type: "physical" | "magical";
}

export interface IAbility {
    id: string;
    name: string;
    flavor_text: string;

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
    readonly combat: EntityCombat;
    name: string;
    scale_factor: number;
}

export interface IAbilityActiveContext {
    actor: IAbilityActor;
    allies: IAbilityActor[];
    targets: IAbilityActor[];
    targeting: IAbilityTargeting;
}

export interface IAbilityPassiveContext {
    actor: IAbilityActor;
}

export interface IAbilityPassiveComponent extends IAbilityComponentBase {
    type: "passive";
    onActivate: (context: IAbilityPassiveContext) => void;
    onDeactivate: (context: IAbilityPassiveContext) => void;
}

export interface IAbilityActiveComponent extends IAbilityComponentBase {
    type: "active";
    onExecute: (context: IAbilityActiveContext) => string | Promise<string>;
}
