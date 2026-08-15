import { IStats } from "../../procedural-engine/domain.js";
import { Player, PlayerRunEntityRace } from "../player.js";
import { IGameRoomConfig } from "../types.js";
import type { GameRoomState } from "./abstract.js";

export interface IGameRoomContext {
    get Config(): IGameRoomConfig;
    get Players(): Player[];
    get Host(): string;
    setState(state: GameRoomState): void;
    getPlayer(userId: string): Player | undefined;
    getPlayerByPlayerId(playerId: string): Player | undefined;
    setPlayersStatus(status: Player["status"]): void;
    setPlayerRace(userId: string, race: PlayerRunEntityRace): boolean;
    changePlayerStatsBy(userId: string, stat: keyof IStats, amount: number): boolean;
    removePlayer(userId: string): boolean;
}
