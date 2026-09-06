export type CombatActionType = "attack" | "ability" | "defend" | "revive";

export interface CombatAction {
    type: CombatActionType;
    abilityId?: string;
}

export type CombatTarget =
    | { kind: "enemy"; id: string }
    | { kind: "ally"; id: string }
    | { kind: "self" };
