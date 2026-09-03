import { PlayerPublic } from "../player/types.js";
import { IGameRoomConfig } from "./utils/types.js";
import { IPassageEvent } from "../../procedural-engine/index.js";
import { EncounterPublicState } from "./utils/interface/encounter.js";

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
}

export interface IMapPublicJSON {
    rooms: IRoomPublicJSON[];
    startRoomIndex: number;
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
}