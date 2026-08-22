import { Player } from "../../../player/index.js";
import { IGameRoomContext } from "../../utils/interface/index.js";
import { ActionHandler } from "../../utils/types.js";

export function joinPlayer(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        if (ctx.Party.getPlayer(playerId)) {
            return { ok: false, status: 409, error: "Player already in room" };
        }

        if (ctx.Party.PlayerCount >= ctx.Identity.Config.maxPlayers) {
            return { ok: false, status: 409, error: "Room is full" };
        }

        if (!payload || typeof payload !== "object" || !("player" in payload) || !payload.player) {
            return { ok: false, status: 400, error: "Missing required player in payload" };
        }
        const { player } = payload as { player: Player };
        ctx.Party.addPlayer(player);
        ctx.Broadcast();
        return { ok: true, value: null };
    };
}

export function leavePlayer(ctx: IGameRoomContext): ActionHandler {
    return (playerId) => {
        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }

        ctx.Party.removePlayer(playerId);
        ctx.Broadcast();
        return { ok: true, value: null };
    };
}

export function kickPlayer(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        if (ctx.Party.Leader !== playerId) {
            return { ok: false, status: 403, error: "Only the leader can kick players" };
        }

        const { targetPlayerId } = payload as { targetPlayerId: string };

        if (playerId === targetPlayerId) {
            return { ok: false, status: 400, error: "Leader cannot kick themselves" };
        }

        const target = ctx.Party.getPlayer(targetPlayerId);
        if (!target) {
            return { ok: false, status: 404, error: "Target player not found" };
        }

        ctx.Party.removePlayer(targetPlayerId);
        ctx.Broadcast();
        return { ok: true, value: null };
    };
}