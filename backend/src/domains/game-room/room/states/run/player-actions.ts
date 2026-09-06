import { IStats, getItemById, ERoomType, MulberryRNG, rollLoot } from "../../../../procedural-engine/index.js";
import { TGearSlot } from "../../../../procedural-engine/gear/interface.js";
import { IGameRoomContext } from "../../utils/interface/index.js";
import { ActionHandler } from "../../utils/types.js";
import { CombatAction, CombatTarget } from "../../utils/helpers/encounter/types.js";
import { enterRoom } from "./enter-room.js";
import { IItem } from "../../../../procedural-engine/item/base.js";
import { removeMerchantItem } from "../../utils/helpers/map/merchant-stock.js";

function requireAlive(player: { Combat: { Health: { CurrentHealth: number } } }): { ok: false; status: number; error: string } | null {
    if (player.Combat.Health.CurrentHealth <= 0) {
        return { ok: false, status: 403, error: "You are dead and cannot act." };
    }
    return null;
}

export function changePlayerStats(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        const { stat, amount } = payload as { stat: keyof IStats; amount: number };

        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }
        const dead = requireAlive(player);
        if (dead) return dead;

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
        const dead = requireAlive(player);
        if (dead) return dead;

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
        const dead = requireAlive(player);
        if (dead) return dead;

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

export function setActiveAbility(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }
        const dead = requireAlive(player);
        if (dead) return dead;

        const { id, slot } = (payload ?? {}) as { id?: string; slot?: number };
        if (typeof slot !== "number" || slot < 0) {
            return { ok: false, status: 400, error: "Invalid payload" };
        }

        const success =
            typeof id === "string" && id.length > 0
                ? player.Abilities.setActiveAbilityById(id, slot)
                : player.Abilities.clearActiveAbilitySlot(slot);
        if (!success) {
            return { ok: false, status: 400, error: "Could not assign that ability" };
        }

        ctx.Broadcaster.RoomUpdate();
        return { ok: true, value: null };
    };
}

export function unequipItem(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }
        const dead = requireAlive(player);
        if (dead) return dead;

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

export function vote(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }
        if (!ctx.Vote.HasActive) {
            return { ok: true, value: null };
        }

        const { optionId } = (payload ?? {}) as { optionId?: string };
        if (typeof optionId !== "string" || optionId.length === 0) {
            return { ok: false, status: 400, error: "Invalid payload" };
        }

        if (!ctx.Vote.Vote(player.Identity.playerPublicId, optionId)) {
            return { ok: false, status: 409, error: "Could not record vote" };
        }

        return { ok: true, value: null };
    };
}

export function resolvePlayerAction(ctx: IGameRoomContext): ActionHandler {
    return async (playerId, payload) => {

        if (ctx.Resolver.IsBusy) {
            return { ok: false, status: 403, error: "Dungeon Master is not idle" };
        }
        if (ctx.Encounter.Active) {
            return { ok: false, status: 409, error: "During an encounter, act through the battle commands — the Dungeon Master cannot be called upon." };
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

export function combatSelectAction(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }
        if (!ctx.Encounter.Active) {
            return { ok: false, status: 409, error: "No encounter is active" };
        }

        const raw = (payload ?? {}) as { type?: string; abilityId?: string };
        const action: CombatAction | null = parseCombatAction(raw);
        if (!action) {
            return { ok: false, status: 400, error: "Invalid combat action" };
        }

        if (!ctx.Encounter.SubmitAction(player, action)) {
            return { ok: false, status: 400, error: "Not your turn, or invalid action" };
        }

        ctx.Broadcaster.RoomUpdate();
        return { ok: true, value: null };
    };
}

export function combatSelectTarget(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }
        if (!ctx.Encounter.Active) {
            return { ok: false, status: 409, error: "No encounter is active" };
        }

        const target = parseCombatTarget(payload);
        if (!target) {
            return { ok: false, status: 400, error: "Invalid target" };
        }

        if (!ctx.Encounter.SubmitTarget(player, target)) {
            return { ok: false, status: 400, error: "Not your turn, or invalid target" };
        }

        ctx.Broadcaster.RoomUpdate();
        return { ok: true, value: null };
    };
}

function parseCombatAction(raw: { type?: string; abilityId?: string }): CombatAction | null {
    if (raw.type === "attack") {
        return { type: "attack" };
    }
    if (raw.type === "defend") {
        return { type: "defend" };
    }
    if (raw.type === "revive") {
        return { type: "revive" };
    }
    if (raw.type === "ability" && typeof raw.abilityId === "string" && raw.abilityId.length > 0) {
        return { type: "ability", abilityId: raw.abilityId };
    }
    return null;
}

function parseCombatTarget(payload: unknown): CombatTarget | null {
    const raw = (payload ?? {}) as { kind?: string; id?: string };
    if (raw.kind === "self") {
        return { kind: "self" };
    }
    if ((raw.kind === "enemy" || raw.kind === "ally") && typeof raw.id === "string" && raw.id.length > 0) {
        return { kind: raw.kind, id: raw.id } as CombatTarget;
    }
    return null;
}

export function buyItem(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }
        const dead = requireAlive(player);
        if (dead) return dead;

        const roomType = ctx.Map.CurrentRoom?.type;
        if (roomType !== ERoomType.GRACE) {
            return { ok: false, status: 400, error: "Merchant only available in grace rooms" };
        }

        const { itemId } = (payload ?? {}) as { itemId?: string };
        if (typeof itemId !== "string") {
            return { ok: false, status: 400, error: "Invalid payload" };
        }

        const item = removeMerchantItem(
            ctx.Identity.Config.seed,
            ctx.Map.CurrentRoomIndex,
            itemId,
        );
        if (!item) {
            return { ok: false, status: 404, error: "Item not in stock" };
        }

        if (player.Inventory.Gold < item.buyPrice) {
            return { ok: false, status: 400, error: "Not enough gold" };
        }

        player.Inventory.removeGold(item.buyPrice);
        player.Inventory.addItem(item);

        ctx.Broadcaster.RoomUpdate();
        return { ok: true, value: { gold: player.Inventory.Gold } };
    };
}

export function sellItem(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }
        const dead = requireAlive(player);
        if (dead) return dead;

        const roomType = ctx.Map.CurrentRoom?.type;
        if (roomType !== ERoomType.GRACE) {
            return { ok: false, status: 400, error: "Merchant only available in grace rooms" };
        }

        const { index } = (payload ?? {}) as { index?: number };
        if (typeof index !== "number" || index < 0) {
            return { ok: false, status: 400, error: "Invalid payload" };
        }

        const inventory = player.Inventory.Inventory;
        if (index >= inventory.length) {
            return { ok: false, status: 400, error: "Invalid inventory index" };
        }

        const [item, qty] = inventory[index]!;
        const sellPrice = Math.floor(item.buyPrice * 0.5) * qty;

        player.Inventory.removeItem(item, qty);
        player.Inventory.addGold(sellPrice);

        ctx.Broadcaster.RoomUpdate();
        return { ok: true, value: { gold: player.Inventory.Gold, sold: sellPrice } };
    };
}

export function dropItem(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }
        const dead = requireAlive(player);
        if (dead) return dead;

        const { index, qty } = (payload ?? {}) as { index?: number; qty?: number };
        if (typeof index !== "number" || index < 0) {
            return { ok: false, status: 400, error: "Invalid payload" };
        }

        const inventory = player.Inventory.Inventory;
        if (index >= inventory.length) {
            return { ok: false, status: 400, error: "Invalid inventory index" };
        }

        const [item, maxQty] = inventory[index]!;
        const dropQty = Math.min(qty ?? maxQty, maxQty);

        player.Inventory.removeItem(item, dropQty);
        ctx.Map.DropItems(Array.from({ length: dropQty }, () => item));
        ctx.Broadcaster.RoomUpdate();
        return { ok: true, value: null };
    };
}

export function pickUpItem(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        const player = ctx.Party.getPlayer(playerId);
        if (!player) {
            return { ok: false, status: 404, error: "Player not found" };
        }
        const dead = requireAlive(player);
        if (dead) return dead;

        const { itemIndex } = (payload ?? {}) as { itemIndex?: number };
        if (typeof itemIndex !== "number" || itemIndex < 0) {
            return { ok: false, status: 400, error: "Invalid payload" };
        }

        const item = ctx.Map.PickupItem(itemIndex);
        if (!item) {
            return { ok: false, status: 404, error: "Item not found on ground" };
        }

        player.Inventory.addItem(item);
        ctx.Broadcaster.RoomUpdate();
        return { ok: true, value: null };
    };
}