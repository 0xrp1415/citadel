import type { EnemyEntity } from "../../../../procedural-engine/index.js";
import type { Player } from "../../../player/index.js";
import { CombatAction, CombatTarget } from "../helpers/encounter/types.js";

export type EncounterPhase = "" | "vote" | "combat";

export interface InitiativeEntry {
    kind: "player" | "enemy";
    id: string;
    name: string;
    speed: number;
    alive: boolean;
}

export interface EncounterPublicState {
    active: boolean;
    phase: EncounterPhase;
    round: number;
    currentTurnId: string | null;
    currentTurnKind: "player" | "enemy" | null;
    initiative: InitiativeEntry[];
    playerActions: Record<string, CombatAction | null>;
    playerTargets: Record<string, CombatTarget>;
    log: string[];
    downedPlayerIds: string[];
    enemies: {
        id: string;
        name: string;
        threatLevel: number;
        currentHealth: number;
        maxHealth: number;
        alive: boolean;
        defending: boolean;
    }[];
}

export interface IGameRoomEncounterContext {
    StartEncounter(enemies: EnemyEntity[]): void;
    SubmitAction(player: Player, action: CombatAction): boolean;
    SubmitTarget(player: Player, target: CombatTarget): boolean;
    OnPlayerDisconnect(playerId: string): void;
    readonly Active: boolean;
    readonly Phase: EncounterPhase;
    readonly State: EncounterPublicState;
}
