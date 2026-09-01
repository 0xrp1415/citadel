import { IStats } from "../../../../procedural-engine/index.js";
import { TGearSlot } from "../../../../procedural-engine/gear/interface.js";
import { IGameRoomContext } from "../../utils/interface/index.js";
import { ActionHandler } from "../../utils/types.js";
import { enterRoom } from "./enter-room.js";

export function changePlayerStats(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        const { stat, amount } = payload as { stat: keyof IStats; amount: number };

        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }

        if (amount === 0) {
            return { ok: false, status: 400, error: "No change requested" };
        }

        if (amount > 0 && !player.Progression.canAffordSkill(amount)) {
            return { ok: false, status: 400, error: "Not enough skill points" };
        }

        const success = player.Combat.increaseBaseStatBy(stat, amount, player.Progression.Level);
        if (!success) {
            return { ok: false, status: 400, error: "Failed to change player stats" };
        }

        player.Progression.spendSkillPoints(amount);

        ctx.Broadcaster.RoomUpdate();
        return { ok: true, value: null };
    };
}

export function equipItem(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }

        const { index } = (payload ?? {}) as { index?: number };
        if (typeof index !== "number" || index < 0) {
            return { ok: false, status: 400, error: "Invalid payload" };
        }

        const success = player.Inventory.Equip(player.Combat.EffectiveStats, index, player.Combat);
        if (!success) {
            return { ok: false, status: 400, error: "Could not equip that item" };
        }

        ctx.Broadcaster.RoomUpdate();
        return { ok: true, value: null };
    };
}

export function useInventoryItem(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }

        const { id } = (payload ?? {}) as { id?: string };
        if (typeof id !== "string") {
            return { ok: false, status: 400, error: "Invalid payload" };
        }

        if (!player.Inventory.useItem(id, player.Combat, player.Abilities)) {
            return { ok: false, status: 400, error: "Could not use that item" };
        }

        ctx.Broadcaster.RoomUpdate();
        return { ok: true, value: null };
    };
}

const UNEQUIP_SLOTS: TGearSlot[] = ["weapon", "head", "chest", "greaves"];

export function unequipItem(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }

        const { slot } = (payload ?? {}) as { slot?: string };
        if (typeof slot !== "string" || UNEQUIP_SLOTS.indexOf(slot as TGearSlot) === -1) {
            return { ok: false, status: 400, error: "Invalid payload" };
        }

        const success = player.Inventory.Unequip(slot as TGearSlot, player.Combat);
        if (!success) {
            return { ok: false, status: 400, error: "Nothing to unequip there" };
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