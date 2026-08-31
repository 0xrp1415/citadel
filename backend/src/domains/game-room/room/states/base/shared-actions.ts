import { IGameRoomContext } from "../../utils/interface/index.js";
import { ActionHandler } from "../../utils/types.js";

export function playerConnect(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        const { socketId } = payload as { socketId: string };
        ctx.Socket.handlePlayerConnect(playerId, socketId);
        ctx.Broadcaster.RoomUpdate();
        ctx.Broadcaster.MessageUpdate();
        return { ok: true, value: null };
    };
}

export function playerDisconnect(ctx: IGameRoomContext): ActionHandler {
    return (playerId) => {
        ctx.Socket.handlePlayerDisconnect(playerId);
        const player = ctx.Party.getPlayer(playerId);
        if (player) {
            ctx.Confirmation.OnPlayerDisconnect(player.Identity.playerPublicId);
        }
        ctx.Broadcaster.RoomUpdate();
        return { ok: true, value: null };
    };
}