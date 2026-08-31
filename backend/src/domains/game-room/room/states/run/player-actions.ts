import { IStats } from "../../../../procedural-engine/index.js";
import { ERoomType } from "../../../../procedural-engine/room.js";
import { IGameRoomContext } from "../../utils/interface/index.js";
import { ActionHandler } from "../../utils/types.js";
import { enterRoom } from "./enter-room.js";

export function changePlayerStats(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        const currentRoom = ctx.Map.CurrentRoom;
        if (!currentRoom) {
            return { ok: false, status: 409, error: "No current room" };
        }

        if (currentRoom.type !== ERoomType.GRACE) {
            return { ok: false, status: 403, error: "Stat changes can only be made at a grace room" };
        }

        const { stat, amount } = payload as { stat: keyof IStats; amount: number };

        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }

        const success = player.Combat.increaseBaseStatBy(stat, amount, player.Progression.Level);
        if (!success) {
            return { ok: false, status: 400, error: "Failed to change player stats" };
        }

        ctx.Broadcaster.RoomUpdate();
        return { ok: true, value: null };
    };
}

export function confirmPlayerAction(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }
        if (!ctx.Confirmation.HasActive) {
            return { ok: false, status: 409, error: "No vote is pending" };
        }

        const { accept } = (payload ?? {}) as { accept?: boolean };
        if (typeof accept !== "boolean") {
            return { ok: false, status: 400, error: "Invalid payload" };
        }

        ctx.Confirmation.Vote(player.Identity.playerPublicId, accept);
        return { ok: true, value: null };
    };
}

export function resolvePlayerAction(ctx: IGameRoomContext): ActionHandler {
    return async (playerId, payload) => {

        if (ctx.Resolver.IsBusy) {
            return { ok: false, status: 403, error: "Dungeon Master is not idle" };
        }
        const currentRoom = ctx.Map.CurrentRoom;
        if (!currentRoom) {
            return { ok: false, status: 409, error: "No current room" };
        }

        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }
        if (typeof payload !== "string")
            return { ok: false, status: 400, error: "Invalid payload" };
        
        await ctx.Resolver.HandlePlayerAction(payload, `player:${player.Identity.playerPublicId}`);
        return { ok: true, value: null };
    }
}