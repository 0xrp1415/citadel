import { IStats, IMap } from "../../procedural-engine/domain.js";
import { IRoomMetadata } from "../../procedural-engine/map.js";
import { Player } from "../player.js";
import { IGameRoomConfig } from "../types.js";
import type { GameRoomState } from "./abstract.js";

export interface IGameRoomContext {
    get Config(): IGameRoomConfig;
    get Players(): Player[];
    get Host(): string;
    get Floor(): number;
    get Map(): IMap | null;
    get CurrentRoom(): IRoomMetadata;
    setState(state: GameRoomState): void;
    getPlayer(userId: string): Player | undefined;
    getPlayerByPlayerId(playerId: string): Player | undefined;
    setPlayersStatus(status: Player["status"]): void;
    changePlayerStatsBy(userId: string, stat: keyof IStats, amount: number): boolean;
    removePlayer(userId: string): boolean;
    GenerateRoom(): void;
    nextFloor(): void;
    resetRun(): void;
}
