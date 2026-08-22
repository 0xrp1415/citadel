import { GameRoomParty } from "./party.js";
import { IGameRoomSocketContext } from "./utils/interface/index.js";

const AUTO_DISCONNECT_TIMEOUT = 1000 * 60; // 1 minute

export class GameRoomSocket implements IGameRoomSocketContext {
    private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();
    private party: GameRoomParty;
    private onAutoRemove: (playerId: string) => void;

    constructor(party: GameRoomParty, onAutoRemove: (playerId: string) => void) {
        this.party = party;
        this.onAutoRemove = onAutoRemove;
    }

    private updatePlayerStatus(playerId: string, status: "connected" | "disconnected"): boolean {
        let player = this.party.getPlayer(playerId);
        if (!player) return false;

        player.status = status;
        return true;
    }

    public handlePlayerConnect(playerId: string, socketId: string): boolean {
        let player = this.party.getPlayer(playerId);

        if (!player) return false;

        player.Socket.SocketId = socketId;

        if (player.status !== "in-run" && player.status !== "ready") {
            this.updatePlayerStatus(playerId, "connected");
        }

        let timer = this.disconnectTimers.get(playerId);
        if (timer) {
            clearTimeout(timer);
            this.disconnectTimers.delete(playerId);
        }

        return true;
    }

    public handlePlayerDisconnect(playerId: string): boolean {
        let player = this.party.getPlayer(playerId);

        if (!player) return false;

        player.Socket.SocketId = null;
        let timer = setTimeout(() => {
            this.disconnectTimers.delete(playerId);
            this.onAutoRemove(playerId);
        }, AUTO_DISCONNECT_TIMEOUT);

        this.disconnectTimers.set(playerId, timer);
        return this.updatePlayerStatus(playerId, "disconnected");
    }
}
