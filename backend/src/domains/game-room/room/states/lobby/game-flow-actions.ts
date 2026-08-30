import { IGameRoomContext } from "../../utils/interface/index.js";
import { ActionHandler, TResult } from "../../utils/types.js";
import { InRunState } from "../run/index.js";

export function toggleReady(ctx: IGameRoomContext): ActionHandler {
    return (playerId) => {
        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }

        if (ctx.Party.Leader === playerId) {
            return { ok: false, status: 403, error: "Leader cannot toggle ready status" };
        }

        if (player.status === "in-run") {
            return { ok: false, status: 409, error: "Cannot change ready status while in run" };
        }

        if (player.Socket.SocketId === null) {
            return { ok: false, status: 409, error: "Cannot change ready status while disconnected" };
        }

        player.status = player.status === "ready" ? "connected" : "ready";
        ctx.Broadcaster.RoomUpdate();
        return { ok: true, value: null };
    };
}

export function startGame(ctx: IGameRoomContext): ActionHandler {
    return (playerId) => {
        if (ctx.Party.Leader !== playerId) {
            return { ok: false, status: 403, error: "Only the leader can start the game" };
        }
        return validateAndStart(ctx);
    };
}

export function confirmStart(ctx: IGameRoomContext): ActionHandler {
    return (playerId) => {
        if (ctx.Party.Leader !== playerId) {
            return { ok: false, status: 403, error: "Only the leader can start the game" };
        }

        const leaderPlayer = ctx.Party.getPlayer(playerId);
        if (leaderPlayer && leaderPlayer.Socket.SocketId === null) {
            return { ok: false, status: 409, error: "Leader is disconnected" };
        }

        const ghosts = ctx.Party.Players.filter(
            (p) => p.Socket.SocketId === null && ctx.Party.Leader !== p.Identity.playerId,
        );

        if (ghosts.length === 0) {
            return { ok: false, status: 409, error: "No disconnected players to remove" };
        }

        for (const ghost of ghosts) {
            ctx.Party.removePlayer(ghost.Identity.playerId);
        }

        ctx.Broadcaster.RoomUpdate();
        return validateAndStart(ctx);
    };
}

function validateAndStart(ctx: IGameRoomContext): TResult<unknown> {
    const config = ctx.Identity.Config;
    const players = ctx.Party.Players;
    const leaderId = ctx.Party.Leader;

    if (players.length > config.maxPlayers) {
        return { ok: false, status: 409, error: "Too many players in the room" };
    }

    const allReady = players.every(
        (p) => p.status === "ready" || p.Identity.playerId === leaderId,
    );

    if (!allReady) {
        const disconnected = players.filter(
            (p) => p.Socket.SocketId === null && p.Identity.playerId !== leaderId,
        ).length;

        return {
            ok: false,
            status: 409,
            error:
                disconnected > 0
                    ? `Not all players are ready (${disconnected} disconnected). Use confirm_start to remove them.`
                    : "Not all players are ready",
        };
    }

    if (leaderId) {
        const leaderPlayer = ctx.Party.getPlayer(leaderId);
        if (leaderPlayer && leaderPlayer.Socket.SocketId === null) {
            return { ok: false, status: 409, error: "Leader is disconnected" };
        }
    }

    ctx.StateMachine.TransitionTo(new InRunState(ctx));
    return { ok: true, value: null };
}