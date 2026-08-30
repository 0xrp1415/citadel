import { IStats } from "../../../../procedural-engine/index.js";
import { ERoomType } from "../../../../procedural-engine/room.js";
import { IGameRoomContext } from "../../utils/interface/index.js";
import { ActionHandler } from "../../utils/types.js";

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

        ctx.Broadcast();
        return { ok: true, value: null };
    };
}

export function resolvePlayerAction(ctx: IGameRoomContext): ActionHandler {
    return async (playerId, payload) => {

        if (ctx.DMAdapter.DMState !== "idle") {
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

        let _result = await ctx.DMAdapter.Resolve(`player:${player.Identity.playerId}`, payload)
        ctx.Broadcast();

        let outcome: string;
        if (_result.status === "execute") {
            outcome = ctx.Resolver.Execute(_result.actions, playerId);
        } else if (_result.status === "ambiguous") {
            outcome = ctx.Resolver.Ambiguous(_result);
        } else {
            outcome = ctx.Resolver.NotAllowed(_result.reason);
        }

        let narration = await ctx.DMAdapter.Narrate(`dungeon_master`, outcome);
        ctx.Broadcast();
        return { ok: true, value: narration };
    }
}