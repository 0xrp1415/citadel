import { PlayerPublic, PlayerRunEntityItem, PlayerRunEntityJSON, PlayerRunEntityAbility, PlayerRunEntityArmors, PlayerRunEntityWeapon } from "../player/types.js";
import { IGameRoomConfig } from "./utils/types.js";
import { IItem, IPassageEvent } from "../../procedural-engine/index.js";
import { EncounterPublicState } from "./utils/interface/encounter.js";
import { IVoteJSON } from "./utils/helpers/confirmation/types.js";
import { StarterKitId } from "../player/kits.js";

export interface IExitPublicJSON {
    targetRoomId: number;
    event: IPassageEvent | null;
    unlocked: boolean;
}

export interface IEnemyPublicJSON {
    id: string;
    name: string;
    threatLevel: number;
    currentHealth: number;
    maxHealth: number;
    alive: boolean;
    description: string;
}

export interface IRoomPublicJSON {
    type: string;
    baseDifficulty: number;
    distanceBonus: number;
    isCurrentRoom: boolean;
    isVisited: boolean;
    enemies: IEnemyPublicJSON[];
    exits: {
        north: IExitPublicJSON | null;
        south: IExitPublicJSON | null;
        east: IExitPublicJSON | null;
        west: IExitPublicJSON | null;
    };
    droppedItems: IItem[];
}

export interface IMapPublicJSON {
    rooms: IRoomPublicJSON[];
    startRoomIndex: number;
    
}

export interface IMerchantDetails {
    stock: PlayerRunEntityItem[];
    available: boolean;
}

export interface RunSummaryPlayer {
    readonly name: string;
    readonly kit: StarterKitId;
    readonly level: number;
    readonly xp: number;
    readonly gold: number;
    readonly health: { CurrentHealth: number; MaxHealth: number };
    readonly weapon: PlayerRunEntityWeapon | null;
    readonly armor: PlayerRunEntityArmors;
    readonly abilities: PlayerRunEntityAbility[];
    readonly activeAbilities: { slot: number; id: string }[];
    readonly inventory: PlayerRunEntityItem[];
    readonly base_stats: Record<string, number>;
    readonly stat_modifiers: Record<string, number>;
}

export interface RunSummary {
    readonly floor: number;
    readonly roomsExplored: number;
    readonly enemiesDefeated: number;
    readonly totalXP: number;
    readonly totalGold: number;
    readonly itemsFound: number;
    readonly players: RunSummaryPlayer[];
}

export interface GameRoomPublicData {
    readonly players: PlayerPublic[];
    readonly totalPlayers: number;
    readonly inviteCode: string;
    readonly config: IGameRoomConfig;
    readonly status: string;
    readonly floor: number;
    readonly currentRoom: { type: string; index: number };
    readonly map: IMapPublicJSON | null;
    readonly hostPublicId: string | null;
    readonly encounter: EncounterPublicState;
    readonly merchantDetails: IMerchantDetails | null;
    readonly currentVote: IVoteJSON | null;
    readonly runSummary: RunSummary | null;
    readonly acceptedPlayerIds: string[];
}