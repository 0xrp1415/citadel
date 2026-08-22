import { Player } from "../../../player/index.js";
import { PlayerPublic } from "../../../player/types.js";

export interface IGameRoomPartyContext {
    addPlayer(player: Player): Player | null;
    removePlayer(playerId: string): boolean;
    setLeader(playerId: string): boolean;
    getPlayer(playerId: string): Player | undefined;
    readonly Players: Player[];
    readonly PlayerCount: number;
    readonly Leader: string | null;
    readonly PlayerPublicData: PlayerPublic[];
}
