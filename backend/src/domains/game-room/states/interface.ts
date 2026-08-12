import { Player } from "../player.js";
import { IGameRoomConfig } from "../types.js";
import type { GameRoomState } from "./abstract.js";

export interface IGameRoomContext {
    get Config(): IGameRoomConfig;
    get Players(): Player[];
    get Host(): string;
    setState(state: GameRoomState): void;
    getPlayer(playerId: string): Player | undefined;
    setPlayersStatus(status: Player["status"]): void;
}
